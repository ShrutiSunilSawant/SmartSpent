"""
app/ai/graph.py
----------------
LangGraph agent workflow for financial reasoning.

What is LangGraph?
- A framework for building stateful, multi-step AI agent workflows
- Extends LangChain with a graph-based execution model
- Each "node" in the graph is a step in the reasoning process
- State flows between nodes, accumulating information

Our Financial Reasoning Workflow:
┌─────────────┐
│  User Query │
└──────┬──────┘
       ↓
┌─────────────┐
│ Load Context│ (expense summary, memory)
└──────┬──────┘
       ↓
┌─────────────┐
│   Analyze   │ (call tools: get_expenses, analyze_spending)
└──────┬──────┘
       ↓
┌─────────────┐
│ Check Anomaly│ (detect unusual patterns)
└──────┬──────┘
       ↓
┌─────────────┐
│  Forecast   │ (predict future if relevant)
└──────┬──────┘
       ↓
┌─────────────┐
│  Generate   │ (final LLM response)
└──────┬──────┘
       ↓
┌─────────────┐
│  Response   │
└─────────────┘

Why LangGraph vs simple LangChain?
- Explicit state management — we always know what happened
- Conditional routing — can skip steps if not needed
- Easier to debug — can log each step
- Production-ready patterns
"""

from typing import TypedDict, List, Optional, Annotated
from langgraph.graph import StateGraph, END
from langchain_community.llms import Ollama
from langchain_core.messages import HumanMessage, SystemMessage
import json

from app.ai.prompts import FINANCIAL_ASSISTANT_SYSTEM_PROMPT
from app.ai.memory import financial_memory
from app.utils.config import settings
from app.utils.logger import logger


# ─── State Definition ─────────────────────────────────────────────────────────
class FinancialAgentState(TypedDict):
    """
    The state that flows through the graph.
    Each node can read and update this state.
    """
    # Input
    user_query: str
    conversation_history: List[dict]

    # Intermediate state (populated by nodes)
    spending_summary: Optional[dict]
    anomalies: Optional[List[dict]]
    forecast: Optional[dict]
    memory_context: Optional[str]
    tool_calls_made: List[str]

    # Output
    final_response: Optional[str]
    thinking_steps: List[str]
    error: Optional[str]


# ─── Graph Nodes ───────────────────────────────────────────────────────────────

def load_context_node(state: FinancialAgentState, tools: dict) -> FinancialAgentState:
    """
    Node 1: Load context from memory and get a quick spending summary.
    This gives the AI basic financial context before it starts reasoning.
    """
    logger.info("Agent: Loading context...")

    try:
        # Get memory context (past conversations, insights)
        memory_context = financial_memory.get_memory_context(state["user_query"])
        state["memory_context"] = memory_context
        state["thinking_steps"].append("📚 Loaded conversation memory")

        # Get quick spending summary
        analyze_tool = tools.get("analyze_spending")
        if analyze_tool:
            summary_json = analyze_tool.invoke({"months": 1})
            state["spending_summary"] = json.loads(summary_json)
            state["tool_calls_made"].append("analyze_spending")
            state["thinking_steps"].append("📊 Retrieved spending summary")

    except Exception as e:
        logger.error("Context loading failed: {}", str(e))
        state["thinking_steps"].append(f"⚠️ Context loading partial: {str(e)}")

    return state


def analyze_spending_node(state: FinancialAgentState, tools: dict) -> FinancialAgentState:
    """
    Node 2: Deep analysis of spending patterns.
    Gets category breakdown and top expenses relevant to the query.
    """
    logger.info("Agent: Analyzing spending...")

    try:
        # Get category breakdown
        categories_tool = tools.get("get_top_categories")
        if categories_tool:
            categories_json = categories_tool.invoke({"months": 1})
            state["thinking_steps"].append("📊 Analyzed category breakdown")
            state["tool_calls_made"].append("get_top_categories")

        # Get recent expenses if query is specific
        query_lower = state["user_query"].lower()
        if any(word in query_lower for word in ["expense", "spend", "buy", "purchase", "charge"]):
            expenses_tool = tools.get("get_expenses")
            if expenses_tool:
                expenses_json = expenses_tool.invoke({"limit": 10})
                state["thinking_steps"].append("📋 Retrieved recent expenses")
                state["tool_calls_made"].append("get_expenses")

    except Exception as e:
        logger.error("Spending analysis failed: {}", str(e))
        state["thinking_steps"].append(f"⚠️ Analysis partial: {str(e)}")

    return state


def check_anomalies_node(state: FinancialAgentState, tools: dict) -> FinancialAgentState:
    """
    Node 3: Check for anomalies if the query is about unusual spending or alerts.
    We skip this if the query clearly isn't about anomalies (saves time).
    """
    query_lower = state["user_query"].lower()
    anomaly_keywords = ["unusual", "strange", "weird", "alert", "spike", "overspend", "anomal"]

    # Skip if not relevant to query
    if not any(kw in query_lower for kw in anomaly_keywords):
        # Still check if there are anomalies to mention
        state["thinking_steps"].append("🔍 Skipped deep anomaly scan (not relevant to query)")
        return state

    logger.info("Agent: Checking anomalies...")

    try:
        anomaly_tool = tools.get("detect_anomalies")
        if anomaly_tool:
            anomalies_json = anomaly_tool.invoke({})
            state["anomalies"] = json.loads(anomalies_json)
            state["thinking_steps"].append("⚠️ Ran anomaly detection")
            state["tool_calls_made"].append("detect_anomalies")

    except Exception as e:
        logger.error("Anomaly check failed: {}", str(e))

    return state


def forecast_node(state: FinancialAgentState, tools: dict) -> FinancialAgentState:
    """
    Node 4: Run forecasting if query is about the future.
    """
    query_lower = state["user_query"].lower()
    forecast_keywords = ["forecast", "predict", "future", "afford", "next month", "budget", "will i"]

    if not any(kw in query_lower for kw in forecast_keywords):
        state["thinking_steps"].append("📈 Skipped forecasting (not relevant to query)")
        return state

    logger.info("Agent: Running forecast...")

    try:
        forecast_tool = tools.get("forecast_spending")
        if forecast_tool:
            forecast_json = forecast_tool.invoke({"days_ahead": 30})
            state["forecast"] = json.loads(forecast_json)
            state["thinking_steps"].append("📈 Generated 30-day spending forecast")
            state["tool_calls_made"].append("forecast_spending")

    except Exception as e:
        logger.error("Forecasting failed: {}", str(e))

    return state


def generate_response_node(state: FinancialAgentState, llm) -> FinancialAgentState:
    """
    Node 5: Generate the final response using the LLM.
    All context collected in previous nodes is injected here.
    """
    logger.info("Agent: Generating response with LLM...")

    try:
        # Build the full context for the LLM
        context_parts = [FINANCIAL_ASSISTANT_SYSTEM_PROMPT]

        # Add memory context if available
        if state.get("memory_context"):
            context_parts.append(f"\n## Memory Context\n{state['memory_context']}")

        # Add spending summary
        if state.get("spending_summary"):
            summary = state["spending_summary"]
            context_parts.append(
                f"\n## Current Month Summary\n"
                f"- Total: ${summary.get('total', 0):.2f}\n"
                f"- Transactions: {summary.get('count', 0)}\n"
                f"- Top categories: {list(summary.get('by_category', {}).keys())[:3]}\n"
                f"- Anomalies detected: {summary.get('anomaly_count', 0)}"
            )

        # Add anomalies if found
        if state.get("anomalies") and isinstance(state["anomalies"], list):
            context_parts.append(
                f"\n## Anomalies Detected\n"
                + "\n".join([
                    f"- ${a['amount']:.2f} at {a.get('merchant', 'Unknown')} ({a.get('category', '')})"
                    for a in state["anomalies"][:3]
                ])
            )

        # Add forecast if available
        if state.get("forecast") and state["forecast"].get("total_predicted"):
            fc = state["forecast"]
            context_parts.append(
                f"\n## 30-Day Forecast\n"
                f"- Predicted total: ${fc.get('total_predicted', 0):.2f}\n"
                f"- Average daily: ${fc.get('avg_daily_predicted', 0):.2f}\n"
                f"- Confidence: {fc.get('confidence', 'unknown')}"
            )

        # Add tools used
        if state.get("tool_calls_made"):
            context_parts.append(
                f"\n## Analysis Performed\n"
                + ", ".join(state["tool_calls_made"])
            )

        system_prompt = "\n".join(context_parts)

        # Build conversation for the LLM
        messages = []
        # Add conversation history (last 4 turns for context)
        for msg in state.get("conversation_history", [])[-4:]:
            if msg.get("role") == "user":
                messages.append(f"User: {msg['content']}")
            elif msg.get("role") == "assistant":
                messages.append(f"Assistant: {msg['content']}")

        messages.append(f"User: {state['user_query']}")
        conversation_text = "\n".join(messages)

        # Call the local Ollama LLM
        full_prompt = f"{system_prompt}\n\n{conversation_text}\n\nAssistant:"
        response = llm.invoke(full_prompt)

        state["final_response"] = response.strip()
        state["thinking_steps"].append("✅ Generated response")

    except Exception as e:
        logger.error("Response generation failed: {}", str(e))
        state["final_response"] = (
            "I encountered an error while analyzing your finances. "
            "Please make sure Ollama is running with `ollama serve` and the model is downloaded. "
            f"Error: {str(e)}"
        )
        state["error"] = str(e)

    return state


# ─── Graph Construction ────────────────────────────────────────────────────────

def create_financial_agent_graph(tools_list: list, llm):
    """
    Build the LangGraph state machine.
    
    Args:
        tools_list: List of LangChain tool functions
        llm: Ollama LLM instance
        
    Returns:
        Compiled LangGraph application
    """
    # Convert tool list to dict for easy lookup
    tools_dict = {tool.name: tool for tool in tools_list}

    # ─── Create graph ──────────────────────────────────────────────────────────
    workflow = StateGraph(FinancialAgentState)

    # Add nodes (each is a function that processes state)
    workflow.add_node(
        "load_context",
        lambda state: load_context_node(state, tools_dict),
    )
    workflow.add_node(
        "analyze_spending",
        lambda state: analyze_spending_node(state, tools_dict),
    )
    workflow.add_node(
        "check_anomalies",
        lambda state: check_anomalies_node(state, tools_dict),
    )
    workflow.add_node(
        "forecast",
        lambda state: forecast_node(state, tools_dict),
    )
    workflow.add_node(
        "generate_response",
        lambda state: generate_response_node(state, llm),
    )

    # Define execution order (linear flow)
    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "analyze_spending")
    workflow.add_edge("analyze_spending", "check_anomalies")
    workflow.add_edge("check_anomalies", "forecast")
    workflow.add_edge("forecast", "generate_response")
    workflow.add_edge("generate_response", END)

    return workflow.compile()
