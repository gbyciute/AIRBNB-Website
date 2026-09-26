"""House API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.house import House
from app.schemas.house import HouseColorUpdate, HouseCreate, HouseRead, HouseUpdate


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


@router.patch("/{house_id}/color", response_model=HouseRead)
def update_house_color(house_id: int, color_update: HouseColorUpdate, db: DatabaseSession) -> House:
    """Save the selected display color for a house."""
    house = db.get(House, house_id)
    if house is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")

    house.color = color_update.color
    db.commit()
    db.refresh(house)
    return house


@router.patch("/{house_id}", response_model=HouseRead)
def update_house(house_id: int, house_update: HouseUpdate, db: DatabaseSession) -> House:
    """Update a house's name and address."""
    house = db.get(House, house_id)
    if house is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")

    house.name = house_update.name
    house.address = house_update.address
    db.commit()
    db.refresh(house)
    return house


@router.delete("/{house_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_house(house_id: int, db: DatabaseSession) -> None:
    """Delete a house."""
    house = db.get(House, house_id)
    if house is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")

    db.delete(house)
    db.commit()
