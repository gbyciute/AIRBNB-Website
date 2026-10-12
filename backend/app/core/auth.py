"""Cookie session authentication for user accounts."""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User


SESSION_COOKIE = "airbnb_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 7
DatabaseSession = Annotated[Session, Depends(get_db)]


def check_frontend_origin(request: Request) -> None:
    """Reject requests that originate outside the configured website."""
    origin = request.headers.get("origin")
    if origin not in settings.frontend_origins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Origin not allowed")


def _configuration_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Authentication is not configured",
    )


def _session_signature(user_id: str, expires_at: str) -> str:
    if not settings.session_secret:
        raise _configuration_error()
    message = f"airbnb-session:{user_id}:{expires_at}".encode()
    return hmac.new(settings.session_secret.encode(), message, hashlib.sha256).hexdigest()


def create_session_token(user_id: int) -> str:
    expires_at = str(int(time.time()) + SESSION_MAX_AGE)
    user_id_text = str(user_id)
    signature = _session_signature(user_id_text, expires_at)
    return f"{user_id_text}.{expires_at}.{signature}"


def _session_user_id(token: str | None) -> int | None:
    if not token or not settings.session_secret:
        return None
    try:
        user_id, expires_at, signature = token.split(".", maxsplit=2)
        if int(expires_at) <= int(time.time()):
            return None
        expected_signature = _session_signature(user_id, expires_at)
        if not hmac.compare_digest(signature, expected_signature):
            return None
        parsed_user_id = int(user_id)
        return parsed_user_id if parsed_user_id > 0 else None
    except (ValueError, TypeError):
        return None


def require_authenticated(request: Request, db: DatabaseSession) -> User:
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        check_frontend_origin(request)

    user_id = _session_user_id(request.cookies.get(SESSION_COOKIE))
    user = db.get(User, user_id) if user_id is not None else None
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login required")
    return user


CurrentUser = Annotated[User, Depends(require_authenticated)]
