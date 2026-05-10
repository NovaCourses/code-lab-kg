from pathlib import Path
import shutil
import subprocess
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware

from app.admin.panel import setup_admin
from app.api.routes import api_router, oauth_router
from app.api.admin import admin_router
from app.bootstrap import bootstrap
from app.core.config import settings
from app.entities.auth.oauth import build_oauth

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_REACT_DIR = PROJECT_ROOT / "frontend_react"
SPA_DIR = FRONTEND_REACT_DIR / "dist"
ASSETS_DIR = SPA_DIR / "assets"
ADMIN_TEMPLATES_DIR = Path(__file__).resolve().parent / "admin_templates"
ADMIN_STATIC_DIR = Path(__file__).resolve().parent / "admin_static"
ADMIN_JINJA_TEMPLATES = Jinja2Templates(directory=str(ADMIN_TEMPLATES_DIR))
SPA_EXCLUDED_PREFIXES = ("api", "auth", "admin", "docs", "redoc")
SPA_EXCLUDED_PATHS = {"openapi.json"}
FRONTEND_SOURCE_PATHS = (
    "package.json",
    "package-lock.json",
    "index.html",
    "vite.config.js",
    "src",
    "public",
)


def _ensure_spa_exists() -> Path:
    index_file = SPA_DIR / "index.html"

    if not index_file.exists():
        try:
            ensure_frontend_build_current()
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not index_file.exists():
        raise HTTPException(
            status_code=503,
            detail="Frontend build not found. Install Node.js/npm and restart backend.",
        )

    return index_file


def _newest_mtime(path: Path) -> float:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_mtime

    newest = path.stat().st_mtime
    for child in path.rglob("*"):
        if child.is_file():
            newest = max(newest, child.stat().st_mtime)
    return newest


def _frontend_needs_build() -> tuple[bool, str]:
    package_json = FRONTEND_REACT_DIR / "package.json"
    index_file = SPA_DIR / "index.html"

    if not package_json.exists():
        raise RuntimeError(f"Frontend package.json was not found at {package_json}")

    if not index_file.exists():
        return True, "frontend_react/dist/index.html is missing"

    build_mtime = index_file.stat().st_mtime
    newest_source = 0
    newest_source_name = ""

    for relative_path in FRONTEND_SOURCE_PATHS:
        source_path = FRONTEND_REACT_DIR / relative_path
        source_mtime = _newest_mtime(source_path)
        if source_mtime > newest_source:
            newest_source = source_mtime
            newest_source_name = relative_path

    if newest_source > build_mtime:
        return True, f"frontend source `{newest_source_name}` is newer than dist/index.html"

    return False, "frontend build is current"


def _dependencies_need_install() -> bool:
    node_modules = FRONTEND_REACT_DIR / "node_modules"
    if not node_modules.exists():
        return True

    package_lock = FRONTEND_REACT_DIR / "package-lock.json"
    node_modules_lock = node_modules / ".package-lock.json"
    if package_lock.exists() and (
        not node_modules_lock.exists()
        or package_lock.stat().st_mtime > node_modules_lock.stat().st_mtime
    ):
        return True

    return False


def _run_npm_command(args: list[str]) -> None:
    npm_command = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm_command:
        raise RuntimeError(
            "npm was not found. Install Node.js, then restart backend so NovaCode can build frontend_react/dist."
        )

    print(f"Running frontend command: npm {' '.join(args)}")
    try:
        subprocess.run([npm_command, *args], cwd=FRONTEND_REACT_DIR, check=True)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"Frontend command failed: npm {' '.join(args)}") from exc


def ensure_frontend_build_current() -> None:
    needs_build, reason = _frontend_needs_build()
    if not needs_build:
        print(f"Frontend build check: {reason}")
        return

    print(f"Frontend build check: {reason}. Building fresh frontend for http://127.0.0.1:8000/")
    if _dependencies_need_install() or not (SPA_DIR / "index.html").exists():
        _run_npm_command(["install"])
    _run_npm_command(["run", "build"])


def _spa_index_response() -> FileResponse:
    response = FileResponse(_ensure_spa_exists(), media_type="text/html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


def _is_spa_excluded_path(path: str) -> bool:
    normalized = path.strip("/")
    if not normalized:
        return False
    if normalized in SPA_EXCLUDED_PATHS:
        return True
    return normalized.split("/", 1)[0] in SPA_EXCLUDED_PREFIXES


def _admin_redirect_target(request: Request) -> str:
    next_url = request.query_params.get("next") or "/admin/"
    if not next_url.startswith("/admin"):
        return "/admin/"
    return next_url


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ================= MIDDLEWARE =================

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.secret_key,
        same_site="lax",
        https_only=False,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ================= OAUTH =================

    app.state.oauth = build_oauth()

    # ================= STATIC =================

    app.mount(
        "/assets",
        StaticFiles(directory=str(ASSETS_DIR), check_dir=False),
        name="assets",
    )
    app.mount(
        "/admin-static",
        StaticFiles(directory=str(ADMIN_STATIC_DIR), check_dir=False),
        name="admin_static",
    )

    # ================= ROUTERS =================

    app.include_router(api_router)
    app.include_router(oauth_router)
    app.include_router(admin_router)

    # ================= ADMIN =================

    @app.get("/admin", include_in_schema=False)
    async def admin_slash_redirect():
        return RedirectResponse(
            url="/admin/",
            status_code=307,
        )

    @app.get("/admin/language/{lang}", include_in_schema=False)
    async def admin_language(lang: str, request: Request):
        if lang in settings.supported_languages_list:
            request.session["language"] = lang
        return RedirectResponse(url=_admin_redirect_target(request), status_code=303)

    @app.get("/admin/theme/{theme}", include_in_schema=False)
    async def admin_theme(theme: str, request: Request):
        if theme in {"light", "dark"}:
            request.session["admin_theme"] = theme
        return RedirectResponse(url=_admin_redirect_target(request), status_code=303)

    @app.get("/admin/visual-editor", include_in_schema=False)
    async def admin_visual_editor(request: Request):
        admin_instance = getattr(app.state, "admin_instance", None)
        auth_backend = getattr(admin_instance, "authentication_backend", None)
        if auth_backend and not await auth_backend.authenticate(request):
            return RedirectResponse(url="/admin/login", status_code=303)

        return ADMIN_JINJA_TEMPLATES.TemplateResponse(
            request,
            "sqladmin/visual_editor.html",
            {
                "admin": admin_instance,
                "title": "Visual editor",
                "subtitle": "Theme, homepage, media and live preview",
            },
        )

    setup_admin(app, templates_dir=str(ADMIN_TEMPLATES_DIR))

    # ================= STARTUP =================

    @app.on_event("startup")
    async def startup_event():
        print("NovaCourses backend started")
        ensure_frontend_build_current()
        print(f"Serving frontend build from {SPA_DIR}")
        bootstrap()

    # ================= LOGGING =================

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()

        response = await call_next(request)

        process_time = round(time.time() - start_time, 3)

        print(
            f"{request.method} | "
            f"{request.url.path} | "
            f"{response.status_code} | "
            f"{process_time}s"
        )

        return response

    # ================= CACHE HEADERS =================

    @app.middleware("http")
    async def add_cache_headers(request: Request, call_next):
        response = await call_next(request)
        
        if request.url.path.startswith("/assets/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif request.url.path.startswith("/admin-static/"):
            response.headers["Cache-Control"] = "public, max-age=3600"
        elif request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        elif request.url.path in ["/sitemap.xml", "/robots.txt"]:
            response.headers["Cache-Control"] = "public, max-age=604800"
        elif request.url.path.startswith("/admin") or request.url.path.startswith("/auth"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        elif request.url.path == "/" or response.headers.get("content-type", "").startswith("text/html"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        return response

    # ================= ERROR HANDLER =================

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal Server Error",
                "detail": str(exc),
            },
        )

    # ================= FRONTEND =================

    @app.get("/", include_in_schema=False)
    async def spa_index():
        return _spa_index_response()

    @app.get("/robots.txt", include_in_schema=False)
    async def robots_txt():
        """Serve robots.txt for SEO"""
        content = """User-agent: *
Allow: /
Allow: /dashboard
Allow: /lessons
Allow: /tasks
Allow: /games
Disallow: /admin
Disallow: /admin/
Disallow: /api
Disallow: /auth

Sitemap: https://novacode.dev/sitemap.xml
"""
        return PlainTextResponse(content)

    @app.get("/sitemap.xml", include_in_schema=False)
    async def sitemap_xml():
        """Serve sitemap.xml for SEO"""
        sitemap = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://novacode.dev/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://novacode.dev/dashboard</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://novacode.dev/lessons</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://novacode.dev/tasks</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://novacode.dev/games</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>"""
        return Response(content=sitemap, media_type="application/xml")


    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        if _is_spa_excluded_path(full_path):
            raise HTTPException(status_code=404)

        direct_file = SPA_DIR / full_path

        if direct_file.is_file():
            return FileResponse(direct_file)

        return _spa_index_response()

    return app


app = create_app()
