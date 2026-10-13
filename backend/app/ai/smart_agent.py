"""
app/ai/smart_agent.py
----------------------
Rule-based financial agent — no external LLM required.

Intent is detected by keyword matching. Data is fetched directly from the
database via existing services. Responses are formatted in Python.

This replaces the Groq/Ollama dependency completely.
"""

import re
import datetime
from typing import Dict, Any, List

from sqlalchemy.orm import Session


class SmartFinancialAgent:

    def __init__(self, db: Session, user_id: int, expense_svc, analytics_svc, forecaster):
        self.db = db
        self.user_id = user_id
        self.expense_svc = expense_svc
        self.analytics_svc = analytics_svc
        self.forecaster = forecaster

    # ── Intent detection ───────────────────────────────────────────────────────

    def _detect_intent(self, message: str) -> str:
        msg = message.lower()

        if any(w in msg for w in ['afford', 'can i buy', 'can i spend', 'enough money', 'room in my budget', 'have enough']):
            return 'AFFORD'
        if any(w in msg for w in ['anomal', 'unusual', 'suspicious', 'weird', 'flagged', 'strange', 'unexpected', 'alert', 'spike']):
            return 'ANOMALIES'
        if any(w in msg for w in ['subscription', 'recurring', 'cancel', 'monthly charge', 'streaming']):
            return 'SUBSCRIPTIONS'
        if any(w in msg for w in ['forecast', 'predict', 'next month', 'future spend', 'will i spend', 'project']):
            return 'FORECAST'
        if any(w in msg for w in ['trend', 'over time', 'month over month', 'going up', 'going down', 'increasing', 'decreasing', 'compare month']):
            return 'TRENDS'
        if any(w in msg for w in ['budget', 'recommend', 'save money', 'saving tip', 'cut back', 'reduce', 'advice', 'tip']):
            return 'BUDGET'
        if any(w in msg for w in ['overspend', 'spending too much', 'where do i spend', 'biggest category', 'most spend', 'top categor', 'breakdown', 'where am i', 'categories']):
            return 'TOP_CATEGORIES'
        if any(w in msg for w in ['show me', 'list', 'recent', 'transactions', 'last expense', 'what did i buy', 'my expense']):
            return 'EXPENSES'
        if any(w in msg for w in ['summary', 'overview', 'total', 'how much', 'spent this month', 'monthly total', 'this month']):
            return 'SUMMARY'
        if any(w in msg for w in ['hi', 'hello', 'hey', 'what can you do', 'help', 'what are you']):
            return 'GREETING'

        return 'UNKNOWN'

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _extract_amount(self, message: str):
        match = re.search(r'\$?([\d,]+(?:\.\d{1,2})?)', message)
        if match:
            return float(match.group(1).replace(',', ''))
        return None

    @staticmethod
    def _fmt(amount) -> str:
        return f"${float(amount):,.2f}"

    def _no_data(self, tools_used):
        return {
            "response": "I don't see any expense data yet. Add some expenses first, then ask me again and I'll give you real insights!",
            "thinking_steps": ["No expense data found"],
            "tools_used": tools_used,
        }

    def _make(self, response: str, steps: List[str], tools: List[str]) -> Dict[str, Any]:
        return {"response": response, "thinking_steps": steps, "tools_used": tools}

    # ── Main entry point ───────────────────────────────────────────────────────

    def answer(self, message: str) -> Dict[str, Any]:
        intent = self._detect_intent(message)
        tools: List[str] = []

        try:
            if intent == 'GREETING':
                return self._make(
                    "Hi! I'm your SmartSpent finance assistant. I can help you:\n"
                    "• Understand where your money goes\n"
                    "• Spot unusual charges\n"
                    "• Forecast future spending\n"
                    "• Give budget tips\n\n"
                    "Try asking: \"Where am I overspending?\" or \"Show me my anomalies\".",
                    ["Detected greeting"], []
                )

            elif intent == 'SUMMARY':
                tools.append('analyze_spending')
                summary = self.analytics_svc.get_summary(self.db, user_id=self.user_id, months=1)
                if summary['count'] == 0:
                    return self._no_data(tools)

                total = summary['total']
                count = summary['count']
                daily_avg = summary['avg_daily']
                anomaly_count = summary['anomaly_count']

                text = (
                    f"This month you've spent {self._fmt(total)} across "
                    f"{count} transaction{'s' if count != 1 else ''}. "
                    f"Your daily average is {self._fmt(daily_avg)}."
                )
                if anomaly_count:
                    text += f" I also flagged {anomaly_count} unusual transaction{'s' if anomaly_count != 1 else ''} — ask me about anomalies to see them."

                return self._make(text, ["Fetched spending summary"], tools)

            elif intent == 'TOP_CATEGORIES':
                tools += ['analyze_spending', 'get_top_categories']
                summary = self.analytics_svc.get_summary(self.db, user_id=self.user_id, months=1)
                breakdown = self.analytics_svc.get_category_breakdown(self.db, user_id=self.user_id, months=1)

                if not breakdown:
                    return self._no_data(tools)

                total = summary['total']
                top = breakdown[0]
                lines = [
                    f"Your biggest spending category this month is **{top['category']}** at "
                    f"{self._fmt(top['total'])} ({top['percentage']:.0f}% of your total {self._fmt(total)})."
                ]
                if len(breakdown) > 1:
                    lines.append("\nFull breakdown:")
                    for cat in breakdown[:6]:
                        lines.append(f"• {cat['category']}: {self._fmt(cat['total'])} ({cat['percentage']:.0f}%)")

                return self._make("\n".join(lines), ["Fetched category breakdown"], tools)

            elif intent == 'ANOMALIES':
                tools.append('detect_anomalies')
                anomalies = self.analytics_svc.get_anomalies(self.db, user_id=self.user_id)

                if not anomalies:
                    return self._make(
                        "Great news — no unusual transactions detected. Everything looks normal.",
                        ["Checked for anomalies"], tools
                    )

                lines = [f"I found {len(anomalies)} unusual transaction{'s' if len(anomalies) != 1 else ''}:\n"]
                for a in anomalies[:5]:
                    date = a['date'][:10] if a.get('date') else ''
                    lines.append(f"• {a.get('merchant', 'Unknown')}: {self._fmt(a['amount'])} on {date}")
                lines.append("\nThese were flagged because they're significantly higher than your usual spending.")

                return self._make("\n".join(lines), ["Detected anomalies"], tools)

            elif intent == 'FORECAST':
                tools.append('forecast_spending')
                expenses = self.expense_svc.get_expenses_as_dicts(self.db, user_id=self.user_id, limit=365)

                if not expenses or len(expenses) < 3:
                    return self._make(
                        "I need at least a few expense records to generate a forecast. Add more expenses and try again!",
                        ["Insufficient data for forecast"], tools
                    )

                forecast = self.forecaster.forecast(expenses, days_ahead=30)
                total_predicted = forecast['summary']['total_predicted']
                avg_daily = forecast['summary']['avg_daily']

                text = (
                    f"Based on your spending history, I predict you'll spend around "
                    f"{self._fmt(total_predicted)} over the next 30 days "
                    f"(about {self._fmt(avg_daily)}/day)."
                )
                return self._make(text, ["Generated 30-day forecast"], tools)

            elif intent == 'AFFORD':
                tools += ['analyze_spending']
                amount = self._extract_amount(message)
                summary = self.analytics_svc.get_summary(self.db, user_id=self.user_id, months=1)
                total_spent = summary['total']
                daily_avg = summary['avg_daily']

                if not amount:
                    return self._make(
                        f"You've spent {self._fmt(total_spent)} this month. "
                        "To check affordability, include the amount — e.g. \"Can I afford a $300 vacation?\"",
                        ["Asked for affordability without amount"], tools
                    )

                today = datetime.date.today()
                days_left = max(30 - today.day, 1)
                projected_remaining = daily_avg * days_left

                if projected_remaining >= amount * 1.5:
                    verdict = f"Yes, {self._fmt(amount)} looks affordable."
                    detail = (
                        f"At your current pace ({self._fmt(daily_avg)}/day), you're projected to spend "
                        f"about {self._fmt(projected_remaining)} more this month — comfortably above the {self._fmt(amount)} you'd need."
                    )
                elif projected_remaining >= amount:
                    verdict = f"It'll be tight, but {self._fmt(amount)} may be manageable."
                    detail = (
                        f"You're projected to spend {self._fmt(projected_remaining)} more this month. "
                        f"Adding {self._fmt(amount)} would stretch things — consider cutting back somewhere else."
                    )
                else:
                    verdict = f"{self._fmt(amount)} may be a stretch right now."
                    detail = (
                        f"Based on your daily average ({self._fmt(daily_avg)}/day), you're projected to need "
                        f"{self._fmt(projected_remaining)} for the rest of the month. "
                        "Consider waiting until next month or finding savings elsewhere."
                    )

                return self._make(f"{verdict}\n\n{detail}", ["Analyzed affordability"], tools)

            elif intent == 'BUDGET':
                tools += ['generate_budget_recommendations', 'get_top_categories']
                insights = self.analytics_svc.get_savings_insights(self.db, user_id=self.user_id)
                summary = self.analytics_svc.get_summary(self.db, user_id=self.user_id, months=1)

                if summary['count'] == 0:
                    return self._no_data(tools)

                lines = [f"Here are your budget insights for this month (total: {self._fmt(summary['total'])}):\n"]
                for tip in insights[:4]:
                    lines.append(f"• {tip}")

                return self._make("\n".join(lines), ["Generated budget recommendations"], tools)

            elif intent == 'SUBSCRIPTIONS':
                tools.append('get_expenses')
                expenses = self.expense_svc.get_expenses(self.db, user_id=self.user_id, limit=100)

                keywords = ['netflix', 'spotify', 'amazon', 'apple', 'google', 'hulu', 'disney',
                            'youtube', 'subscription', 'monthly', 'premium', 'plus', 'membership']
                found = [e for e in expenses if any(k in (e.merchant or '').lower() for k in keywords)]

                if not found:
                    return self._make(
                        "I didn't find any obvious subscription charges. "
                        "Subscriptions usually appear from Netflix, Spotify, Amazon, Apple, etc.",
                        ["Searched for subscriptions"], tools
                    )

                total_subs = sum(float(e.amount) for e in found)
                lines = [f"I found {len(found)} potential subscription{'s' if len(found) != 1 else ''}:\n"]
                for e in found[:6]:
                    lines.append(f"• {e.merchant or 'Unknown'}: {self._fmt(e.amount)}")
                lines.append(f"\nTotal: {self._fmt(total_subs)}/month")

                return self._make("\n".join(lines), ["Found subscription expenses"], tools)

            elif intent == 'TRENDS':
                tools.append('get_monthly_trends')
                trends = self.analytics_svc.get_monthly_trends(self.db, user_id=self.user_id, months=6)

                if not trends or len(trends) < 2:
                    return self._make(
                        "I need at least 2 months of data to show trends. Keep logging expenses and check back!",
                        ["Insufficient trend data"], tools
                    )

                lines = ["Here's your spending over the past months:\n"]
                for t in trends:
                    lines.append(f"• {t['month']}: {self._fmt(t['total'])} ({t['count']} transactions)")

                latest = trends[-1]['total']
                prev = trends[-2]['total']
                if prev > 0:
                    change = ((latest - prev) / prev) * 100
                    direction = "up" if change > 0 else "down"
                    lines.append(f"\nYour spending is {direction} {abs(change):.0f}% compared to last month.")

                return self._make("\n".join(lines), ["Fetched monthly trends"], tools)

            elif intent == 'EXPENSES':
                tools.append('get_expenses')
                expenses = self.expense_svc.get_expenses(self.db, user_id=self.user_id, limit=5)

                if not expenses:
                    return self._no_data(tools)

                lines = ["Here are your 5 most recent expenses:\n"]
                for e in expenses:
                    date = e.date.strftime("%b %d") if e.date else "Unknown"
                    lines.append(f"• {date} — {e.merchant or 'Unknown'}: {self._fmt(e.amount)} ({e.category})")

                return self._make("\n".join(lines), ["Fetched recent expenses"], tools)

            else:  # UNKNOWN
                return self._make(
                    "I can only answer questions about your personal finance data. Try asking:\n"
                    "• \"Where am I overspending?\"\n"
                    "• \"Show me unusual transactions\"\n"
                    "• \"Can I afford a $200 purchase?\"\n"
                    "• \"What's my spending forecast?\"\n"
                    "• \"Give me budget tips\"",
                    ["Could not determine intent"], []
                )

        except Exception as e:
            return self._make(
                "I ran into an issue analyzing your data. Make sure you have some expenses logged and try again.",
                [f"Error: {str(e)}"], tools
            )
