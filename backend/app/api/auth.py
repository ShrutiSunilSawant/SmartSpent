import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import (
    UserCreate, UserResponse, Token,
    MessageResponse, ForgotPasswordRequest, ResetPasswordRequest,
    ChangePasswordRequest, UpdateProfileRequest,
)
from app.utils.auth import hash_password, verify_password, create_access_token, get_current_user
from app.utils.config import settings
from app.utils.database import get_db
from app.utils.limiter import limiter
from app.utils.logger import logger

router = APIRouter(prefix="/auth", tags=["Auth"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
RESET_TOKEN_EXPIRES_HOURS = 1


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.token_version)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
    )

    if not user:
        raise invalid_credentials

    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Too many failed attempts. Try again after "
                f"{user.locked_until.replace(tzinfo=timezone.utc).strftime('%H:%M:%S UTC')}."
            ),
        )

    if not verify_password(form_data.password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            user.failed_login_attempts = 0
        db.commit()
        raise invalid_credentials

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    token = create_access_token(user.id, user.token_version)
    return Token(access_token=token)


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("3/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    reset_url = None

    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRES_HOURS)
        db.commit()
        reset_url = f"{settings.app_url}/reset-password?token={token}"

        # Try to send email; log a warning if not configured
        try:
            from app.services.email_service import send_password_reset_email
            send_password_reset_email(user.email, token)
        except Exception as exc:
            logger.warning("Could not send password reset email: {}", exc)

        # In dev mode expose the reset URL in the server log so dev can test without email
        if settings.debug and reset_url:
            logger.info("DEV MODE — password reset URL: {}", reset_url)

    # Always return the same message (prevents user-enumeration)
    msg = "If that email is registered, a password reset link has been sent."
    # Dev-mode hint so the form can show the link directly (never in production)
    if settings.debug and reset_url:
        msg = f"[DEV] Reset link: {reset_url}"

    return MessageResponse(message=msg)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == body.token).first()

    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link.")

    expires = user.reset_token_expires
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link has expired. Please request a new one.")

    user.hashed_password = hash_password(body.password)
    user.token_version = (user.token_version or 0) + 1  # Invalidate all existing sessions
    user.reset_token = None
    user.reset_token_expires = None
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    return MessageResponse(message="Password updated. You can now sign in with your new password.")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password", response_model=Token)
@limiter.limit("5/minute")
def change_password(
    request: Request,
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

    current_user.hashed_password = hash_password(body.new_password)
    current_user.token_version = (current_user.token_version or 0) + 1
    current_user.failed_login_attempts = 0
    current_user.locked_until = None
    db.commit()
    db.refresh(current_user)

    # Issue a fresh token with the new version so the current session stays valid
    new_token = create_access_token(current_user.id, current_user.token_version)
    return Token(access_token=new_token)


@router.patch("/me", response_model=UserResponse)
def update_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.phone_number is not None:
        current_user.phone_number = body.phone_number or None
    db.commit()
    db.refresh(current_user)
    return current_user
