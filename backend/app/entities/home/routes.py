from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from backend.app.core.context import build_template_context
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_optional_user
from backend.app.entities.lessons.service import list_lessons
from backend.app.entities.tasks.service import list_tasks

router = APIRouter(tags=["home"])


@router.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    templates = request.app.state.templates
    current_user = get_optional_user(request, db)
    lessons = list_lessons(db)[:3]
    tasks = list_tasks(db)[:3]
    return templates.TemplateResponse(
        "index.html",
        build_template_context(request, current_user=current_user, lessons=lessons, tasks=tasks),
    )
