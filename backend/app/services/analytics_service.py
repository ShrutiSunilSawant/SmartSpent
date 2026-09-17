"""
app/services/analytics_service.py
-----------------------------------
Business logic for financial analytics and insights.

Provides:
- Spending summary (total, by category, by month)
- Monthly trends (for line/bar charts)
- Top merchants
- Savings insights
- Anomaly summaries
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from decimal import Decimal

from app.models.expense import Expense
from app.utils.logger import logger


class AnalyticsService:
    """Computes financial analytics and insights from expense data."""

    def get_summary(self, db: Session, user_id: int, months: int = 1) -> Dict[str, Any]:
        """
        Get a spending summary for the last N months.
        Returns: total, by_category, top_merchants, anomaly_count.
        """
        cutoff = datetime.now() - timedelta(days=30 * months)
        expenses = (
            db.query(Expense)
            .filter(Expense.user_id == user_id, Expense.date >= cutoff)
            .all()
        )

        if not expenses:
            return {
                "total": 0.0,
                "count": 0,
                "by_category": {},
                "top_merchants": [],
                "anomaly_count": 0,
                "avg_daily": 0.0,
                "period_days": 30 * months,
            }

        # Total spending — accumulate in Decimal to avoid binary-float rounding drift,
        # then cast to float only at the very end for the JSON response.
        total = sum((e.amount for e in expenses), start=Decimal("0"))

        # Spending by category
        by_category: Dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for e in expenses:
            by_category[e.category] += e.amount

        # Top 5 merchants by total spend
        merchant_totals: Dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for e in expenses:
            if e.merchant:
                merchant_totals[e.merchant] += e.amount

        top_merchants = sorted(
            [{"merchant": k, "total": float(v)} for k, v in merchant_totals.items()],
            key=lambda x: x["total"],
            reverse=True,
        )[:5]

        # Anomaly count
        anomaly_count = sum(1 for e in expenses if e.is_anomaly)

        # Average daily spending
        days = max((datetime.now() - cutoff).days, 1)
        avg_daily = total / days

        return {
            "total": round(float(total), 2),
            "count": len(expenses),
            "by_category": {k: round(float(v), 2) for k, v in by_category.items()},
            "top_merchants": top_merchants,
            "anomaly_count": anomaly_count,
            "avg_daily": round(float(avg_daily), 2),
            "period_days": 30 * months,
        }

    def get_monthly_trends(self, db: Session, user_id: int, months: int = 6) -> List[Dict[str, Any]]:
        """
        Get monthly spending totals for the last N months.
        Used for line/bar charts in the dashboard.

        Returns a list like:
        [{"month": "2024-01", "total": 1234.50, "count": 42}, ...]
        """
        cutoff = datetime.now() - timedelta(days=30 * months)

        # Group by year+month using SQLAlchemy
        results = (
            db.query(
                extract("year", Expense.date).label("year"),
                extract("month", Expense.date).label("month"),
                func.sum(Expense.amount).label("total"),
                func.count(Expense.id).label("count"),
            )
            .filter(Expense.user_id == user_id, Expense.date >= cutoff)
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )

        return [
            {
                "month": f"{int(r.year)}-{int(r.month):02d}",
                "total": round(float(r.total), 2),
                "count": r.count,
            }
            for r in results
        ]

    def get_category_breakdown(self, db: Session, user_id: int, months: int = 1) -> List[Dict[str, Any]]:
        """
        Get spending by category for pie/donut charts.
        Returns: [{"category": "Food", "total": 450.0, "percentage": 32.5}, ...]
        """
        cutoff = datetime.now() - timedelta(days=30 * months)

        results = (
            db.query(
                Expense.category,
                func.sum(Expense.amount).label("total"),
                func.count(Expense.id).label("count"),
            )
            .filter(Expense.user_id == user_id, Expense.date >= cutoff)
            .group_by(Expense.category)
            .order_by(func.sum(Expense.amount).desc())
            .all()
        )

        if not results:
            return []

        total_all = float(sum(r.total for r in results))

        return [
            {
                "category": r.category,
                "total": round(float(r.total), 2),
                "count": r.count,
                "percentage": round((float(r.total) / total_all) * 100, 1) if total_all else 0.0,
            }
            for r in results
        ]

    def get_anomalies(self, db: Session, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get expenses flagged as anomalies.
        These are unusual spending events detected by IsolationForest.
        """
        anomalies = (
            db.query(Expense)
            .filter(Expense.user_id == user_id, Expense.is_anomaly == True)  # noqa: E712
            .order_by(Expense.date.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "id": e.id,
                "amount": float(e.amount),
                "category": e.category,
                "merchant": e.merchant,
                "date": e.date.isoformat(),
                "description": e.description,
            }
            for e in anomalies
        ]

    def get_savings_insights(self, db: Session, user_id: int) -> List[str]:
        """
        Generate plain-text savings tips based on spending patterns.
        This is rule-based (not AI) — fast and always available.
        The AI assistant provides deeper analysis.
        """
        insights = []
        summary = self.get_summary(db, user_id=user_id, months=1)

        by_category = summary.get("by_category", {})
        total = summary.get("total", 0)

        if not total:
            return ["Start tracking expenses to get personalized insights!"]

        # Tip 1: Food spending
        food_spend = by_category.get("Food", 0)
        if food_spend > total * 0.4:
            insights.append(
                f"🍔 Food is {food_spend/total*100:.0f}% of your budget. "
                "Consider meal prepping to reduce restaurant spending."
            )

        # Tip 2: Entertainment
        entertainment = by_category.get("Entertainment", 0)
        if entertainment > 100:
            insights.append(
                f"🎬 You spent ${entertainment:.0f} on entertainment. "
                "Review subscriptions — you may be paying for services you don't use."
            )

        # Tip 3: Transport
        transport = by_category.get("Transport", 0)
        if transport > 200:
            insights.append(
                f"🚗 Transport costs: ${transport:.0f}/month. "
                "Consider carpooling or public transit alternatives."
            )

        # Tip 4: High daily average
        avg_daily = summary.get("avg_daily", 0)
        if avg_daily > 100:
            insights.append(
                f"📊 You're spending ${avg_daily:.0f}/day on average. "
                "Setting a daily budget target could help."
            )

        # Tip 5: Anomalies
        anomaly_count = summary.get("anomaly_count", 0)
        if anomaly_count > 0:
            insights.append(
                f"⚠️ {anomaly_count} unusual expense(s) detected this period. "
                "Check the anomalies section for details."
            )

        return insights or ["Great job! Your spending looks healthy this month. 🎉"]


# Singleton
analytics_service = AnalyticsService()
