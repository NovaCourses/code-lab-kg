from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.context import build_template_context
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_optional_user
from backend.app.entities.localization.service import resolve_language
from backend.app.entities.localization.translations import translate
from backend.app.entities.users.models import User
from backend.app.entities.users.schemas import UserRegister
from backend.app.entities.users.service import (
    authenticate_user,
    create_google_user,
    create_user,
    get_by_email,
    get_by_google_sub,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _render(request: Request, template_name: str, **context) -> HTMLResponse:
    templates = request.app.state.templates
    return templates.TemplateResponse(template_name, build_template_context(request, **context))


def _t(request: Request, key: str) -> str:
    return translate(key, resolve_language(request))


def _google_redirect_uri(request: Request) -> str:
    configured = (settings.google_redirect_uri or "").strip()
    if configured and configured.lower() not in {"auto", "dynamic"}:
        return configured
    return str(request.url_for("google_callback"))


@router.get("/register", response_class=HTMLResponse)
def register_page(
    request: Request,
    db: Session = Depends(get_db),
):
    current_user = get_optional_user(request, db)
    if current_user:
        return RedirectResponse(url="/", status_code=303)
    return _render(request, "auth/register.html", error=None, form_data={})


@router.post("/register", response_class=HTMLResponse)
def register(
    request: Request,
    email: str = Form(...),
    full_name: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    if get_optional_user(request, db):
        return RedirectResponse(url="/", status_code=303)

    try:
        payload = UserRegister(email=email, full_name=full_name, password=password)
    except ValidationError:
        return _render(
            request,
            "auth/register.html",
            error=_t(request, "auth.error.invalid_form"),
            form_data={"email": email, "full_name": full_name},
        )

    if get_by_email(db, payload.email.lower()):
        return _render(
            request,
            "auth/register.html",
            error=_t(request, "auth.error.user_exists"),
            form_data={"email": email, "full_name": full_name},
        )

    user = create_user(db, payload)
    request.session["user_id"] = user.id
    return RedirectResponse(url="/", status_code=303)


@router.get("/login", response_class=HTMLResponse)
def login_page(
    request: Request,
    db: Session = Depends(get_db),
):
    current_user = get_optional_user(request, db)
    if current_user:
        return RedirectResponse(url="/", status_code=303)
    return _render(request, "auth/login.html", error=None, form_data={})


@router.post("/login", response_class=HTMLResponse)
def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    if get_optional_user(request, db):
        return RedirectResponse(url="/", status_code=303)

    user = authenticate_user(db, email=email, password=password)
    if not user:
        return _render(
            request,
            "auth/login.html",
            error=_t(request, "auth.error.invalid_credentials"),
            form_data={"email": email},
        )

    request.session["user_id"] = user.id
    return RedirectResponse(url="/", status_code=303)


@router.get("/logout")
def logout(request: Request):
    request.session.pop("user_id", None)
    return RedirectResponse(url="/", status_code=303)


@router.get("/google/login")
async def google_login(request: Request):
    oauth = request.app.state.oauth
    if not hasattr(oauth, "google"):
        return RedirectResponse(url="/auth/login?error=google_disabled", status_code=303)
    redirect_uri = _google_redirect_uri(request)
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    oauth = request.app.state.oauth
    if not hasattr(oauth, "google"):
        return RedirectResponse(url="/auth/login?error=google_disabled", status_code=303)

    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo") or await oauth.google.parse_id_token(request, token)
    if not user_info:
        return RedirectResponse(url="/auth/login?error=google_userinfo", status_code=303)

    google_sub = user_info.get("sub")
    email = user_info.get("email")
    full_name = user_info.get("name") or user_info.get("given_name") or "Google User"
    if not email or not google_sub:
        return RedirectResponse(url="/auth/login?error=google_data", status_code=303)

    user = get_by_google_sub(db, google_sub)
    if not user:
        user = get_by_email(db, email.lower())
        if user:
            user.google_sub = google_sub
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user = create_google_user(db, email=email, full_name=full_name, google_sub=google_sub)

    request.session["user_id"] = user.id
    return RedirectResponse(url="/", status_code=303)


@router.get("/me")
def whoami(request: Request, db: Session = Depends(get_db)):
    user: User | None = get_optional_user(request, db)
    return {"authenticated": bool(user), "email": user.email if user else None}
