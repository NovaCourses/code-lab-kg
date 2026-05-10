from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    title_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title_ru: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    youtube_url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(30), default="beginner", nullable=False)
    duration: Mapped[str | None] = mapped_column(String(30), nullable=True)
    xp_reward: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    comments = relationship("Comment", back_populates="lesson", cascade="all, delete-orphan")
    video_links = relationship(
        "LessonVideoLink",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LessonVideoLink.position.asc(), LessonVideoLink.id.asc()",
    )

    def localized_title(self, lang: str) -> str:
        if lang == "ru" and self.title_ru:
            return self.title_ru
        if lang == "en" and self.title_en:
            return self.title_en
        return self.title_en or self.title

    def localized_description(self, lang: str) -> str:
        if lang == "ru" and self.description_ru:
            return self.description_ru
        if lang == "en" and self.description_en:
            return self.description_en
        return self.description_en or self.description

    def __str__(self) -> str:
        return self.title_ru or self.title_en or self.title


class LessonVideoLink(Base):
    __tablename__ = "lesson_video_links"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title_en: Mapped[str] = mapped_column(String(255), nullable=False)
    title_ru: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)

    lesson = relationship("Lesson", back_populates="video_links")

    def localized_title(self, lang: str) -> str:
        if lang == "ru" and self.title_ru:
            return self.title_ru
        if lang == "en" and self.title_en:
            return self.title_en
        return self.title_en or self.title_ru

    def __str__(self) -> str:
        return self.title_ru or self.title_en or self.url
