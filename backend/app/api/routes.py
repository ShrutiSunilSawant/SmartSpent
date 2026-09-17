"""
app/api/analytics.py - Analytics endpoints
app/api/ai.py - AI assistant endpoint
app/api/ocr.py - OCR receipt scanning endpoint
app/api/forecasting.py - Forecasting endpoint

These are in one file for brevity — in production you'd split them.

All routes below (except OCR, which is stateless) are scoped to the
logged-in user via get_current_user / current_user.id.
"""

# ─── analytics.py ─────────────────────────────────────────────────────────────
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.utils.database import get_db
from app.utils.auth import get_current_user
from app.models.user import User
from app.services.analytics_service import analytics_service

analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])


@analytics_router.get("/summary")
def get_spending_summary(
    months: int = Query(default=1, ge=1, le=24, description="Months of data"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get spending summary: total, by category, top merchants, anomalies."""
    return analytics_service.get_summary(db, user_id=current_user.id, months=months)


@analytics_router.get("/trends")
def get_monthly_trends(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get month-over-month spending trends for charts."""
    return analytics_service.get_monthly_trends(db, user_id=current_user.id, months=months)


@analytics_router.get("/categories")
def get_category_breakdown(
    months: int = Query(default=1, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get spending breakdown by category with percentages."""
    return analytics_service.get_category_breakdown(db, user_id=current_user.id, months=months)


@analytics_router.get("/anomalies")
def get_anomalies(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get expenses flagged as anomalies by IsolationForest."""
    return analytics_service.get_anomalies(db, user_id=current_user.id, limit=limit)


@analytics_router.get("/insights")
def get_savings_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get rule-based savings insights and tips."""
    return {"insights": analytics_service.get_savings_insights(db, user_id=current_user.id)}


# ─── ai.py ────────────────────────────────────────────────────────────────────
from fastapi import HTTPException
from app.schemas.expense import ChatRequest, ChatResponse
from app.services.ai_service import ai_service

ai_router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@ai_router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Chat with the AI financial assistant.

    The assistant:
    - Retrieves your expense data
    - Analyzes spending patterns
    - Uses LangGraph for multi-step reasoning
    - Returns personalized financial advice

    Requires Ollama to be running locally.
    """
    try:
        result = ai_service.chat(
            db=db,
            user_id=current_user.id,
            user_message=request.message,
            conversation_history=[
                msg.model_dump() for msg in request.conversation_history
            ],
        )
        return ChatResponse(
            response=result["response"],
            sources=result.get("tools_used", []),
            thinking_steps=result.get("thinking_steps", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@ai_router.get("/status")
def check_ai_status():
    """Check if Ollama is running and the model is available."""
    import httpx
    try:
        response = httpx.get(
            f"{ai_service.llm.base_url if ai_service.llm else 'http://localhost:11434'}/api/tags",
            timeout=5,
        )
        models = response.json().get("models", [])
        model_names = [m.get("name", "") for m in models]
        return {
            "ollama_running": True,
            "models_available": model_names,
            "configured_model": "phi3",
        }
    except Exception:
        return {
            "ollama_running": False,
            "models_available": [],
            "configured_model": "phi3",
            "error": "Ollama is not running. Start it with: ollama serve",
        }


# ─── ocr.py ───────────────────────────────────────────────────────────────────
from fastapi import UploadFile, File
from app.services.ocr_service import ocr_service
from app.schemas.expense import OCRResult

ocr_router = APIRouter(prefix="/ocr", tags=["OCR"])


@ocr_router.post("/scan", response_model=OCRResult)
async def scan_receipt(
    file: UploadFile = File(..., description="Receipt image (JPEG, PNG, etc.)"),
    current_user: User = Depends(get_current_user),
):
    """
    Scan a receipt image using OCR.

    Pipeline:
    1. Load and preprocess image (OpenCV)
    2. Extract text (Tesseract)
    3. Parse: amount, merchant, date
    4. Predict category (ML)
    5. Return for user confirmation (NOT auto-saved)

    Supported formats: JPEG, PNG, WEBP, TIFF, BMP
    Max size: ~10MB

    Login is required (like every other route) even though this endpoint
    doesn't touch the database — it shouldn't be open to anonymous callers.
    """
    # Validate file type
    if file.content_type and not (
        file.content_type.startswith("image/") or
        file.content_type == "application/pdf"
    ):
        raise HTTPException(
            status_code=400,
            detail=f"File must be an image or PDF. Got: {file.content_type}",
        )

    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    result = ocr_service.process_receipt(image_bytes, filename=file.filename or "")
    return result


# ─── forecasting.py ───────────────────────────────────────────────────────────
from app.services.expense_service import expense_service
from app.ml.forecasting import expense_forecaster

forecasting_router = APIRouter(prefix="/forecasting", tags=["Forecasting"])


@forecasting_router.get("/predict")
def forecast_expenses(
    days_ahead: int = Query(default=30, ge=1, le=365, description="Days to forecast"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Forecast future expenses using Prophet or ARIMA.

    Returns:
    - Daily predictions with confidence intervals
    - Total predicted spending
    - Historical data for comparison
    - Forecasting method used (Prophet > ARIMA > MovingAverage)
    """
    expenses = expense_service.get_expenses_as_dicts(db, user_id=current_user.id, limit=365)
    forecast = expense_forecaster.forecast(expenses, days_ahead=days_ahead)
    return forecast
