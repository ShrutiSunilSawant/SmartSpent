"""
app/models/user.py
--------------------
SQLAlchemy model for app users.

Each user has their own login and only ever sees their own expenses
(enforced by filtering every query on Expense.user_id).
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.utils.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # ─── Email verification ────────────────────────────────────────────────
    is_verified = Column(Boolean, nullable=False, default=False)
    verification_token = Column(String(255), nullable=True)

    # ─── Password reset ────────────────────────────────────────────────────
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # ─── Profile ───────────────────────────────────────────────────────────
    phone_number = Column(String(30), nullable=True)

    # ─── Token versioning (invalidates all sessions on password change) ───
    token_version = Column(Integer, nullable=False, default=0)

    # ─── Login lockout (brute-force protection) ────────────────────────────
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
