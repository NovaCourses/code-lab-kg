from fastapi import Request

from backend.app.core.config import settings
from backend.app.entities.localization.service import resolve_language


def build_template_context(request: Request, **extra) -> dict:
    context = {
        "request": request,
        "lang": resolve_language(request),
        "supported_languages": settings.supported_languages_list,
        "current_user": extra.pop("current_user", None),
    }
    context.update(extra)
    return context