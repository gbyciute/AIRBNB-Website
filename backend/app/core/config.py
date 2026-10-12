"""Runtime configuration for the API."""

import os

from dotenv import load_dotenv


load_dotenv()


class Settings:
    """Settings read from environment variables with local development defaults."""

    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/airbnb_dev",
    )
    frontend_origins = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]
    session_secret = os.getenv("SESSION_SECRET", "")


settings = Settings()
