from datetime import datetime, date

from sqlalchemy import Boolean, DateTime, String, Integer, Date, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        # Composite indexes for common queries
        Index("ix_user_is_admin_xp", "is_admin", "xp"),
        Index("ix_user_is_active_created", "is_active", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="user", index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    
    # XP & Gamification System
    xp: Mapped[int] = mapped_column(Integer, default=0, index=True, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True, nullable=False)

    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    submissions = relationship("TaskSubmission", back_populates="user", cascade="all, delete-orphan")
    game_scores = relationship("GameScore", back_populates="user", cascade="all, delete-orphan")
    user_activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")

    @property
    def level(self) -> int:
        """Calculate level based on XP"""
        if self.xp < 200:
            return 1
        elif self.xp < 500:
            return 2
        elif self.xp < 1000:
            return 3
        elif self.xp < 2000:
            return 4
        elif self.xp < 3500:
            return 5
        else:
            return 6 + (self.xp - 3500) // 2000

    def __str__(self) -> str:
        return f"{self.full_name} ({self.email})"


class UserActivity(Base):
    __tablename__ = "user_activities"
    __table_args__ = (
        Index("ix_useractivity_user_created", "user_id", "created_at"),
        Index("ix_useractivity_activity_type_created", "activity_type", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # lesson_view, task_solved, game_played, daily_login
    xp_gained: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True, nullable=False)

    user = relationship("User", back_populates="user_activities")

    def __str__(self) -> str:
        return f"{self.activity_type} ({self.xp_gained} XP)"
