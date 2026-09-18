"""House API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.house import House
from app.schemas.house import HouseCreate, HouseRead


router = APIRouter(prefix="/houses", tags=["houses"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[HouseRead])
def list_houses(db: DatabaseSession) -> list[House]:
    """Return all houses, newest first."""
    return list(db.scalars(select(House).order_by(House.id.desc())))


@router.post("", response_model=HouseRead, status_code=status.HTTP_201_CREATED)
def create_house(house: HouseCreate, db: DatabaseSession) -> House:
    """Create and return a house."""
    db_house = House(name=house.name, address=house.address)
    db.add(db_house)
    db.commit()
    db.refresh(db_house)
    return db_house
