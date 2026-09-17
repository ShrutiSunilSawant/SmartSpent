"""
app/api/auth.py
-----------------
Registration, login, and "who am I" endpoints.

These are intentionally NOT behind the get_current_user dependency that
guards every other /api route — you need to be able to register/login
before you have a token.

Brute-force protections here:
- Rate limiting (slowapi): caps requests per IP regardless of which
  account is being targeted.
- Account lockout: after repeated failed attempts on one account, that
  account specifically is locked for a cooldown period, even from a
  different IP.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.utils.auth import hash_password, verify_password, create_access_token, get_current_user
from app.utils.database import get_db
from app.utils.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Auth"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new account and immediately log them in."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(email=user_data.email, hashed_password=hash_password(user_data.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Login using OAuth2's standard form (username + password).
    We treat 'username' as the email.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    # Same error for "no such user" and "locked" so we don't leak which
    # emails are registered.
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

    # Successful login — reset any prior failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    token = create_access_token(user.id)
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
