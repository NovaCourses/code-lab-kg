const PROGRESS_KEY = 'novacode.lessonProgress.v1'
const NOTES_KEY = 'novacode.lessonNotes.v1'
const DISCUSSIONS_KEY = 'novacode.lessonDiscussions.v1'
const QUIZZES_KEY = 'novacode.lessonQuizzes.v1'
const HISTORY_KEY = 'novacode.watchHistory.v1'

const nowIso = () => new Date().toISOString()

function readStore(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeStore(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function clamp(value, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function buildLessonVideoKey(lessonId, videoRef = 'main') {
  return `${lessonId}:${videoRef ?? 'main'}`
}

export function formatDuration(seconds = 0) {
  const normalized = Math.max(0, Math.round(seconds || 0))
  const minutes = Math.floor(normalized / 60)
  const rest = normalized % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function estimateLessonDuration(videoId, index = 0) {
  const seed = String(videoId || `lesson-${index}`)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return 420 + ((seed + index * 97) % 720)
}

export function getLessonDifficulty(index = 0) {
  return ['Beginner', 'Practice', 'Intermediate', 'Advanced'][index % 4]
}

export function getLessonXpReward(durationSeconds = 600, difficulty = 'Beginner') {
  const difficultyBoost = {
    Beginner: 10,
    Practice: 20,
    Intermediate: 35,
    Advanced: 50,
  }
  return Math.round(durationSeconds / 60) * 5 + (difficultyBoost[difficulty] || 15)
}

export function getProgressMap() {
  return readStore(PROGRESS_KEY, {})
}

export function getLessonProgress(progressKey) {
  return getProgressMap()[progressKey] || null
}

export function saveLessonProgress(progressKey, payload) {
  const store = getProgressMap()
  const previous = store[progressKey] || {}
  const progress = clamp(payload.progress ?? previous.progress ?? 0)
  const watchedSeconds = Math.max(
    previous.watchedSeconds || 0,
    Math.round(payload.watchedSeconds ?? previous.watchedSeconds ?? 0),
  )
  const completed = Boolean(payload.completed || previous.completed || progress >= 95)

  const record = {
    ...previous,
    ...payload,
    key: progressKey,
    progress,
    watchedSeconds,
    completed,
    watched: true,
    firstWatchedAt: previous.firstWatchedAt || nowIso(),
    completedAt: completed ? previous.completedAt || nowIso() : previous.completedAt || null,
    lastWatchedAt: nowIso(),
  }

  store[progressKey] = record
  writeStore(PROGRESS_KEY, store)
  pushWatchHistory(record)
  return record
}

export function getLessonAggregate(lessonId, progressKeys = []) {
  const store = getProgressMap()
  const matchingKeys = progressKeys.length
    ? progressKeys
    : Object.keys(store).filter((key) => key.startsWith(`${lessonId}:`))
  const records = matchingKeys.map((key) => store[key]).filter(Boolean)

  if (!matchingKeys.length) {
    return { progress: 0, completedCount: 0, totalCount: 0, completed: false, records: [] }
  }

  const progress = records.length
    ? records.reduce((sum, item) => sum + (item.progress || 0), 0) / matchingKeys.length
    : 0

  const completedCount = records.filter((item) => item.completed).length
  return {
    progress: clamp(progress),
    completedCount,
    totalCount: matchingKeys.length,
    completed: completedCount >= matchingKeys.length && matchingKeys.length > 0,
    records,
  }
}

function pushWatchHistory(record) {
  const history = readStore(HISTORY_KEY, [])
  const next = [
    record,
    ...history.filter((item) => item.key !== record.key),
  ].slice(0, 18)

  writeStore(HISTORY_KEY, next)
}

export function getWatchHistory(limit = 8) {
  return readStore(HISTORY_KEY, []).slice(0, limit)
}

export function getLessonNotes(progressKey) {
  const store = readStore(NOTES_KEY, {})
  return store[progressKey] || []
}

export function addLessonNote(progressKey, payload) {
  const store = readStore(NOTES_KEY, {})
  const note = {
    id: `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    content: payload.content?.trim() || 'Bookmark',
    timestampSeconds: Math.max(0, Math.round(payload.timestampSeconds || 0)),
    isBookmark: Boolean(payload.isBookmark),
    createdAt: nowIso(),
  }

  store[progressKey] = [note, ...(store[progressKey] || [])]
  writeStore(NOTES_KEY, store)
  return note
}

export function deleteLessonNote(progressKey, noteId) {
  const store = readStore(NOTES_KEY, {})
  store[progressKey] = (store[progressKey] || []).filter((note) => note.id !== noteId)
  writeStore(NOTES_KEY, store)
  return store[progressKey]
}

export function getDiscussionState(lessonId) {
  const store = readStore(DISCUSSIONS_KEY, {})
  return store[lessonId] || { likedCommentIds: [], likeCounts: {}, replies: {} }
}

export function toggleLocalCommentLike(lessonId, commentId) {
  const store = readStore(DISCUSSIONS_KEY, {})
  const state = getDiscussionState(lessonId)
  const id = String(commentId)
  const liked = state.likedCommentIds.includes(id)
  const likedCommentIds = liked
    ? state.likedCommentIds.filter((item) => item !== id)
    : [...state.likedCommentIds, id]
  const likeCounts = {
    ...state.likeCounts,
    [id]: Math.max(0, (state.likeCounts[id] || 0) + (liked ? -1 : 1)),
  }

  store[lessonId] = { ...state, likedCommentIds, likeCounts }
  writeStore(DISCUSSIONS_KEY, store)
  return store[lessonId]
}

export function addLocalReply(lessonId, commentId, content) {
  const clean = content.trim()
  if (!clean) return getDiscussionState(lessonId)

  const store = readStore(DISCUSSIONS_KEY, {})
  const state = getDiscussionState(lessonId)
  const id = String(commentId)
  const reply = {
    id: `reply-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    content: clean,
    author: 'You',
    createdAt: nowIso(),
  }

  store[lessonId] = {
    ...state,
    replies: {
      ...state.replies,
      [id]: [...(state.replies[id] || []), reply],
    },
  }
  writeStore(DISCUSSIONS_KEY, store)
  return store[lessonId]
}

export function getQuizResult(progressKey) {
  const store = readStore(QUIZZES_KEY, {})
  return store[progressKey] || null
}

export function saveQuizResult(progressKey, payload) {
  const store = readStore(QUIZZES_KEY, {})
  const result = { ...payload, completedAt: nowIso() }
  store[progressKey] = result
  writeStore(QUIZZES_KEY, store)
  return result
}

function dayKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function calculateStreak(records) {
  const activeDays = new Set(records.map((record) => dayKey(record.lastWatchedAt)).filter(Boolean))
  let streak = 0
  const cursor = new Date()

  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function deriveAchievements(totalLessons = 0) {
  const records = Object.values(getProgressMap())
  const completedLessonIds = new Set(records.filter((record) => record.completed).map((record) => record.lessonId))
  const watchedCount = records.length
  const completedLessons = completedLessonIds.size
  const streak = calculateStreak(records)

  return [
    {
      id: 'first-watch',
      title: 'First lesson watched',
      description: 'Start the learning loop.',
      progress: Math.min(watchedCount, 1),
      target: 1,
      unlocked: watchedCount >= 1,
    },
    {
      id: 'ten-lessons',
      title: '10 lessons watched',
      description: 'Build a real study rhythm.',
      progress: Math.min(watchedCount, 10),
      target: 10,
      unlocked: watchedCount >= 10,
    },
    {
      id: 'course-complete',
      title: 'Course completed',
      description: 'Finish every lesson in the track.',
      progress: Math.min(completedLessons, totalLessons || completedLessons),
      target: totalLessons || 1,
      unlocked: totalLessons > 0 && completedLessons >= totalLessons,
    },
    {
      id: 'streak',
      title: 'Learning streak',
      description: 'Return on consecutive days.',
      progress: Math.min(streak, 7),
      target: 7,
      unlocked: streak >= 7,
    },
  ]
}
