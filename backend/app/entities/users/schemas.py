from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserStats(BaseModel):
    xp: int
    level: int
    current_streak: int
    longest_streak: int
    total_activities: int

    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool
    preferred_language: str
    xp: int
    level: int
    current_streak: int
    longest_streak: int
    last_activity_date: datetime | None = None
    total_activities: int
    created_at: datetime

    class Config:
        from_attributes = True
