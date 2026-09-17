"""
app/api/expenses.py
--------------------
FastAPI router for expense CRUD operations.

Routes:
- GET    /api/expenses         List expenses (with filters)
- POST   /api/expenses         Create expense
- GET    /api/expenses/{id}    Get single expense
- PUT    /api/expenses/{id}    Update expense
- DELETE /api/expenses/{id}    Delete expense

Every route requires a logged-in user and only ever touches that user's
own expenses (see app.services.expense_service, which filters on user_id).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.models.user import User
from app.utils.auth import get_current_user
from app.utils.database import get_db
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseList
)
from app.services.expense_service import expense_service

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("/", response_model=ExpenseList)
def list_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=200, description="Max items to return"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    merchant: Optional[str] = Query(default=None, description="Filter by merchant"),
    search: Optional[str] = Query(default=None, description="Search merchant/description"),
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    min_amount: Optional[float] = Query(default=None, ge=0),
    max_amount: Optional[float] = Query(default=None, ge=0),
):
    """
    List expenses with optional filtering and pagination.

    Example: GET /api/expenses?category=Food&limit=10
    """
    expenses = expense_service.get_expenses(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        category=category,
        merchant=merchant,
        search=search,
        start_date=start_date,
        end_date=end_date,
        min_amount=min_amount,
        max_amount=max_amount,
    )
    total = expense_service.get_total_count(db, user_id=current_user.id)

    return ExpenseList(
        expenses=expenses,
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
    )


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new expense.
    ML automatically predicts category if not specified.
    Anomaly detection runs after save.
    """
    expense = expense_service.create_expense(
        db=db, user_id=current_user.id, expense_data=expense_data
    )
    return expense


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single expense by ID."""
    expense = expense_service.get_expense_by_id(
        db=db, user_id=current_user.id, expense_id=expense_id
    )
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with id={expense_id} not found",
        )
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    update_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an expense. Only provided fields are changed."""
    expense = expense_service.update_expense(
        db=db, user_id=current_user.id, expense_id=expense_id, update_data=update_data
    )
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with id={expense_id} not found",
        )
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an expense by ID."""
    success = expense_service.delete_expense(db=db, user_id=current_user.id, expense_id=expense_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with id={expense_id} not found",
        )
    # 204 No Content — no response body
