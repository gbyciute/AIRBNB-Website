"""Login and admin-only user management endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import (
    CurrentUser,
    SESSION_COOKIE,
    SESSION_MAX_AGE,
    check_frontend_origin,
    create_session_token,
)
from app.core.config import settings
from app.core.passwords import hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, UserCreate, UserRead


router = APIRouter(prefix="/auth", tags=["authentication"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("/login", response_model=UserRead)
def login(data: LoginRequest, request: Request, response: Response, db: DatabaseSession) -> User:
    check_frontend_origin(request)
    if not settings.session_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        )

    user = db.scalar(select(User).where(User.username == data.username))
    if user is None or not user.is_active or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    response.set_cookie(
        key=SESSION_COOKIE,
        value=create_session_token(user.id),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return user


@router.get("/session", response_model=UserRead)
def session(current_user: CurrentUser) -> User:
    return current_user


@router.post("/logout")
def logout(request: Request, response: Response) -> dict[str, bool]:
    check_frontend_origin(request)
    response.delete_cookie(key=SESSION_COOKIE, path="/", secure=True, httponly=True, samesite="none")
    return {"authenticated": False}


@router.get("/users", response_model=list[UserRead])
def list_users(current_user: CurrentUser, db: DatabaseSession) -> list[User]:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return list(db.scalars(select(User).order_by(User.username)))


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, current_user: CurrentUser, db: DatabaseSession) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    user = User(username=data.username, password_hash=hash_password(data.password), is_admin=False)
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists") from error
    db.refresh(user)
    return user
