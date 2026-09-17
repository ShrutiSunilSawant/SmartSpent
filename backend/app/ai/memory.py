"""
app/ai/memory.py
-----------------
Persistent memory for the AI assistant using ChromaDB.

What is ChromaDB?
- Open-source vector database that runs locally
- Stores text as embeddings (numerical representations)
- Enables semantic search: "find conversations about food spending"
- No API key required — runs entirely on your machine

What we store:
- Past conversation turns
- User financial preferences
- Important insights and recommendations
- Recurring merchants and patterns

Why vector memory?
- The AI can recall relevant past conversations
- Creates a personalized, context-aware experience
- User feels like the AI "remembers" them across sessions
"""

import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Optional
from datetime import datetime
import json

from app.utils.config import settings
from app.utils.logger import logger


class FinancialMemory:
    """
    Manages persistent AI memory using ChromaDB.
    
    Collections:
    - conversations: Past chat history
    - insights: Important financial insights discovered
    - preferences: User preferences and goals
    """

    def __init__(self):
        """Initialize ChromaDB client and create collections."""
        try:
            # Persistent client — data survives app restarts
            self.client = chromadb.PersistentClient(
                path=settings.chroma_persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )

            # Create collections (or load if they exist)
            self.conversations = self.client.get_or_create_collection(
                name="conversations",
                metadata={"description": "Chat conversation history"},
            )
            self.insights = self.client.get_or_create_collection(
                name="financial_insights",
                metadata={"description": "Important financial insights"},
            )
            self.preferences = self.client.get_or_create_collection(
                name="user_preferences",
                metadata={"description": "User preferences and goals"},
            )

            logger.info("ChromaDB memory initialized at: {}", settings.chroma_persist_dir)

        except Exception as e:
            logger.error("Failed to initialize ChromaDB: {}", str(e))
            # Don't crash — app works without memory, just stateless
            self.client = None
            self.conversations = None
            self.insights = None
            self.preferences = None

    def save_conversation(
        self,
        user_message: str,
        assistant_response: str,
        metadata: Optional[dict] = None,
    ) -> None:
        """
        Save a conversation turn to memory.
        
        Args:
            user_message: What the user asked
            assistant_response: What the AI responded
            metadata: Optional extra context (e.g., tools used)
        """
        if not self.conversations:
            return

        try:
            turn_id = f"conv_{datetime.now().timestamp()}"
            combined_text = f"User: {user_message}\nAssistant: {assistant_response}"

            self.conversations.add(
                ids=[turn_id],
                documents=[combined_text],
                metadatas=[{
                    "user_message": user_message[:500],
                    "timestamp": datetime.now().isoformat(),
                    **(metadata or {}),
                }],
            )
            logger.debug("Saved conversation turn: {}", turn_id)

        except Exception as e:
            logger.error("Failed to save conversation: {}", str(e))

    def recall_relevant_conversations(
        self,
        query: str,
        n_results: int = 3,
    ) -> List[str]:
        """
        Find past conversations relevant to the current query.
        Uses semantic similarity — finds related topics, not just exact matches.
        
        Args:
            query: The current user message
            n_results: How many past conversations to retrieve
            
        Returns:
            List of relevant past conversation texts
        """
        if not self.conversations:
            return []

        try:
            count = self.conversations.count()
            if count == 0:
                return []

            results = self.conversations.query(
                query_texts=[query],
                n_results=min(n_results, count),
            )

            return results.get("documents", [[]])[0]

        except Exception as e:
            logger.error("Memory recall failed: {}", str(e))
            return []

    def save_insight(self, insight: str, category: str = "general") -> None:
        """
        Save an important financial insight for future reference.
        
        Example: "User tends to overspend on weekends"
        """
        if not self.insights:
            return

        try:
            insight_id = f"insight_{datetime.now().timestamp()}"
            self.insights.add(
                ids=[insight_id],
                documents=[insight],
                metadatas=[{
                    "category": category,
                    "timestamp": datetime.now().isoformat(),
                }],
            )
        except Exception as e:
            logger.error("Failed to save insight: {}", str(e))

    def get_recent_insights(self, n: int = 5) -> List[str]:
        """Get the most recently saved financial insights."""
        if not self.insights:
            return []

        try:
            count = self.insights.count()
            if count == 0:
                return []

            # ChromaDB doesn't support simple "get recent" — we get all and sort
            results = self.insights.get(include=["documents", "metadatas"])
            documents = results.get("documents", [])
            metadatas = results.get("metadatas", [])

            # Sort by timestamp
            paired = sorted(
                zip(documents, metadatas),
                key=lambda x: x[1].get("timestamp", ""),
                reverse=True,
            )

            return [doc for doc, _ in paired[:n]]

        except Exception as e:
            logger.error("Failed to get insights: {}", str(e))
            return []

    def get_memory_context(self, query: str) -> str:
        """
        Build a memory context string to inject into the AI prompt.
        Combines relevant past conversations and insights.
        
        Returns:
            Formatted string ready to inject into system prompt
        """
        context_parts = []

        # Recall relevant past conversations
        past_convs = self.recall_relevant_conversations(query, n_results=2)
        if past_convs:
            context_parts.append("## Relevant Past Conversations")
            for conv in past_convs:
                context_parts.append(f"- {conv[:300]}...")

        # Include recent insights
        insights = self.get_recent_insights(n=3)
        if insights:
            context_parts.append("## Known Financial Patterns")
            for insight in insights:
                context_parts.append(f"- {insight}")

        if not context_parts:
            return ""

        return "\n".join(context_parts)


# Singleton
financial_memory = FinancialMemory()
