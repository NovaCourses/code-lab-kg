from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    title_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title_ru: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(50), default="easy", nullable=False)
    hint_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    hint_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    xp_reward: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    solution_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution_keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    submissions = relationship("TaskSubmission", back_populates="task", cascade="all, delete-orphan")

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

    def localized_hint(self, lang: str) -> str:
        if lang == "ru" and self.hint_ru:
            return self.hint_ru
        if lang == "en" and self.hint_en:
            return self.hint_en
        return self.hint_en or self.hint_ru or ""

    def __str__(self) -> str:
        return self.title_ru or self.title_en or self.title


class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    task = relationship("Task", back_populates="submissions")
    user = relationship("User", back_populates="submissions")

    def __str__(self) -> str:
        result = "OK" if self.is_correct else "FAIL"
        return f"Submission #{self.id or 'new'} | task_id={self.task_id} | user_id={self.user_id} | {result}"
