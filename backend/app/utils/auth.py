"""
app/utils/auth.py
-------------------
Password hashing + JWT-based authentication.

Each user has their own account (email + password). On login they get a
signed JWT; the frontend sends it as `Authorization: Bearer <token>` on
every request. get_current_user() decodes that token and loads the User
row, so route handlers always know exactly whose data they're touching.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.config import settings
from app.utils.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Using bcrypt directly rather than via passlib: passlib's bcrypt backend
# self-test crashes against bcrypt>=4.1 (a known passlib/bcrypt version
# incompatibility), and bcrypt itself is the simpler, free/open-source dependency.
_BCRYPT_MAX_BYTES = 72  # bcrypt silently ignores input past this length


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:_BCRYPT_MAX_BYTES], bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8")[:_BCRYPT_MAX_BYTES], hashed_password.encode("utf-8")
    )


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency — decodes the bearer token and loads the User row."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = int(payload.get("sub"))
    except (jwt.PyJWTError, TypeError, ValueError):
        raise credentials_error

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_error

    return user
