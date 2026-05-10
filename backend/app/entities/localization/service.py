from fastapi import Request

from app.core.config import settings


def resolve_language(request: Request) -> str:
    requested = request.query_params.get("lang") or request.session.get("language") or settings.default_language
    if requested not in settings.supported_languages_list:
        requested = settings.default_language
    request.session["language"] = requested
    return requested
