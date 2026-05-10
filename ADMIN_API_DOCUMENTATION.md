# Admin API Documentation

## Overview

The Admin API module provides comprehensive administrative endpoints for managing users, courses, and analyzing platform analytics. All endpoints require admin authentication (user must have `is_admin=True`).

## Base URL

```
/api/admin
```

## Authentication

All admin endpoints require the user to be authenticated and have admin privileges. The authentication is checked via session middleware and the `require_admin` dependency.

**Error Response (Non-Admin):**
```json
{
  "detail": "Admin access required"
}
```
HTTP Status: `403 Forbidden`

## Response Format

All endpoints return a standardized response format:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "error": null
}
```

On error:
```json
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

---

# Dashboard Endpoints

## 1. Get Dashboard Statistics

**Endpoint:** `GET /api/admin/dashboard/stats`

Returns overall platform statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 150,
    "active_users_count": 87,
    "total_xp": 45230,
    "avg_user_xp": 301.53
  }
}
```

**Response Fields:**
- `total_users` (int): Total number of registered users
- `active_users_count` (int): Number of active users
- `total_xp` (int): Total XP earned across all users
- `avg_user_xp` (float): Average XP per user

---

## 2. Get Top Users

**Endpoint:** `GET /api/admin/dashboard/users`

Returns the top 10 users ranked by total XP earned.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "xp": 5240,
      "level": 5,
      "current_streak": 12
    },
    ...
  ]
}
```

**Response Fields:**
- `id` (int): User ID
- `email` (str): User email address
- `full_name` (str): User's full name
- `xp` (int): Total XP earned
- `level` (int): Current level (calculated from XP)
- `current_streak` (int): Current activity streak

---

## 3. Get Course Statistics

**Endpoint:** `GET /api/admin/dashboard/courses`

Returns statistics about lessons, tasks, and games on the platform.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_lessons": 25,
    "total_tasks": 42,
    "total_games": 8,
    "avg_lesson_completion": 73.45
  }
}
```

**Response Fields:**
- `total_lessons` (int): Total number of lessons
- `total_tasks` (int): Total number of tasks
- `total_games` (int): Total number of games
- `avg_lesson_completion` (float): Average task completion rate (percentage)

---

# User Management Endpoints

## 4. List All Users (Paginated)

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `page` (int, default=1): Page number (1-indexed)
- `limit` (int, default=10, max=100): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "full_name": "John Doe",
        "xp": 1240,
        "level": 3,
        "current_streak": 5,
        "longest_streak": 12,
        "is_admin": false,
        "is_active": true,
        "created_at": "2024-01-15T10:30:00"
      },
      ...
    ],
    "total": 150,
    "page": 1,
    "limit": 10,
    "pages": 15
  }
}
```

---

## 5. Get User Details

**Endpoint:** `GET /api/admin/users/{user_id}`

**Path Parameters:**
- `user_id` (int): User ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "xp": 1240,
    "level": 3,
    "current_streak": 5,
    "longest_streak": 12,
    "is_admin": false,
    "is_active": true,
    "preferred_language": "en",
    "created_at": "2024-01-15T10:30:00",
    "last_activity_date": "2024-01-20T14:22:00"
  }
}
```

---

## 6. Update User

**Endpoint:** `PATCH /api/admin/users/{user_id}`

**Path Parameters:**
- `user_id` (int): User ID

**Request Body:**
```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "xp": 2000,
  "is_admin": true
}
```

**All fields are optional.**

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "xp": 2000,
    "is_admin": true
  }
}
```

**Validation:**
- `full_name`: 2-255 characters
- `email`: Valid email format (must be unique if changed)
- `xp`: Non-negative integer
- `is_admin`: Boolean

---

## 7. Ban User

**Endpoint:** `POST /api/admin/users/{user_id}/ban`

Deactivates a user account (sets `is_active=false`).

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "User user@example.com has been banned"
  }
}
```

**Restrictions:**
- Cannot ban yourself
- User must exist

---

## 8. Unban User

**Endpoint:** `POST /api/admin/users/{user_id}/unban`

Reactivates a banned user account (sets `is_active=true`).

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "User user@example.com has been unbanned"
  }
}
```

---

## 9. Delete User

**Endpoint:** `DELETE /api/admin/users/{user_id}`

Permanently deletes a user account and all associated data.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "User user@example.com has been deleted"
  }
}
```

**Restrictions:**
- Cannot delete yourself
- User must exist

---

# Course Management Endpoints

## 10. List Courses (Paginated)

**Endpoint:** `GET /api/admin/courses`

**Query Parameters:**
- `page` (int, default=1): Page number
- `limit` (int, default=10, max=100): Items per page
- `course_type` (str, optional): Filter by type ("lesson", "task", or "game")

**Response:**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": 1,
        "title": "Python Basics",
        "type": "lesson",
        "created_at": "2024-01-10T08:00:00"
      },
      {
        "id": 1,
        "title": "Debug the Bug",
        "type": "task",
        "created_at": "2024-01-12T08:00:00"
      },
      {
        "id": 1,
        "title": "Quiz Arena",
        "type": "game",
        "created_at": "2024-01-14T08:00:00"
      },
      ...
    ],
    "total": 75,
    "page": 1,
    "limit": 10,
    "pages": 8
  }
}
```

---

## 11. Create Course

**Endpoint:** `POST /api/admin/courses`

**Request Body:**
```json
{
  "title": "Advanced Python",
  "description": "Learn advanced Python concepts and best practices",
  "type": "lesson"
}
```

**Request Fields:**
- `title` (str, required): Course title (1-255 characters)
- `description` (str, required): Course description
- `type` (str, default="lesson"): Type of course ("lesson", "task", or "game")

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "type": "lesson",
    "message": "Lesson created successfully"
  }
}
```

---

## 12. Update Course

**Endpoint:** `PATCH /api/admin/courses/{course_id}`

**Path Parameters:**
- `course_id` (int): Course ID

**Query Parameters:**
- `course_type` (str, default="lesson"): Type of course ("lesson", "task", or "game")

**Request Body:**
```json
{
  "title": "Advanced Python 2024",
  "description": "Updated description with new content"
}
```

**All fields are optional.**

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Lesson updated successfully"
  }
}
```

---

## 13. Delete Course

**Endpoint:** `DELETE /api/admin/courses/{course_id}`

**Path Parameters:**
- `course_id` (int): Course ID

**Query Parameters:**
- `course_type` (str, default="lesson"): Type of course ("lesson", "task", or "game")

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Lesson deleted successfully"
  }
}
```

---

# Analytics Endpoints

## 14. Daily Activity

**Endpoint:** `GET /api/admin/analytics/daily-activity`

Returns daily activity metrics for the last N days.

**Query Parameters:**
- `days` (int, default=30, range=1-90): Number of days to retrieve

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-20",
      "active_users": 45,
      "total_xp_gained": 2340,
      "lessons_viewed": 78,
      "tasks_submitted": 34,
      "games_played": 12
    },
    {
      "date": "2024-01-21",
      "active_users": 52,
      "total_xp_gained": 2810,
      "lessons_viewed": 89,
      "tasks_submitted": 41,
      "games_played": 15
    },
    ...
  ]
}
```

**Response Fields:**
- `date` (str): Date in ISO format
- `active_users` (int): Number of active users on that date
- `total_xp_gained` (int): Total XP earned on that date
- `lessons_viewed` (int): Number of lesson views
- `tasks_submitted` (int): Number of task submissions
- `games_played` (int): Number of game plays

---

## 15. User Retention Metrics

**Endpoint:** `GET /api/admin/analytics/retention`

Returns user retention metrics based on a 30-day cohort.

**Response:**
```json
{
  "success": true,
  "data": {
    "day_1_retention": 85.5,
    "day_7_retention": 62.3,
    "day_30_retention": 42.1,
    "returning_users": 156
  }
}
```

**Response Fields:**
- `day_1_retention` (float): Percentage of users active on day 1 (%)
- `day_7_retention` (float): Percentage of users active by day 7 (%)
- `day_30_retention` (float): Percentage of users active by day 30 (%)
- `returning_users` (int): Absolute count of returning users

---

## 16. Lesson Completion Statistics

**Endpoint:** `GET /api/admin/analytics/lessons`

Returns completion statistics for lessons.

**Query Parameters:**
- `limit` (int, default=10, range=1-50): Number of lessons to retrieve

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "lesson_id": 1,
      "title": "Python Basics",
      "total_views": 234,
      "unique_users": 189
    },
    {
      "lesson_id": 2,
      "title": "Advanced Functions",
      "total_views": 156,
      "unique_users": 124
    },
    ...
  ]
}
```

**Response Fields:**
- `lesson_id` (int): Lesson ID
- `title` (str): Lesson title
- `total_views` (int): Total number of times viewed
- `unique_users` (int): Number of unique users who viewed

---

## 17. Game Play Statistics

**Endpoint:** `GET /api/admin/analytics/games`

Returns play statistics for games.

**Query Parameters:**
- `limit` (int, default=10, range=1-50): Number of games to retrieve

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "game_slug": "quiz-arena",
      "title": "Quiz Arena",
      "total_plays": 456,
      "unique_players": 312,
      "avg_score": 78.5
    },
    {
      "game_slug": "bug-hunt",
      "title": "Bug Hunt",
      "total_plays": 234,
      "unique_players": 187,
      "avg_score": 65.2
    },
    ...
  ]
}
```

**Response Fields:**
- `game_slug` (str): Unique game identifier
- `title` (str): Game title
- `total_plays` (int): Total number of game plays
- `unique_players` (int): Number of unique players
- `avg_score` (float): Average score achieved

---

## Error Handling

All endpoints handle errors gracefully and return appropriate HTTP status codes:

- `200 OK`: Successful request
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User is not an admin
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

**Error Response Example:**
```json
{
  "success": false,
  "data": null,
  "error": "User not found"
}
```

---

## Usage Examples

### Example 1: Get Dashboard Stats
```bash
curl -X GET "http://localhost:8000/api/admin/dashboard/stats" \
  -H "Cookie: session=<session_id>"
```

### Example 2: List Users with Pagination
```bash
curl -X GET "http://localhost:8000/api/admin/users?page=2&limit=20" \
  -H "Cookie: session=<session_id>"
```

### Example 3: Update User
```bash
curl -X PATCH "http://localhost:8000/api/admin/users/5" \
  -H "Cookie: session=<session_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "xp": 5000,
    "is_admin": true
  }'
```

### Example 4: Ban a User
```bash
curl -X POST "http://localhost:8000/api/admin/users/7/ban" \
  -H "Cookie: session=<session_id>"
```

### Example 5: Get Daily Activity Analytics
```bash
curl -X GET "http://localhost:8000/api/admin/analytics/daily-activity?days=7" \
  -H "Cookie: session=<session_id>"
```

---

## Security Considerations

1. **Admin-Only Access**: All endpoints require the user to have `is_admin=True`
2. **Session-Based Authentication**: Uses FastAPI session middleware for authentication
3. **Self-Protection**: Admins cannot ban or delete themselves
4. **Input Validation**: All inputs are validated using Pydantic models
5. **SQL Injection Prevention**: Uses SQLAlchemy ORM with parameterized queries

---

## Rate Limiting

Currently, the admin API does not implement rate limiting. Consider adding rate limiting for production environments.

---

## Pagination

Paginated endpoints return:
- `total`: Total number of items
- `page`: Current page number
- `limit`: Items per page
- `pages`: Total number of pages

**Example:**
```json
{
  "total": 150,
  "page": 1,
  "limit": 10,
  "pages": 15
}
```

---

## Notes

- All timestamps are in ISO 8601 format with UTC timezone
- XP calculations are based on user activities (lessons, tasks, games)
- User levels are calculated from total XP using exponential scaling
- Analytics are computed in real-time from the database
- Deletion is permanent and cascades to related records
