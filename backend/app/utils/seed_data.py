"""
app/utils/seed_data.py
-----------------------
Seeds the database with realistic sample expense data.

Run with:
    cd backend
    python -m app.utils.seed_data

Why seed data?
- Lets you test the app without manually entering expenses
- AI assistant gives better responses with sufficient data
- Anomaly detection needs enough history (10+ records)
- Forecasting needs at least 7 days of data
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session

from app.utils.database import create_tables, SessionLocal
from app.models.expense import Expense
from app.utils.logger import logger


# Realistic expense templates
EXPENSE_TEMPLATES = [
    # Food & Dining
    {"category": "Food", "merchant": "Starbucks", "amount_range": (4, 12), "freq": 10},
    {"category": "Food", "merchant": "Chipotle", "amount_range": (10, 16), "freq": 6},
    {"category": "Food", "merchant": "Whole Foods", "amount_range": (45, 120), "freq": 4},
    {"category": "Food", "merchant": "DoorDash", "amount_range": (20, 55), "freq": 8},
    {"category": "Food", "merchant": "McDonalds", "amount_range": (7, 15), "freq": 4},
    {"category": "Food", "merchant": "Local Restaurant", "amount_range": (25, 80), "freq": 5},
    {"category": "Food", "merchant": "Trader Joe's", "amount_range": (35, 90), "freq": 4},

    # Transport
    {"category": "Transport", "merchant": "Uber", "amount_range": (8, 35), "freq": 8},
    {"category": "Transport", "merchant": "Shell Gas Station", "amount_range": (40, 65), "freq": 4},
    {"category": "Transport", "merchant": "Metro Transit", "amount_range": (2, 5), "freq": 12},
    {"category": "Transport", "merchant": "Parking Garage", "amount_range": (10, 30), "freq": 4},

    # Entertainment
    {"category": "Entertainment", "merchant": "Netflix", "amount_range": (15, 22), "freq": 1},
    {"category": "Entertainment", "merchant": "Spotify", "amount_range": (9, 11), "freq": 1},
    {"category": "Entertainment", "merchant": "AMC Theaters", "amount_range": (12, 25), "freq": 2},
    {"category": "Entertainment", "merchant": "Steam", "amount_range": (5, 60), "freq": 2},

    # Shopping
    {"category": "Shopping", "merchant": "Amazon", "amount_range": (15, 120), "freq": 6},
    {"category": "Shopping", "merchant": "Target", "amount_range": (30, 150), "freq": 4},
    {"category": "Shopping", "merchant": "Best Buy", "amount_range": (50, 400), "freq": 1},

    # Healthcare
    {"category": "Healthcare", "merchant": "CVS Pharmacy", "amount_range": (8, 45), "freq": 3},
    {"category": "Healthcare", "merchant": "Planet Fitness", "amount_range": (10, 25), "freq": 1},

    # Utilities
    {"category": "Utilities", "merchant": "Electric Company", "amount_range": (80, 150), "freq": 1},
    {"category": "Utilities", "merchant": "Internet Provider", "amount_range": (60, 100), "freq": 1},
    {"category": "Utilities", "merchant": "Phone Bill", "amount_range": (50, 90), "freq": 1},
]

# A few anomalous expenses to seed
ANOMALOUS_EXPENSES = [
    {"category": "Food", "merchant": "Fancy Restaurant", "amount": 385.0, "description": "Business dinner"},
    {"category": "Shopping", "merchant": "Apple Store", "amount": 1299.0, "description": "MacBook Pro"},
    {"category": "Transport", "merchant": "Uber Black", "amount": 120.0, "description": "Airport ride"},
]


def generate_expenses(days_back: int = 90) -> list:
    """Generate realistic expense records for the past N days."""
    expenses = []
    now = datetime.now()

    for template in EXPENSE_TEMPLATES:
        # How many times per 90 days based on frequency-per-month
        total_occurrences = int(template["freq"] * days_back / 30)

        for _ in range(total_occurrences):
            # Random date in the past
            days_ago = random.randint(0, days_back)
            expense_date = now - timedelta(
                days=days_ago,
                hours=random.randint(6, 22),
                minutes=random.randint(0, 59),
            )

            amount_min, amount_max = template["amount_range"]
            amount = round(random.uniform(amount_min, amount_max), 2)

            expenses.append({
                "amount": amount,
                "category": template["category"],
                "merchant": template["merchant"],
                "description": None,
                "currency": "USD",
                "date": expense_date,
                "is_anomaly": False,
            })

    # Add anomalous expenses
    for anomaly in ANOMALOUS_EXPENSES:
        days_ago = random.randint(0, 30)
        expenses.append({
            "amount": anomaly["amount"],
            "category": anomaly["category"],
            "merchant": anomaly["merchant"],
            "description": anomaly.get("description"),
            "currency": "USD",
            "date": now - timedelta(days=days_ago),
            "is_anomaly": True,
        })

    # Sort by date
    expenses.sort(key=lambda x: x["date"])
    return expenses


def seed_database():
    """Main seeding function."""
    logger.info("Creating database tables...")
    create_tables()

    db: Session = SessionLocal()

    try:
        # Check if already seeded
        existing_count = db.query(Expense).count()
        if existing_count > 0:
            logger.info("Database already has {} expenses. Skipping seed.", existing_count)
            print(f"\n✅ Database already seeded with {existing_count} expenses.")
            print("   Delete financial_copilot.db to reseed.\n")
            return

        # Generate and insert expenses
        expenses = generate_expenses(days_back=90)
        logger.info("Seeding {} expenses...", len(expenses))

        db.bulk_insert_mappings(Expense, expenses)
        db.commit()

        final_count = db.query(Expense).count()
        logger.info("✅ Seeded {} expenses successfully!", final_count)

        print(f"\n✅ Successfully seeded {final_count} expenses into the database!")
        print("   Start the backend and visit http://localhost:8000/docs\n")

    except Exception as e:
        logger.error("Seeding failed: {}", str(e))
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
