import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Reliably load .env from the backend directory regardless of current working directory
_BASE_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BASE_DIR / ".env"
if _ENV_FILE.exists():
    load_dotenv(dotenv_path=_ENV_FILE)
else:
    load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Learning Web Application"

    MONGODB_URI: str = os.getenv(
        "MONGODB_URI",
        "mongodb+srv://<db_username>:<db_password>@vishu.zwejdog.mongodb.net/smart_learning_db?retryWrites=true&w=majority"
    )

    DATABASE_NAME: str = os.getenv(
        "DATABASE_NAME",
        "smart_learning_db"
    )

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv(
        "GEMINI_MODEL",
        "gemini-2.0-flash"
    )

    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")

    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        "supersecretjwtkeyforantigravitymcaproject2026"
    )

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    UPLOAD_DIR: str = os.getenv(
        "UPLOAD_DIR",
        "/tmp/uploads/materials" if os.getenv("VERCEL") else "uploads/materials"
    )

    # Email configuration for OTP and notifications
    EMAIL_HOST: str = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT: int = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USER: str = os.getenv("EMAIL_USER", "")
    EMAIL_PASS: str = os.getenv("EMAIL_PASS", "")
    EMAIL_FROM_NAME: str = os.getenv("EMAIL_FROM_NAME", "Smart Learning AI")

    # YouTube API key for educational video search
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()