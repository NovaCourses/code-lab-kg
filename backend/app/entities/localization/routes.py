from fastapi import APIRouter, Query, Request
from fastapi.responses import RedirectResponse

from backend.app.core.config import settings

router = APIRouter(prefix="/localization", tags=["localization"])


@router.get("/set/{lang}")
def set_language(request: Request, lang: str, next_url: str = Query(default="/")):
    if lang in settings.supported_languages_list:
        request.session["language"] = lang
    return RedirectResponse(url=next_url, status_code=303)
