from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.entities.localization.service import resolve_language
from app.entities.localization.translations import translate
from app.entities.users.models import User
from app.entities.users.service import get_by_id


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return get_by_id(db, user_id)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user = get_optional_user(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=translate("errors.auth_required", resolve_language(request)),
        )
    return user
