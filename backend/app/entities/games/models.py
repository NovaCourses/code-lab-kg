from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    title_en: Mapped[str] = mapped_column(String(255), nullable=False)
    title_ru: Mapped[str] = mapped_column(String(255), nullable=False)
    description_en: Mapped[str] = mapped_column(Text, nullable=False)
    description_ru: Mapped[str] = mapped_column(Text, nullable=False)
    engine: Mapped[str] = mapped_column(String(50), default="external", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    setting = relationship("GameSetting", back_populates="game", uselist=False, cascade="all, delete-orphan")
    questions = relationship(
        "GameQuestion",
        back_populates="game",
        cascade="all, delete-orphan",
        order_by="GameQuestion.position.asc(), GameQuestion.id.asc()",
    )

    def localized_title(self, lang: str) -> str:
        return self.title_ru if lang == "ru" else self.title_en

    def localized_description(self, lang: str) -> str:
        return self.description_ru if lang == "ru" else self.description_en

    def __str__(self) -> str:
        return self.title_ru or self.title_en


class GameScore(Base):
    __tablename__ = "game_scores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    game_slug: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    user = relationship("User", back_populates="game_scores")

    def __str__(self) -> str:
        return f"{self.game_slug}: {self.score}"


class GameSetting(Base):
    __tablename__ = "game_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    game = relationship("Game", back_populates="setting")

    def __str__(self) -> str:
        return f"Settings for {self.game_id}"


class GameQuestion(Base):
    __tablename__ = "game_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    prompt_en: Mapped[str] = mapped_column(String(500), nullable=False)
    prompt_ru: Mapped[str] = mapped_column(String(500), nullable=False)
    code_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    options_en_json: Mapped[str] = mapped_column(Text, nullable=False)
    options_ru_json: Mapped[str] = mapped_column(Text, nullable=False)
    correct_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    game = relationship("Game", back_populates="questions")

    def localized_prompt(self, lang: str) -> str:
        return self.prompt_ru if lang == "ru" else self.prompt_en

    def localized_options_json(self, lang: str) -> str:
        return self.options_ru_json if lang == "ru" else self.options_en_json

    def __str__(self) -> str:
        return f"Q{self.position} for game {self.game_id}"
