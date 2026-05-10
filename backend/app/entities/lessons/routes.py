from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.context import build_template_context
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_optional_user
from backend.app.entities.localization.service import resolve_language
from backend.app.entities.localization.translations import translate
from backend.app.entities.comments.models import Comment
from backend.app.entities.lessons.service import get_lesson, list_lessons, to_embed_url

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/", response_class=HTMLResponse)
def lessons_page(request: Request, db: Session = Depends(get_db)):
    templates = request.app.state.templates
    current_user = get_optional_user(request, db)
    lessons = list_lessons(db)
    return templates.TemplateResponse(
        "lessons/list.html",
        build_template_context(request, current_user=current_user, lessons=lessons),
    )


@router.get("/{lesson_id}", response_class=HTMLResponse)
def lesson_detail(request: Request, lesson_id: int, db: Session = Depends(get_db)):
    templates = request.app.state.templates
    current_user = get_optional_user(request, db)
    lesson = get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("errors.lesson_not_found", resolve_language(request)),
        )

    comments = list(
        db.scalars(select(Comment).where(Comment.lesson_id == lesson.id).order_by(Comment.created_at.desc())).all()
    )
    embed_url = to_embed_url(lesson.youtube_url)
    return templates.TemplateResponse(
        "lessons/detail.html",
        build_template_context(
            request,
            current_user=current_user,
            lesson=lesson,
            comments=comments,
            embed_url=embed_url,
        ),
    )


@router.post("/{lesson_id}/comments")
def add_comment(
    request: Request,
    lesson_id: int,
    content: str = Form(...),
    db: Session = Depends(get_db),
):
    current_user = get_optional_user(request, db)
    if not current_user:
        return RedirectResponse(url="/auth/login", status_code=303)

    lesson = get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("errors.lesson_not_found", resolve_language(request)),
        )

    clean_content = content.strip()
    if clean_content:
        comment = Comment(content=clean_content, lesson_id=lesson.id, user_id=current_user.id)
        db.add(comment)
        db.commit()

    return RedirectResponse(url=f"/lessons/{lesson_id}", status_code=303)
