from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from backend.app.core.context import build_template_context
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_optional_user
from backend.app.entities.localization.service import resolve_language
from backend.app.entities.localization.translations import translate
from backend.app.entities.tasks.service import (
    get_task,
    get_user_submissions_for_task,
    list_tasks,
    submit_answer,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_class=HTMLResponse)
def tasks_page(request: Request, db: Session = Depends(get_db)):
    templates = request.app.state.templates
    current_user = get_optional_user(request, db)
    tasks = list_tasks(db)
    return templates.TemplateResponse(
        "tasks/list.html",
        build_template_context(request, current_user=current_user, tasks=tasks),
    )


@router.get("/{task_id}", response_class=HTMLResponse)
def task_detail(request: Request, task_id: int, db: Session = Depends(get_db)):
    templates = request.app.state.templates
    current_user = get_optional_user(request, db)
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("errors.task_not_found", resolve_language(request)),
        )

    submissions = []
    if current_user:
        submissions = get_user_submissions_for_task(db, task_id=task.id, user_id=current_user.id)

    return templates.TemplateResponse(
        "tasks/detail.html",
        build_template_context(
            request,
            current_user=current_user,
            task=task,
            submissions=submissions,
            result=request.query_params.get("result"),
        ),
    )


@router.post("/{task_id}/submit")
def submit_task(
    request: Request,
    task_id: int,
    answer: str = Form(...),
    db: Session = Depends(get_db),
):
    current_user = get_optional_user(request, db)
    if not current_user:
        return RedirectResponse(url="/auth/login", status_code=303)

    task = get_task(db, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("errors.task_not_found", resolve_language(request)),
        )

    submission = submit_answer(db, task=task, user_id=current_user.id, answer=answer)
    result = "correct" if submission.is_correct else "incorrect"
    return RedirectResponse(url=f"/tasks/{task_id}?result={result}", status_code=303)
