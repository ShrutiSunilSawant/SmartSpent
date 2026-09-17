"""
app/services/expense_service.py
--------------------------------
Business logic for expense CRUD operations.

Why a service layer?
- Routes (api/expenses.py) handle HTTP: parsing requests, returning responses
- Services handle BUSINESS LOGIC: DB queries, calculations, ML calls
- This separation makes it easy to test, extend, and maintain

This service:
- Creates, reads, updates, deletes expenses
- Applies ML category prediction on creation
- Runs anomaly detection after each save
- Provides search/filter functionality
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal

from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.ml.category_model import CategoryPredictor
from app.ml.anomaly_detection import AnomalyDetector
from app.utils.logger import logger

# Initialize ML models (loaded once, reused across requests)
category_predictor = CategoryPredictor()
anomaly_detector = AnomalyDetector()


class ExpenseService:
    """Handles all expense-related database operations and ML enrichment."""

    def create_expense(self, db: Session, user_id: int, expense_data: ExpenseCreate) -> Expense:
        """
        Create a new expense.
        1. Predict category using ML (if not provided)
        2. Save to database
        3. Run anomaly detection on recent expenses
        """
        # Step 1: Predict category using TF-IDF + Naive Bayes
        predicted_category = category_predictor.predict(
            merchant=expense_data.merchant or "",
            description=expense_data.description or "",
        )

        # Use ML prediction if user didn't specify a category
        final_category = (
            expense_data.category
            if expense_data.category != "Uncategorized"
            else predicted_category
        )

        # Step 2: Create DB record
        # Convert via str() to avoid binary-float rounding artifacts (e.g. 19.999999999998)
        db_expense = Expense(
            user_id=user_id,
            amount=Decimal(str(expense_data.amount)),
            category=final_category,
            merchant=expense_data.merchant,
            description=expense_data.description,
            currency=expense_data.currency,
            date=expense_data.date,
            predicted_category=predicted_category,
            is_anomaly=False,  # Will be updated below
        )

        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)

        # Step 3: Run anomaly detection on this new expense
        # We check if this expense looks unusual compared to historical data
        try:
            recent_expenses = self.get_expenses(db, user_id=user_id, limit=200)
            is_anomaly = anomaly_detector.is_anomaly(
                new_expense=db_expense,
                historical_expenses=recent_expenses,
            )
            if is_anomaly:
                db_expense.is_anomaly = True
                db.commit()
                logger.warning(
                    "Anomaly detected: ${} on {} (category: {})",
                    expense_data.amount,
                    expense_data.merchant,
                    final_category,
                )
        except Exception:
            # Don't fail the whole request if anomaly detection errors —
            # this is a best-effort enrichment step, not core to saving the expense.
            logger.exception("Anomaly detection failed for expense id={}", db_expense.id)

        logger.info("Created expense: id={}", db_expense.id)
        return db_expense

    def get_expenses(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        category: Optional[str] = None,
        merchant: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        search: Optional[str] = None,
    ) -> List[Expense]:
        """
        Get expenses with optional filtering.
        Supports: category, merchant, date range, amount range, text search.
        """
        query = db.query(Expense).filter(Expense.user_id == user_id)

        # Apply filters if provided
        if category:
            query = query.filter(Expense.category.ilike(f"%{category}%"))
        if merchant:
            query = query.filter(Expense.merchant.ilike(f"%{merchant}%"))
        if start_date:
            query = query.filter(Expense.date >= start_date)
        if end_date:
            query = query.filter(Expense.date <= end_date)
        if min_amount is not None:
            query = query.filter(Expense.amount >= min_amount)
        if max_amount is not None:
            query = query.filter(Expense.amount <= max_amount)
        if search:
            # Search across merchant, description, and category
            search_pattern = f"%{search}%"
            query = query.filter(
                (Expense.merchant.ilike(search_pattern))
                | (Expense.description.ilike(search_pattern))
                | (Expense.category.ilike(search_pattern))
            )

        return (
            query.order_by(Expense.date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_expense_by_id(self, db: Session, user_id: int, expense_id: int) -> Optional[Expense]:
        """Get a single expense by its ID — scoped to the owning user. Returns None if not found."""
        return (
            db.query(Expense)
            .filter(Expense.id == expense_id, Expense.user_id == user_id)
            .first()
        )

    def update_expense(
        self, db: Session, user_id: int, expense_id: int, update_data: ExpenseUpdate
    ) -> Optional[Expense]:
        """
        Update an expense — only provided fields are changed.
        Uses dict(exclude_unset=True) to ignore unprovided fields.
        """
        db_expense = self.get_expense_by_id(db, user_id, expense_id)
        if not db_expense:
            return None

        # Only update fields that were actually provided in the request
        update_fields = update_data.model_dump(exclude_unset=True)
        for field, value in update_fields.items():
            if field == "amount" and value is not None:
                value = Decimal(str(value))
            setattr(db_expense, field, value)

        db.commit()
        db.refresh(db_expense)
        logger.info("Updated expense: id={}", expense_id)
        return db_expense

    def delete_expense(self, db: Session, user_id: int, expense_id: int) -> bool:
        """Delete an expense. Returns True if deleted, False if not found."""
        db_expense = self.get_expense_by_id(db, user_id, expense_id)
        if not db_expense:
            return False

        db.delete(db_expense)
        db.commit()
        logger.info("Deleted expense: id={}", expense_id)
        return True

    def get_total_count(self, db: Session, user_id: int) -> int:
        """Get total number of expenses for this user."""
        return db.query(func.count(Expense.id)).filter(Expense.user_id == user_id).scalar()

    def get_expenses_as_dicts(self, db: Session, user_id: int, limit: int = 500) -> List[dict]:
        """
        Return expenses as plain dictionaries — used by the AI agent
        to avoid passing SQLAlchemy objects outside of the session.
        """
        expenses = self.get_expenses(db, user_id=user_id, limit=limit)
        return [
            {
                "id": e.id,
                "amount": float(e.amount),
                "category": e.category,
                "merchant": e.merchant,
                "description": e.description,
                "currency": e.currency,
                "date": e.date.isoformat() if e.date else None,
                "is_anomaly": e.is_anomaly,
            }
            for e in expenses
        ]


# Singleton instance used across the application
expense_service = ExpenseService()
