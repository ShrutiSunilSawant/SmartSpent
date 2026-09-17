"""
app/models/expense.py
----------------------
SQLAlchemy database model for expenses.

This defines the 'expenses' table schema.
SQLAlchemy maps this Python class to a database table automatically.

Fields:
- id: auto-incremented primary key
- amount: decimal amount in the expense's currency
- category: e.g., "Food", "Transport", "Entertainment"
- merchant: store/company name
- description: optional note
- currency: ISO currency code (default USD)
- date: when the expense occurred
- is_anomaly: flagged by ML anomaly detection
- created_at: when the record was added to our DB
"""

from sqlalchemy import Column, Integer, Numeric, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.utils.database import Base


class Expense(Base):
    """
    Represents a single financial expense.
    Maps to the 'expenses' table in SQLite.
    """

    __tablename__ = "expenses"

    # ─── Primary Key ─────────────────────────────────────────────────────────
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # ─── Ownership ───────────────────────────────────────────────────────────
    # Every query must filter on this so users only ever see their own data.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # ─── Core Fields ─────────────────────────────────────────────────────────
    amount = Column(Numeric(12, 2), nullable=False, comment="Expense amount")
    category = Column(
        String(100),
        nullable=False,
        default="Uncategorized",
        comment="Spending category: Food, Transport, etc.",
    )
    merchant = Column(
        String(200),
        nullable=True,
        comment="Merchant or store name",
    )
    description = Column(
        Text,
        nullable=True,
        comment="Optional note or description",
    )
    currency = Column(
        String(10),
        nullable=False,
        default="USD",
        comment="ISO currency code",
    )
    date = Column(
        DateTime,
        nullable=False,
        comment="When the expense occurred",
    )

    # ─── ML / AI Fields ──────────────────────────────────────────────────────
    is_anomaly = Column(
        Boolean,
        default=False,
        comment="True if IsolationForest flagged this as unusual",
    )
    predicted_category = Column(
        String(100),
        nullable=True,
        comment="ML-predicted category (may differ from user-set category)",
    )

    # ─── Metadata ────────────────────────────────────────────────────────────
    created_at = Column(
        DateTime,
        server_default=func.now(),
        comment="When this record was inserted into the DB",
    )
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Last time this record was modified",
    )

    def __repr__(self) -> str:
        return f"<Expense id={self.id} amount={self.amount} category={self.category}>"
