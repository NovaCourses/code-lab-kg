# Admin API

This folder keeps one short index for the admin API plus one detailed reference.

## Files

- `backend/app/api/admin.py` - real backend implementation.
- `ADMIN_API_DOCUMENTATION.md` - full endpoint documentation.
- `README_ADMIN_API.md` - this short overview.

## Main Routes

Dashboard:

```txt
GET /api/admin/dashboard/stats
GET /api/admin/dashboard/users
GET /api/admin/dashboard/courses
```

Users:

```txt
GET    /api/admin/users
GET    /api/admin/users/{user_id}
PATCH  /api/admin/users/{user_id}
POST   /api/admin/users/{user_id}/ban
POST   /api/admin/users/{user_id}/unban
DELETE /api/admin/users/{user_id}
```

Courses:

```txt
GET    /api/admin/courses
POST   /api/admin/courses
PATCH  /api/admin/courses/{course_id}
DELETE /api/admin/courses/{course_id}
```

Analytics:

```txt
GET /api/admin/analytics/daily-activity
GET /api/admin/analytics/retention
GET /api/admin/analytics/lessons
GET /api/admin/analytics/games
```

For request and response details, read `ADMIN_API_DOCUMENTATION.md`.
