from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.entities.users.models import User
from app.entities.users.schemas import UserRegister


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> User | None:
    query = select(User).where(User.email == email)
    return db.scalar(query)


def get_by_google_sub(db: Session, google_sub: str) -> User | None:
    query = select(User).where(User.google_sub == google_sub)
    return db.scalar(query)


def create_user(db: Session, data: UserRegister, is_admin: bool = False) -> User:
    user = User(
        email=data.email.lower(),
        full_name=data.full_name.strip(),
        hashed_password=hash_password(data.password),
        is_admin=is_admin,
        role="super_admin" if is_admin else "user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_google_user(db: Session, email: str, full_name: str, google_sub: str) -> User:
    user = User(
        email=email.lower(),
        full_name=full_name.strip() or email.split("@")[0],
        google_sub=google_sub,
        hashed_password=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_by_email(db, email.lower())
    if not user or not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
