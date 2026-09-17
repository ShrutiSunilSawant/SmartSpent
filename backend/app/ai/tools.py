"""
app/ai/tools.py
----------------
Tool functions that the AI agent can call during reasoning.

In LangGraph/LangChain, "tools" are functions the AI can dynamically choose to call.
The AI reads tool descriptions and decides which to use based on the user's question.

Design:
- Each tool is a standalone function with a clear docstring
- Tools are wrapped with @tool decorator from LangChain
- Tools use the expense and analytics services internally
- Tools are injected with a database session when the agent runs

Why tools?
- Allows the AI to fetch real data instead of hallucinating
- Makes the agent's reasoning transparent (we see which tools it called)
- Modular: easy to add new tools without changing agent logic
"""

from langchain.tools import tool
from typing import Optional, List
import json


def create_financial_tools(db_session, user_id, expense_svc, analytics_svc, forecaster):
    """
    Factory function that creates tools with database access injected.

    Why a factory?
    - Tools need DB access, but DB sessions are per-request
    - We can't inject at module level (DB not initialized yet)
    - Factory creates fresh tools for each agent invocation

    Args:
        db_session: SQLAlchemy session
        user_id: The logged-in user — every tool call is scoped to their data
        expense_svc: ExpenseService instance
        analytics_svc: AnalyticsService instance
        forecaster: ExpenseForecaster instance
    """

    @tool
    def get_expenses(
        category: Optional[str] = None,
        limit: int = 20,
        search: Optional[str] = None,
    ) -> str:
        """
        Retrieve expense records from the database.
        Use this to look up specific expenses or browse recent spending.
        
        Args:
            category: Filter by category (e.g., "Food", "Transport")
            limit: Maximum number of expenses to return (default 20)
            search: Search term to filter by merchant or description
            
        Returns:
            JSON string with list of expenses
        """
        expenses = expense_svc.get_expenses(
            db_session,
            user_id=user_id,
            limit=limit,
            category=category,
            search=search,
        )
        result = [
            {
                "id": e.id,
                "amount": float(e.amount),
                "category": e.category,
                "merchant": e.merchant or "Unknown",
                "date": e.date.strftime("%Y-%m-%d") if e.date else "Unknown",
                "is_anomaly": e.is_anomaly,
            }
            for e in expenses
        ]
        return json.dumps(result, indent=2)

    @tool
    def analyze_spending(months: int = 1) -> str:
        """
        Analyze spending patterns and get a comprehensive summary.
        Use this when asked about overall spending, budget, or financial health.
        
        Args:
            months: How many months of data to include (default: 1)
            
        Returns:
            JSON with total spending, category breakdown, top merchants, etc.
        """
        summary = analytics_svc.get_summary(db_session, user_id=user_id, months=months)
        return json.dumps(summary, indent=2)

    @tool
    def get_top_categories(months: int = 1) -> str:
        """
        Get spending breakdown by category with percentages.
        Use this when asked where the user spends the most money.
        
        Args:
            months: How many months of history to include
            
        Returns:
            JSON list of categories sorted by spending amount
        """
        breakdown = analytics_svc.get_category_breakdown(db_session, user_id=user_id, months=months)
        return json.dumps(breakdown, indent=2)

    @tool
    def detect_anomalies() -> str:
        """
        Find unusual or suspicious expenses.
        Use this when asked about strange charges, overspending alerts, or unexpected expenses.
        
        Returns:
            JSON list of anomalous expenses with details
        """
        anomalies = analytics_svc.get_anomalies(db_session, user_id=user_id)
        if not anomalies:
            return json.dumps({"message": "No anomalies detected in recent expenses."})
        return json.dumps(anomalies, indent=2)

    @tool
    def forecast_spending(days_ahead: int = 30) -> str:
        """
        Forecast future expenses based on historical patterns.
        Use this when asked about future spending, budget planning, or affordability.
        
        Args:
            days_ahead: How many days to forecast (default: 30)
            
        Returns:
            JSON with predicted daily spending and totals
        """
        expenses = expense_svc.get_expenses_as_dicts(db_session, user_id=user_id, limit=365)
        if not expenses:
            return json.dumps({"message": "Not enough expense data to generate a forecast."})

        forecast = forecaster.forecast(expenses, days_ahead=days_ahead)

        # Return simplified version for the AI (full data goes to charts)
        return json.dumps({
            "method": forecast["method"],
            "days_ahead": days_ahead,
            "total_predicted": forecast["summary"]["total_predicted"],
            "avg_daily_predicted": forecast["summary"]["avg_daily"],
            "confidence": forecast["summary"]["confidence"],
        }, indent=2)

    @tool
    def generate_budget_recommendations() -> str:
        """
        Generate personalized budget recommendations based on spending patterns.
        Use this when asked for money-saving tips, budget advice, or how to save more.
        
        Returns:
            JSON with specific budget recommendations and savings opportunities
        """
        summary = analytics_svc.get_summary(db_session, user_id=user_id, months=1)
        insights = analytics_svc.get_savings_insights(db_session, user_id=user_id)
        breakdown = analytics_svc.get_category_breakdown(db_session, user_id=user_id, months=1)

        # Find highest spending category
        top_category = breakdown[0] if breakdown else {}

        return json.dumps({
            "total_monthly": summary.get("total", 0),
            "insights": insights,
            "top_spending_category": top_category,
            "categories": breakdown[:5],
            "anomaly_count": summary.get("anomaly_count", 0),
        }, indent=2)

    @tool
    def get_monthly_trends(months: int = 6) -> str:
        """
        Get month-over-month spending trends.
        Use this when asked if spending is increasing or decreasing over time.
        
        Args:
            months: How many months of trend data to return
            
        Returns:
            JSON list of monthly totals
        """
        trends = analytics_svc.get_monthly_trends(db_session, user_id=user_id, months=months)
        return json.dumps(trends, indent=2)

    # Return all tools as a list
    return [
        get_expenses,
        analyze_spending,
        get_top_categories,
        detect_anomalies,
        forecast_spending,
        generate_budget_recommendations,
        get_monthly_trends,
    ]
