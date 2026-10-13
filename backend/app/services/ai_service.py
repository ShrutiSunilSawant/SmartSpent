"""
app/services/ai_service.py
---------------------------
AI assistant using Google Gemini (free tier) with SmartFinancialAgent fallback.

Flow:
1. Fetch the user's financial data via existing services
2. Send data + question to Gemini as context
3. If Gemini is unavailable or rate-limited → fall back to SmartFinancialAgent
"""

from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json

from app.ai.smart_agent import SmartFinancialAgent
from app.ai.memory import financial_memory
from app.services.expense_service import expense_service
from app.services.analytics_service import analytics_service
from app.ml.forecasting import expense_forecaster
from app.utils.config import settings
from app.utils.logger import logger


def _build_context(db: Session, user_id: int) -> str:
    """Build a financial data snapshot to send to Gemini as context."""
    try:
        summary = analytics_service.get_summary(db, user_id=user_id, months=1)
        breakdown = analytics_service.get_category_breakdown(db, user_id=user_id, months=1)
        anomalies = analytics_service.get_anomalies(db, user_id=user_id)
        recent = expense_service.get_expenses(db, user_id=user_id, limit=10)

        recent_list = [
            {"merchant": e.merchant or "Unknown", "amount": float(e.amount),
             "category": e.category, "date": e.date.isoformat() if e.date else ""}
            for e in recent
        ]

        context = {
            "monthly_summary": summary,
            "category_breakdown": breakdown,
            "anomalies": anomalies,
            "recent_expenses": recent_list,
        }
        return json.dumps(context, indent=2, default=str)
    except Exception as e:
        logger.warning("Could not build financial context: {}", str(e))
        return "{}"


class AIService:

    def _gemini_chat(self, context: str, user_message: str,
                     conversation_history: List[Dict[str, str]]) -> str:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

        llm = ChatGoogleGenerativeAI(
            model="gemini-3.0-flash",
            google_api_key=settings.gemini_api_key,
            temperature=0.7,
        )

        system = (
            "You are SmartSpent, a personal finance assistant. "
            "Answer the user's question using ONLY the financial data provided below. "
            "Be concise, friendly, and specific — use actual numbers from the data. "
            "If the question is unrelated to personal finance or the data doesn't support an answer, "
            "say: \"I can only answer questions about your personal finance data.\"\n\n"
            f"USER'S FINANCIAL DATA:\n{context}"
        )

        messages = [SystemMessage(content=system)]
        for turn in (conversation_history or [])[-6:]:
            if turn.get("role") == "user":
                messages.append(HumanMessage(content=turn["content"]))
            elif turn.get("role") == "assistant":
                messages.append(AIMessage(content=turn["content"]))
        messages.append(HumanMessage(content=user_message))

        result = llm.invoke(messages)
        return result.content.strip()

    def chat(
        self,
        db: Session,
        user_id: int,
        user_message: str,
        conversation_history: List[Dict[str, str]] = None,
    ) -> Dict[str, Any]:

        # ── Try Gemini first ───────────────────────────────────────────────────
        if settings.gemini_api_key:
            try:
                context = _build_context(db, user_id)
                logger.info("Gemini processing query: {}", user_message[:100])
                response = self._gemini_chat(context, user_message, conversation_history)

                try:
                    financial_memory.save_conversation(
                        user_message=user_message,
                        assistant_response=response,
                        metadata={"source": "gemini"},
                    )
                except Exception:
                    pass

                return {
                    "response": response,
                    "thinking_steps": ["Analyzed your financial data", "Generated response with Gemini"],
                    "tools_used": ["gemini-2.0-flash"],
                }

            except Exception as e:
                err = str(e).lower()
                # Rate limit or quota → fall through to smart agent
                if any(k in err for k in ["quota", "rate", "429", "limit", "resource"]):
                    logger.warning("Gemini rate limited — falling back to SmartAgent")
                else:
                    logger.error("Gemini error: {}", str(e))

        # ── Fallback: SmartFinancialAgent ──────────────────────────────────────
        try:
            logger.info("SmartAgent processing query: {}", user_message[:100])
            agent = SmartFinancialAgent(
                db=db,
                user_id=user_id,
                expense_svc=expense_service,
                analytics_svc=analytics_service,
                forecaster=expense_forecaster,
            )
            result = agent.answer(user_message)

            try:
                financial_memory.save_conversation(
                    user_message=user_message,
                    assistant_response=result["response"],
                    metadata={"source": "smart_agent"},
                )
            except Exception:
                pass

            return result

        except Exception as e:
            logger.error("SmartAgent error: {}", str(e))
            return {
                "response": "I ran into an issue analyzing your finances. Make sure you have some expenses logged and try again.",
                "thinking_steps": [f"Error: {str(e)}"],
                "tools_used": [],
            }


ai_service = AIService()
