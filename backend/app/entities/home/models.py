from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class HomeSliderItem(Base):
    __tablename__ = "home_slider_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    position: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    title_en: Mapped[str] = mapped_column(String(255), nullable=False)
    title_ru: Mapped[str] = mapped_column(String(255), nullable=False)
    description_en: Mapped[str] = mapped_column(Text, nullable=False)
    description_ru: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    target_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    def localized_title(self, lang: str) -> str:
        return self.title_ru if lang == "ru" else self.title_en

    def localized_description(self, lang: str) -> str:
        return self.description_ru if lang == "ru" else self.description_en

    def __str__(self) -> str:
        return self.title_ru or self.title_en
