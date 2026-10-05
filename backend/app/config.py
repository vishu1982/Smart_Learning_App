import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

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

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()