"""
Video Lesson System Database Models & Migrations
Adds video progress tracking, notes, and bookmarks
"""

from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

# These models should be added to app/entities/lessons/models.py


class LessonProgress(Base):
    """Track user progress on lessons"""
    __tablename__ = "lesson_progress"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Progress tracking
    watched: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    watch_time_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_duration: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # Timestamps
    first_watched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_watched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="lesson_progress")
    lesson = relationship("Lesson", back_populates="user_progress")


class LessonNote(Base):
    """User notes and bookmarks for lessons"""
    __tablename__ = "lesson_notes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Note content
    content: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Video timestamp
    is_bookmark: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="lesson_notes")
    lesson = relationship("Lesson", back_populates="user_notes")


class LessonQuizCompletion(Base):
    """Track quiz completions for lessons"""
    __tablename__ = "lesson_quiz_completions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Quiz results
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Rewards
    xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    badge_earned: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    # Timestamps
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    user = relationship("User", back_populates="quiz_completions")
    lesson = relationship("Lesson", back_populates="quiz_completions")


class LessonAchievement(Base):
    """Learning achievements and badges"""
    __tablename__ = "lesson_achievements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Achievement info
    achievement_type: Mapped[str] = mapped_column(String(100), nullable=False)  # 'course_completed', 'lessons_watched_10', 'streak_7', etc
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str] = mapped_column(String(255), nullable=False)  # Emoji or icon name
    
    # Reward
    xp_reward: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    badge_color: Mapped[str] = mapped_column(String(50), default="gold")  # gold, silver, bronze, etc
    
    # Metadata
    progress: Mapped[int] = mapped_column(Integer, default=0)  # Current count towards achievement
    target: Mapped[int] = mapped_column(Integer, default=1)  # Target count
    unlocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="achievements")


# Update User model relationships
# Add these to the User model in app/entities/users/models.py:
"""
lesson_progress = relationship("LessonProgress", back_populates="user", cascade="all, delete-orphan")
lesson_notes = relationship("LessonNote", back_populates="user", cascade="all, delete-orphan")
quiz_completions = relationship("LessonQuizCompletion", back_populates="user", cascade="all, delete-orphan")
achievements = relationship("LessonAchievement", back_populates="user", cascade="all, delete-orphan")
"""

# Update Lesson model relationships
# Add these to the Lesson model in app/entities/lessons/models.py:
"""
user_progress = relationship("LessonProgress", back_populates="lesson", cascade="all, delete-orphan")
user_notes = relationship("LessonNote", back_populates="lesson", cascade="all, delete-orphan")
quiz_completions = relationship("LessonQuizCompletion", back_populates="lesson", cascade="all, delete-orphan")
"""


# SQL Migration Script
MIGRATION_SQL = """
-- Create lesson progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    watched BOOLEAN NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT 0,
    watch_time_seconds INTEGER NOT NULL DEFAULT 0,
    total_duration INTEGER NOT NULL DEFAULT 0,
    progress_percentage REAL NOT NULL DEFAULT 0.0,
    first_watched_at DATETIME,
    completed_at DATETIME,
    last_watched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE(user_id, lesson_id)
);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_watched ON lesson_progress(watched, completed);

-- Create lesson notes table
CREATE TABLE IF NOT EXISTS lesson_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    timestamp_seconds INTEGER NOT NULL DEFAULT 0,
    is_bookmark BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);
CREATE INDEX idx_lesson_notes_user_lesson ON lesson_notes(user_id, lesson_id);

-- Create lesson quiz completion table
CREATE TABLE IF NOT EXISTS lesson_quiz_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 100,
    passed BOOLEAN NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    badge_earned VARCHAR(100),
    completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);
CREATE INDEX idx_quiz_completions_user ON lesson_quiz_completions(user_id);
CREATE INDEX idx_quiz_completions_lesson ON lesson_quiz_completions(lesson_id);

-- Create lesson achievements table
CREATE TABLE IF NOT EXISTS lesson_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(255) NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    badge_color VARCHAR(50) NOT NULL DEFAULT 'gold',
    progress INTEGER DEFAULT 0,
    target INTEGER NOT NULL DEFAULT 1,
    unlocked BOOLEAN NOT NULL DEFAULT 0,
    unlocked_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_achievements_user ON lesson_achievements(user_id);
CREATE INDEX idx_achievements_unlocked ON lesson_achievements(unlocked);
"""
