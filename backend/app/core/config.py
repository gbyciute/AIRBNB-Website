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
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
        ).split(",")
        if origin.strip()
    ]
    session_secret = os.getenv("SESSION_SECRET", "")
    photo_bucket = os.getenv("PHOTO_BUCKET", "")
    photo_access_key_id = os.getenv("PHOTO_ACCESS_KEY_ID", "")
    photo_secret_access_key = os.getenv("PHOTO_SECRET_ACCESS_KEY", "")
    photo_region = os.getenv("PHOTO_REGION", "auto")
    photo_endpoint = os.getenv("PHOTO_ENDPOINT", "")
    photo_local_directory = os.getenv("PHOTO_LOCAL_DIRECTORY", ".uploads")


settings = Settings()
