"""
app/main.py
------------
FastAPI application entry point.

This file:
1. Creates the FastAPI app
2. Configures CORS (allows frontend to call the API)
3. Registers all API routers
4. Sets up the database on startup
5. Provides health check endpoints

Run with:
    uvicorn app.main:app --reload --port 8000

Then visit:
    http://localhost:8000/docs  ← Interactive API docs (Swagger UI)
    http://localhost:8000/redoc ← Alternative API docs
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.utils.config import settings
from app.utils.database import create_tables
from app.utils.limiter import limiter
from app.utils.logger import logger

# Import all API routers from routes.py
from app.api.routes import (
    analytics_router,
    ai_router,
    ocr_router,
    forecasting_router,
)
from app.api.expenses import router as expenses_router
from app.api.auth import router as auth_router


# ─── Lifespan (runs on startup and shutdown) ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler.
    Code before 'yield' runs on startup.
    Code after 'yield' runs on shutdown.
    """
    # ── Startup ──
    logger.info("🚀 Starting AI Financial Copilot API...")

    # Create logs directory
    os.makedirs("logs", exist_ok=True)

    # Initialize database tables
    create_tables()

    # Log configuration
    logger.info("Database: {}", settings.database_url)
    logger.info("Ollama model: {}", settings.ollama_model)
    logger.info("Debug mode: {}", settings.debug)

    logger.info("✅ API ready at http://localhost:8000")
    if settings.debug:
        logger.info("📚 API docs at http://localhost:8000/docs")

    yield  # App runs here

    # ── Shutdown ──
    logger.info("👋 Shutting down AI Financial Copilot API...")


# ─── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Financial Copilot",
    description=(
        "An AI-powered personal finance assistant with expense tracking, "
        "OCR receipt scanning, anomaly detection, forecasting, and conversational AI."
    ),
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Rate limiting (brute-force protection on login/register — see app/api/auth.py)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ─── CORS Middleware ───────────────────────────────────────────────────────────
# Required for the React frontend to call this API.
# Only the configured frontend_url is trusted; extra localhost dev ports are
# added when debug=True so production config doesn't silently inherit them.
cors_origins = [settings.frontend_url]
if settings.debug:
    cors_origins += [
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],            # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],            # Authorization, Content-Type, etc.
)


# ─── Register Routers ─────────────────────────────────────────────────────────
# All routes get the /api prefix.
# auth_router (register/login) is intentionally open — you need it to get a token.
# Every other router's routes individually depend on get_current_user (see their
# definitions), so each one is scoped to whoever is logged in.
API_PREFIX = "/api"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(expenses_router, prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)
app.include_router(ai_router, prefix=API_PREFIX)
app.include_router(ocr_router, prefix=API_PREFIX)
app.include_router(forecasting_router, prefix=API_PREFIX)


# ─── Root & Health Endpoints ──────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    """Root endpoint — confirms API is running."""
    return {
        "message": "AI Financial Copilot API",
        "status": "running",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Health check for deployment monitoring."""
    from app.utils.database import engine
    from sqlalchemy import text

    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "database": db_status,
        "model": settings.ollama_model,
    }
