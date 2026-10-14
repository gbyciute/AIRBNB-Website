"""Inventory tracking sheet endpoints."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Form, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import CurrentUser, require_authenticated
from app.db.session import get_db
from app.models.house import House
from app.models.inventory_form import InventoryForm, InventoryFormLine
from app.schemas.inventory_form import InventoryFormCreate, InventoryFormRead, InventoryFormUpdate
from app.services.inventory_pdf import build_inventory_pdf


house_inventory_router = APIRouter(
    prefix="/houses", tags=["inventory forms"], dependencies=[Depends(require_authenticated)]
)
inventory_router = APIRouter(
    prefix="/inventory-forms", tags=["inventory forms"], dependencies=[Depends(require_authenticated)]
)
DatabaseSession = Annotated[Session, Depends(get_db)]


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory form not found")


def _load_form(db: Session, form_id: int) -> InventoryForm:
    form = db.scalar(
        select(InventoryForm)
        .options(
            selectinload(InventoryForm.lines),
            selectinload(InventoryForm.created_by),
            selectinload(InventoryForm.last_edited_by),
        )
        .where(InventoryForm.id == form_id)
    )
    if form is None:
        raise _not_found()
    return form


def _make_lines(form_data: InventoryFormCreate) -> list[InventoryFormLine]:
    return [
        InventoryFormLine(**line.model_dump(), sort_order=index)
        for index, line in enumerate(form_data.lines)
    ]


@house_inventory_router.get("/{house_id}/inventory-forms", response_model=list[InventoryFormRead])
def list_inventory_forms(house_id: int, db: DatabaseSession) -> list[InventoryForm]:
    """List a house's tracking sheets, newest first."""
    if db.get(House, house_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")

    forms = db.scalars(
        select(InventoryForm)
        .options(
            selectinload(InventoryForm.lines),
            selectinload(InventoryForm.created_by),
            selectinload(InventoryForm.last_edited_by),
        )
        .where(InventoryForm.house_id == house_id)
        .order_by(InventoryForm.count_date.desc(), InventoryForm.id.desc())
    )
    return list(forms)


@house_inventory_router.post(
    "/{house_id}/inventory-forms",
    response_model=InventoryFormRead,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_form(
    house_id: int,
    form_data: InventoryFormCreate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> InventoryForm:
    """Create a tracking sheet for a house."""
    if db.get(House, house_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")

    form = InventoryForm(
        house_id=house_id,
        created_by_user_id=current_user.id,
        last_edited_by_user_id=current_user.id,
        last_edited_by_username_snapshot=current_user.username,
        **form_data.model_dump(exclude={"lines"}),
        lines=_make_lines(form_data),
    )
    db.add(form)
    db.commit()
    return _load_form(db, form.id)


@house_inventory_router.post("/{house_id}/inventory-forms/pdf")
def download_inventory_pdf(
    house_id: int,
    form_data: InventoryFormCreate,
    db: DatabaseSession,
    language: Literal["pt", "en"] = "pt",
) -> Response:
    """Generate a downloadable PDF from the current tracking-sheet values."""
    house = db.get(House, house_id)
    if house is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")

    pdf = build_inventory_pdf(house, form_data, language)
    filename = f"inventory-{house_id}-{form_data.count_date.isoformat()}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@house_inventory_router.post("/{house_id}/inventory-forms/pdf-download")
def download_inventory_pdf_from_form(
    house_id: int,
    db: DatabaseSession,
    payload: Annotated[str, Form()],
    language: Annotated[Literal["pt", "en"], Form()] = "pt",
) -> Response:
    """Generate a PDF through a native browser form submission."""
    house = db.get(House, house_id)
    if house is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="House not found")
    try:
        form_data = InventoryFormCreate.model_validate_json(payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid tracking sheet") from error

    pdf = build_inventory_pdf(house, form_data, language)
    filename = f"inventory-{house_id}-{form_data.count_date.isoformat()}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@inventory_router.get("/{form_id}", response_model=InventoryFormRead)
def get_inventory_form(form_id: int, db: DatabaseSession) -> InventoryForm:
    """Return a tracking sheet and all its rows."""
    return _load_form(db, form_id)


@inventory_router.put("/{form_id}", response_model=InventoryFormRead)
def update_inventory_form(
    form_id: int,
    form_data: InventoryFormUpdate,
    db: DatabaseSession,
    current_user: CurrentUser,
) -> InventoryForm:
    """Replace the editable fields and rows of a tracking sheet."""
    form = _load_form(db, form_id)
    for field, value in form_data.model_dump(exclude={"lines"}).items():
        setattr(form, field, value)
    form.last_edited_by_user_id = current_user.id
    form.last_edited_by_username_snapshot = current_user.username
    form.lines = _make_lines(form_data)
    db.commit()
    return _load_form(db, form_id)


@inventory_router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_form(form_id: int, db: DatabaseSession) -> None:
    """Delete a tracking sheet and its associated item rows."""
    form = db.get(InventoryForm, form_id)
    if form is None:
        raise _not_found()

    db.delete(form)
    db.commit()
