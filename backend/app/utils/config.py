"""
app/utils/config.py
--------------------
Centralized configuration management using pydantic-settings.
Reads values from environment variables or .env file.

Why pydantic-settings?
- Type validation on startup (fail fast if something's missing)
- Auto-reads .env files
- Easy to extend for production deployment
"""

import platform
import secrets
import shutil
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


def _default_tesseract_path() -> str:
    """Best-effort guess at the Tesseract binary location for the current OS."""
    found = shutil.which("tesseract")
    if found:
        return found
    if platform.system() == "Windows":
        return r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    return "/usr/bin/tesseract"


class Settings(BaseSettings):
    """
    Application settings — loaded from environment variables or .env file.
    All fields have defaults so the app runs out-of-the-box.
    """

    # App metadata
    app_name: str = "SmartSpent"
    debug: bool = False
    log_level: str = "INFO"

    # Database — SQLite by default (no setup needed)
    database_url: str = "sqlite:///./financial_copilot.db"

    # Ollama — local LLM server
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:3b"

    # Tesseract OCR path — auto-detected per-OS, override via TESSERACT_PATH env var
    tesseract_path: str = _default_tesseract_path()

    # ChromaDB — local vector database for AI memory
    chroma_persist_dir: str = "./chroma_db"

    # CORS — allowed frontend origins
    frontend_url: str = "http://localhost:5173"

    # Secret used to sign login JWTs. Left blank by default;
    # _ensure_jwt_secret() generates and persists one into .env on first
    # run so existing logins survive restarts.
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7  # 7 days

    # Tell pydantic-settings to read from .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


def _ensure_jwt_secret(env_path: Path = Path(".env")) -> None:
    """
    Generate a random JWT-signing secret on first run and persist it to
    .env so it's stable across restarts. Without this, every restart would
    invalidate every logged-in user's session.
    """
    if not env_path.exists():
        env_path.touch()

    contents = env_path.read_text()
    if "JWT_SECRET=" in contents:
        return

    new_secret = secrets.token_urlsafe(32)
    with env_path.open("a") as f:
        f.write(f"\nJWT_SECRET={new_secret}\n")


_ensure_jwt_secret()


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    Using lru_cache means we only read the .env file once,
    not on every request.
    """
    return Settings()


# Convenience: import this directly in other modules
settings = get_settings()
