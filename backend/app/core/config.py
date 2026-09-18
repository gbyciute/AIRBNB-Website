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


settings = Settings()
