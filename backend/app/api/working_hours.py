"""Authenticated work-hour logging and administration."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.auth import CurrentUser, require_authenticated
from app.db.session import get_db
from app.models.house import House
from app.models.working_hour import WorkingHour, WorkingHourHistory
from app.models.user import User
from app.schemas.working_hour import WorkingHourCreate, WorkingHourHistoryRead, WorkingHourRead, WorkingHourUpdate


router = APIRouter(prefix="/working-hours", tags=["working hours"], dependencies=[Depends(require_authenticated)])
DatabaseSession = Annotated[Session, Depends(get_db)]


def _read(entry: WorkingHour) -> dict[str, object]:
    return {
        "id": entry.id,
        "user_id": entry.user_id,
        "username": entry.user.username,
        "display_name": entry.user.display_name,
        "calendar_color": entry.user.calendar_color,
        "house_id": entry.house_id,
        "house_name": entry.house.name,
        "date": entry.work_date,
        "start": entry.start_time.strftime("%H:%M"),
        "end": entry.end_time.strftime("%H:%M"),
        "break_minutes": entry.break_minutes,
        "service": entry.service,
        "task": entry.task,
        "rate": entry.hourly_rate,
        "created_at": entry.created_at,
    }


def _snapshot(entry: WorkingHour) -> dict[str, object]:
    return {
        "house_id": entry.house_id,
        "house_name": entry.house.name,
        "date": entry.work_date.isoformat(),
        "start": entry.start_time.strftime("%H:%M"),
        "end": entry.end_time.strftime("%H:%M"),
        "break_minutes": entry.break_minutes,
        "service": entry.service,
        "task": entry.task,
        "rate": str(entry.hourly_rate),
    }


def _record_history(
    db: Session,
    entry: WorkingHour,
    current_user: CurrentUser,
    action: str,
    before_state: dict[str, object] | None,
    after_state: dict[str, object] | None,
) -> None:
    db.add(WorkingHourHistory(
        working_hour_id=entry.id,
        actor_id=current_user.id,
        actor_username=current_user.username,
        action=action,
        before_state=before_state,
        after_state=after_state,
    ))


@router.get("", response_model=list[WorkingHourRead])
def list_working_hours(
    db: DatabaseSession,
    current_user: CurrentUser,
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    user_id: Optional[int] = Query(default=None),
    house_id: Optional[int] = Query(default=None),
    service: Optional[str] = Query(default=None),
) -> list[dict[str, object]]:
    query = select(WorkingHour).options(joinedload(WorkingHour.user), joinedload(WorkingHour.house)).where(WorkingHour.deleted_at.is_(None))
    if current_user.is_admin:
        query = query.where(WorkingHour.user_id != current_user.id)
        if user_id is not None:
            query = query.where(WorkingHour.user_id == user_id)
    else:
        query = query.where(WorkingHour.user_id == current_user.id)
    if from_date is not None:
        query = query.where(WorkingHour.work_date >= from_date)
    if to_date is not None:
        query = query.where(WorkingHour.work_date <= to_date)
    if house_id is not None:
        query = query.where(WorkingHour.house_id == house_id)
    if service is not None:
        query = query.where(WorkingHour.service == service)
    entries = db.scalars(query.order_by(WorkingHour.work_date.desc(), WorkingHour.start_time.asc())).unique()
    return [_read(entry) for entry in entries]


@router.post("", response_model=WorkingHourRead, status_code=status.HTTP_201_CREATED)
def create_working_hour(
    data: WorkingHourCreate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> dict[str, object]:
    if current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employees log their own working hours")
    house = db.get(House, data.house_id)
    if house is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")

    entry = WorkingHour(
        user_id=current_user.id,
        house_id=house.id,
        work_date=data.date,
        start_time=data.start,
        end_time=data.end,
        break_minutes=data.break_minutes,
        service=data.service,
        task=data.task,
        hourly_rate=data.rate,
    )
    db.add(entry)
    db.commit()
    entry = db.scalar(
        select(WorkingHour)
        .options(joinedload(WorkingHour.user), joinedload(WorkingHour.house))
        .where(WorkingHour.id == entry.id)
    )
    if entry is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not load saved entry")
    return _read(entry)


@router.put("/{entry_id}", response_model=WorkingHourRead)
def update_working_hour(
    entry_id: int,
    data: WorkingHourUpdate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> dict[str, object]:
    entry = db.scalar(
        select(WorkingHour)
        .options(joinedload(WorkingHour.user), joinedload(WorkingHour.house))
        .where(WorkingHour.id == entry_id, WorkingHour.deleted_at.is_(None))
    )
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Working-hour entry not found")
    if current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot edit working-hour entries")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own entries")
    house = db.get(House, data.house_id)
    if house is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")

    before_state = _snapshot(entry)
    entry.house = house
    entry.work_date = data.date
    entry.start_time = data.start
    entry.end_time = data.end
    entry.break_minutes = data.break_minutes
    entry.service = data.service
    if data.task is not None:
        entry.task = data.task
    entry.hourly_rate = data.rate
    _record_history(db, entry, current_user, "updated", before_state, _snapshot(entry))
    db.commit()
    entry = db.scalar(
        select(WorkingHour)
        .options(joinedload(WorkingHour.user), joinedload(WorkingHour.house))
        .where(WorkingHour.id == entry_id)
    )
    if entry is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not load updated entry")
    return _read(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_working_hour(
    entry_id: int,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> None:
    entry = db.scalar(select(WorkingHour).options(joinedload(WorkingHour.user), joinedload(WorkingHour.house)).where(WorkingHour.id == entry_id, WorkingHour.deleted_at.is_(None)))
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Working-hour entry not found")
    if current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot delete working-hour entries")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own entries")
    before_state = _snapshot(entry)
    entry.deleted_at = datetime.now(timezone.utc)
    _record_history(db, entry, current_user, "deleted", before_state, None)
    db.commit()


@router.post("/{entry_id}/restore", response_model=WorkingHourRead)
def restore_working_hour(
    entry_id: int,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> dict[str, object]:
    entry = db.scalar(select(WorkingHour).options(joinedload(WorkingHour.user), joinedload(WorkingHour.house)).where(WorkingHour.id == entry_id))
    if entry is None or entry.deleted_at is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deleted working-hour entry not found")
    if current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot restore working-hour entries")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only restore your own entries")
    before_state = _snapshot(entry)
    entry.deleted_at = None
    _record_history(db, entry, current_user, "restored", before_state, before_state)
    db.commit()
    entry = db.scalar(select(WorkingHour).options(joinedload(WorkingHour.user), joinedload(WorkingHour.house)).where(WorkingHour.id == entry_id))
    if entry is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not load restored entry")
    return _read(entry)


@router.get("/{entry_id}/history", response_model=list[WorkingHourHistoryRead])
def get_working_hour_history(
    entry_id: int,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> list[WorkingHourHistory]:
    entry = db.get(WorkingHour, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Working-hour entry not found")
    if not current_user.is_admin and entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own entry history")
    return list(db.scalars(select(WorkingHourHistory).where(WorkingHourHistory.working_hour_id == entry_id).order_by(WorkingHourHistory.changed_at.desc(), WorkingHourHistory.id.desc())))
