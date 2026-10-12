"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.houses import router as houses_router
from app.api.auth import router as auth_router
from app.api.inventory_forms import house_inventory_router, inventory_router
from app.core.config import settings


app = FastAPI(title="AIRBNB API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(houses_router)
app.include_router(auth_router)
app.include_router(house_inventory_router)
app.include_router(inventory_router)


@app.get("/")
async def root() -> dict[str, str]:
    """Return a small welcome response."""
    return {"message": "Welcome to the AIRBNB API"}


@app.get("/test")
async def test_endpoint() -> dict[str, str]:
    """Simple endpoint for confirming the API is reachable."""
    return {"status": "ok", "message": "Test endpoint is working"}
