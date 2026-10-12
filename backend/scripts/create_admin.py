"""Create the first admin user in the database connected through DATABASE_URL."""

from getpass import getpass
import re

from sqlalchemy import select

from app.core.passwords import hash_password
from app.db.session import SessionLocal
from app.models.user import User


def main() -> None:
    username = input("Admin username: ").strip().lower()
    if not re.fullmatch(r"[a-z0-9_.-]{3,64}", username):
        raise SystemExit("Use 3–64 lowercase letters, numbers, dots, underscores, or hyphens.")

    password = getpass("Admin password (minimum 8 characters): ")
    confirmation = getpass("Confirm admin password: ")
    if len(password) < 8:
        raise SystemExit("Password must contain at least 8 characters.")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.username == username)) is not None:
            raise SystemExit("That username already exists.")
        db.add(User(username=username, password_hash=hash_password(password), is_admin=True))
        db.commit()

    print(f"Admin user '{username}' created.")


if __name__ == "__main__":
    main()
