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
    is_verified: bool
    created_at: datetime
    phone_number: str | None = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def reject_common_password(cls, v: str) -> str:
        if is_common_password(v):
            raise ValueError("This password is too common. Please choose a stronger one.")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def reject_common_password(cls, v: str) -> str:
        if is_common_password(v):
            raise ValueError("This password is too common. Please choose a stronger one.")
        return v


class UpdateProfileRequest(BaseModel):
    phone_number: str | None = Field(None, max_length=30)

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return v
        import re
        if not re.match(r"^\+?[\d\s\-().]{7,25}$", v):
            raise ValueError("Invalid phone number format.")
        return v
