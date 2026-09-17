"""
app/schemas/user.py
---------------------
Pydantic schemas for registration, login, and the current-user response.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime

from app.utils.common_passwords import is_common_password


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def reject_common_password(cls, v: str) -> str:
        if is_common_password(v):
            raise ValueError("This password is too common. Please choose a stronger one.")
        return v


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
