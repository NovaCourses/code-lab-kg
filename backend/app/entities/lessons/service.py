import re
from urllib.parse import parse_qs, unquote, urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.entities.lessons.models import Lesson

YOUTUBE_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
YOUTUBE_VIDEO_ID_ANYWHERE_RE = re.compile(r"[A-Za-z0-9_-]{11}")


def list_lessons(db: Session, include_unpublished: bool = False, category: str | None = None) -> list[Lesson]:
    query = select(Lesson).options(selectinload(Lesson.video_links)).order_by(Lesson.created_at.desc())
    if not include_unpublished:
        query = query.where(Lesson.is_published.is_(True))
    normalized_category = (category or "").strip().lower()
    if normalized_category:
        query = query.where(Lesson.category == normalized_category)
    return list(db.scalars(query).all())


def get_lesson(db: Session, lesson_id: int, include_unpublished: bool = False) -> Lesson | None:
    query = select(Lesson).options(selectinload(Lesson.video_links)).where(Lesson.id == lesson_id)
    if not include_unpublished:
        query = query.where(Lesson.is_published.is_(True))
    return db.scalar(query)


def _normalize_video_id(value: str | None) -> str | None:
    if not value:
        return None
    match = YOUTUBE_VIDEO_ID_ANYWHERE_RE.search(value.strip())
    return match.group(0) if match else None


def extract_youtube_video_id(url: str | None) -> str | None:
    if not url:
        return None

    raw = url.strip()
    if YOUTUBE_VIDEO_ID_RE.match(raw):
        return raw

    parsed = urlparse(raw)
    if not parsed.netloc and not parsed.scheme:
        parsed = urlparse(f"https://{raw}")

    host = parsed.netloc.lower().removeprefix("www.").removeprefix("m.")
    query = parse_qs(parsed.query)
    video_id = _normalize_video_id((query.get("v") or [""])[0])
    if video_id:
        return video_id

    nested_target = (query.get("u") or [""])[0]
    if nested_target:
        nested_id = extract_youtube_video_id(unquote(nested_target))
        if nested_id:
            return nested_id

    path_parts = [part for part in parsed.path.split("/") if part]
    if host == "youtu.be":
        return _normalize_video_id(path_parts[0] if path_parts else None)

    if "youtube.com" in host or "youtube-nocookie.com" in host:
        if path_parts and path_parts[0] in {"embed", "shorts", "live", "v", "e"}:
            return _normalize_video_id(path_parts[1] if len(path_parts) > 1 else None)

    fallback = re.search(
        r"(?:youtu\.be/|youtube(?:-nocookie)?\.com/(?:watch\?.*?v=|embed/|shorts/|live/|v/|e/))([A-Za-z0-9_-]{11})",
        raw,
    )
    return fallback.group(1) if fallback else None


def to_embed_url(url: str) -> str:
    video_id = extract_youtube_video_id(url)
    if video_id:
        return f"https://www.youtube.com/embed/{video_id}"
    return url
