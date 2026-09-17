"""
app/utils/logger.py
--------------------
Structured logging using Loguru.

Why Loguru over standard logging?
- Much cleaner API: just `from app.utils.logger import logger`
- Automatic timestamps, colors, and formatting
- Easy log levels and file output
- Better exception tracebacks

Usage in any file:
    from app.utils.logger import logger
    logger.info("Expense created: {}", expense_id)
    logger.warning("Anomaly detected!")
    logger.error("OCR failed: {}", str(e))
"""

import sys
from loguru import logger
from app.utils.config import settings

# Remove default handler
logger.remove()

# --- Console handler (colorful, readable) ---
logger.add(
    sys.stdout,
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    ),
    level=settings.log_level,
    colorize=True,
)

# --- File handler (persistent logs for debugging) ---
logger.add(
    "logs/app.log",
    rotation="10 MB",        # Rotate when file hits 10MB
    retention="7 days",      # Keep logs for 7 days
    compression="zip",       # Compress old logs
    level="DEBUG",           # Log everything to file
    format="{time} | {level} | {name}:{function}:{line} | {message}",
)

# Export the configured logger
__all__ = ["logger"]
