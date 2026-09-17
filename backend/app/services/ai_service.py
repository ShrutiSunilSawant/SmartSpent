"""
app/services/ai_service.py
---------------------------
Orchestrates the AI financial assistant.

This service:
1. Initializes the Ollama LLM
2. Creates the tool functions with DB access
3. Builds the LangGraph workflow
4. Runs the agent and returns responses
5. Saves conversation to ChromaDB memory

Architecture note:
This is the "entry point" for all AI functionality.
The API route calls this service, which handles all the complexity.
"""

from langchain_community.llms import Ollama
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.ai.tools import create_financial_tools
from app.ai.graph import create_financial_agent_graph, FinancialAgentState
from app.ai.memory import financial_memory
from app.services.expense_service import expense_service
from app.services.analytics_service import analytics_service
from app.ml.forecasting import expense_forecaster
from app.utils.config import settings
from app.utils.logger import logger


class AIService:
    """Manages the AI financial assistant lifecycle."""

    def __init__(self):
        """Initialize the Ollama LLM connection."""
        try:
            self.llm = Ollama(
                base_url=settings.ollama_base_url,
                model=settings.ollama_model,
                temperature=0.7,  # Some creativity in responses
                timeout=300,      # 5 minutes — phi3 on CPU can be slow
            )
            logger.info("Ollama LLM initialized: model={}", settings.ollama_model)
        except Exception as e:
            logger.error("Failed to initialize Ollama: {}", str(e))
            self.llm = None

    def chat(
        self,
        db: Session,
        user_id: int,
        user_message: str,
        conversation_history: List[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Process a user message through the full AI agent workflow.

        Args:
            db: Database session (used by tools)
            user_id: The logged-in user — tools only ever see this user's data
            user_message: The user's question
            conversation_history: Previous messages in this conversation

        Returns:
            Dict with response, thinking_steps, and tools used
        """
        if not self.llm:
            return {
                "response": (
                    "⚠️ AI service is unavailable. Please ensure Ollama is running:\n"
                    "1. Download Ollama from https://ollama.com\n"
                    "2. Run: `ollama serve`\n"
                    f"3. Pull the model: `ollama pull {settings.ollama_model}`"
                ),
                "thinking_steps": ["Ollama not available"],
                "tools_used": [],
            }

        try:
            # Create tools with current DB session injected
            tools = create_financial_tools(
                db_session=db,
                user_id=user_id,
                expense_svc=expense_service,
                analytics_svc=analytics_service,
                forecaster=expense_forecaster,
            )

            # Build the LangGraph agent
            agent = create_financial_agent_graph(tools, self.llm)

            # Initialize state
            initial_state: FinancialAgentState = {
                "user_query": user_message,
                "conversation_history": conversation_history or [],
                "spending_summary": None,
                "anomalies": None,
                "forecast": None,
                "memory_context": None,
                "tool_calls_made": [],
                "final_response": None,
                "thinking_steps": [],
                "error": None,
            }

            # Run the graph
            logger.info("Running financial agent for query: {}", user_message[:100])
            final_state = agent.invoke(initial_state)

            response = final_state.get("final_response", "I couldn't process your request.")

            # Clean up model bleed-through (phi3 sometimes leaks prompt text)
            for stop_token in ["#### Instruction", "### Instruction", "#### Response", "Human:", "User:"]:
                if stop_token in response:
                    response = response[:response.index(stop_token)].strip()

            # Strip surrounding quotes if model wrapped response in them
            if response.startswith('"') and response.endswith('"'):
                response = response[1:-1].strip()
            thinking_steps = final_state.get("thinking_steps", [])
            tools_used = final_state.get("tool_calls_made", [])

            # Save to memory for future context
            try:
                financial_memory.save_conversation(
                    user_message=user_message,
                    assistant_response=response,
                    metadata={"tools_used": ",".join(tools_used)},
                )
            except Exception as mem_error:
                logger.warning("Memory save failed (non-critical): {}", str(mem_error))

            return {
                "response": response,
                "thinking_steps": thinking_steps,
                "tools_used": tools_used,
            }

        except Exception as e:
            logger.error("AI service error: {}", str(e))
            return {
                "response": (
                    f"I ran into an issue analyzing your finances. "
                    f"This might be due to insufficient expense data. "
                    f"Try adding some expenses first, then ask me again!"
                    f"\n\nTechnical error: {str(e)}"
                ),
                "thinking_steps": [f"Error: {str(e)}"],
                "tools_used": [],
            }


# Singleton — one LLM connection shared across requests
ai_service = AIService()
