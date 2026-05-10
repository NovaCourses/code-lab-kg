from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.context import build_template_context
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_optional_user
from backend.app.entities.localization.service import resolve_language
from backend.app.entities.localization.translations import translate
from backend.app.entities.games.models import GameScore

router = APIRouter(prefix="/games", tags=["games"])

GAMES = {
    "binary-blitz": {
        "title_key": "games.binary_blitz.title",
        "description_key": "games.binary_blitz.description",
    },
    "bug-hunt": {
        "title_key": "games.bug_hunt.title",
        "description_key": "games.bug_hunt.description",
    },
}


@router.get("/", response_class=HTMLResponse)
def games_page(request: Request, db: Session = Depends(get_db)):
    templates = request.app.state.templates
    current_user = get_optional_user(request, db)
    return templates.TemplateResponse(
        "games/list.html",
        build_template_context(request, current_user=current_user, games=GAMES),
    )


@router.get("/{game_slug}", response_class=HTMLResponse)
def game_detail(request: Request, game_slug: str, db: Session = Depends(get_db)):
    templates = request.app.state.templates
    current_user = get_optional_user(request, db)
    if game_slug not in GAMES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("errors.game_not_found", resolve_language(request)),
        )

    leaderboard = list(
        db.scalars(
            select(GameScore)
            .where(GameScore.game_slug == game_slug)
            .order_by(GameScore.score.desc(), GameScore.created_at.asc())
            .limit(10)
        ).all()
    )
    return templates.TemplateResponse(
        "games/detail.html",
        build_template_context(
            request,
            current_user=current_user,
            game_slug=game_slug,
            game=GAMES[game_slug],
            leaderboard=leaderboard,
        ),
    )


@router.post("/{game_slug}/score")
def submit_score(
    request: Request,
    game_slug: str,
    score: int = Form(...),
    db: Session = Depends(get_db),
):
    if game_slug not in GAMES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=translate("errors.game_not_found", resolve_language(request)),
        )

    current_user = get_optional_user(request, db)
    if not current_user:
        return JSONResponse({"ok": False, "error": "auth_required"}, status_code=status.HTTP_401_UNAUTHORIZED)

    game_score = GameScore(game_slug=game_slug, score=max(0, score), user_id=current_user.id)
    db.add(game_score)
    db.commit()
    return {"ok": True}
