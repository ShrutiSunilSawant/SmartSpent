"""
app/schemas/expense.py
-----------------------
Pydantic schemas for request/response validation.

Why separate schemas from models?
- SQLAlchemy models define the DATABASE structure
- Pydantic schemas define the API contract (what the frontend sends/receives)
- Keeps concerns separate and enables fine-grained validation

Schemas:
- ExpenseCreate: what the frontend sends when creating an expense
- ExpenseUpdate: what the frontend sends when editing (all fields optional)
- ExpenseResponse: what the API returns (includes DB-generated fields like id)
- ExpenseList: wrapper for returning multiple expenses
"""

from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List


class ExpenseBase(BaseModel):
    """Shared fields between Create and Update schemas."""

    amount: float = Field(
        ...,
        gt=0,
        description="Expense amount — must be positive",
        examples=[42.50],
    )
    category: str = Field(
        default="Uncategorized",
        max_length=100,
        examples=["Food", "Transport", "Entertainment"],
    )
    merchant: Optional[str] = Field(
        default=None,
        max_length=200,
        examples=["Starbucks", "Uber", "Netflix"],
    )
    description: Optional[str] = Field(
        default=None,
        max_length=500,
        examples=["Morning coffee", "Ride to airport"],
    )
    currency: str = Field(
        default="USD",
        max_length=10,
        examples=["USD", "EUR", "GBP"],
    )
    date: datetime = Field(
        ...,
        description="When the expense occurred",
    )

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, v: str) -> str:
        """Ensure currency codes are always uppercase (USD not usd)."""
        return v.upper()

    @field_validator("category")
    @classmethod
    def title_case_category(cls, v: str) -> str:
        """Normalize categories to title case: 'food' → 'Food'."""
        return v.strip().title()


class ExpenseCreate(ExpenseBase):
    """
    Schema for POST /api/expenses.
    All required fields must be present.
    """
    pass


class ExpenseUpdate(BaseModel):
    """
    Schema for PUT /api/expenses/{id}.
    All fields are optional — partial updates allowed.
    """
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = Field(default=None, max_length=100)
    merchant: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=500)
    currency: Optional[str] = Field(default=None, max_length=10)
    date: Optional[datetime] = None


class ExpenseResponse(ExpenseBase):
    """
    Schema for API responses — includes DB-generated fields.
    """
    id: int
    is_anomaly: bool
    predicted_category: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}  # Allows SQLAlchemy model → Pydantic


class ExpenseList(BaseModel):
    """Wrapper for paginated expense lists."""
    expenses: List[ExpenseResponse]
    total: int
    page: int = 1
    page_size: int = 50


class OCRResult(BaseModel):
    """Result from OCR receipt scanning — returned before user confirms."""
    amount: Optional[float] = None
    merchant: Optional[str] = None
    date: Optional[datetime] = None
    predicted_category: Optional[str] = None
    raw_text: str = ""
    confidence: float = 0.0  # 0-100
    error: Optional[str] = None  # Quality warning or extraction failure message


class ChatMessage(BaseModel):
    """A single message in the AI chat conversation."""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=5000)


class ChatRequest(BaseModel):
    """Request body for POST /api/ai/chat."""
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Response from the AI assistant."""
    response: str
    sources: List[str] = Field(default_factory=list)  # What tools/data were used
    thinking_steps: List[str] = Field(default_factory=list)  # Agent reasoning log
