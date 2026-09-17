"""
app/utils/database.py
----------------------
SQLAlchemy database setup for SQLite.

Architecture:
- Uses SQLAlchemy's async engine for non-blocking DB operations
- Single SQLite file: financial_copilot.db
- Session factory pattern: each request gets its own session
- Auto-creates tables on startup

Key concepts:
- engine: the DB connection pool
- SessionLocal: factory that creates DB sessions
- Base: declarative base all models inherit from
- get_db: FastAPI dependency that yields a session per request
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from app.utils.config import settings
from app.utils.logger import logger

# ─── Engine ──────────────────────────────────────────────────────────────────
# connect_args={"check_same_thread": False} is required for SQLite
# because FastAPI uses multiple threads and SQLite has threading restrictions.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=settings.debug,  # Print SQL queries in debug mode
)

# ─── Session Factory ──────────────────────────────────────────────────────────
# autocommit=False: we manually commit transactions
# autoflush=False: we manually flush changes
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ─── Base Model ───────────────────────────────────────────────────────────────
# All SQLAlchemy models inherit from this
Base = declarative_base()


def create_tables() -> None:
    """
    Create all database tables defined in models.
    Called once on app startup.
    Import all models before calling this so SQLAlchemy knows about them.
    """
    # Import models here so Base knows about them
    from app.models import expense, user  # noqa: F401

    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready.")


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session per request.

    Usage in a route:
        @router.get("/expenses")
        def list_expenses(db: Session = Depends(get_db)):
            ...

    The 'yield' pattern ensures the session is always closed,
    even if an exception occurs — preventing connection leaks.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error("Database error, rolling back: {}", str(e))
        db.rollback()
        raise
    finally:
        db.close()
