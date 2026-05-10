import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Award, Clock3, Flame, PlayCircle, Sparkles, Zap } from 'lucide-react'
import { apiGet } from '../api'
import { useAppContext } from '../contexts'
import { extractYoutubeVideoId, getYoutubeThumbnail } from '../services/youtubeUtils'
import {
  estimateLessonDuration,
  formatDuration,
  getLessonAggregate,
  getLessonDifficulty,
  getLessonXpReward,
  getWatchHistory,
} from '../services/lessonExperience'

const LESSON_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'react', label: 'React' },
  { value: 'fastapi', label: 'FastAPI' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'docker', label: 'Docker' },
]

const categoryLabel = (value) => LESSON_CATEGORIES.find((item) => item.value === value)?.label || value

function enrichLessonCard(lesson, index) {
  const videoId = extractYoutubeVideoId(lesson.youtubeUrl || lesson.embedUrl)
  const durationSeconds = estimateLessonDuration(videoId, index)
  const difficulty = lesson.difficulty || getLessonDifficulty(index)
  const progress = getLessonAggregate(lesson.id)

  return {
    ...lesson,
    durationLabel: lesson.duration || formatDuration(durationSeconds),
    difficulty,
    progress: progress.progress,
    completed: progress.completed,
    xpReward: lesson.xpReward || getLessonXpReward(durationSeconds, difficulty),
    thumbnail: lesson.thumbnailUrl || getYoutubeThumbnail(lesson.youtubeUrl || lesson.embedUrl, 'high'),
    category: lesson.category || 'python',
  }
}

export default function LessonsPage() {
  const { lang, t } = useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const activeCategory = (searchParams.get('category') || '').toLowerCase()

  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams({ lang })
    if (activeCategory) query.set('category', activeCategory)
    apiGet(`/api/lessons?${query.toString()}`)
      .then((data) => setItems(data.items || []))
      .finally(() => setLoading(false))
  }, [activeCategory, lang])

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const lessons = useMemo(() => {
    if (revision < 0) return []
    return items.map(enrichLessonCard)
  }, [items, revision])
  const continueItems = getWatchHistory(3)
  const selectCategory = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set('category', value)
    } else {
      next.delete('category')
    }
    setSearchParams(next)
  }

  return (
    <section className="lessons-hub">
      <header className="lessons-hub-header">
        <div>
          <span className="lessons-hub-eyebrow">
            <Sparkles size={16} />
            {t('lessonsHubBadge')}
          </span>
          <h1>{t('lessonsTitle')}</h1>
          <p>{t('lessonsHubDescription')}</p>
        </div>
        <div className="lessons-hub-metrics">
          <article>
            <strong>{lessons.length}</strong>
            <span>{t('lessonsMetric')}</span>
          </article>
          <article>
            <strong>{lessons.filter((lesson) => lesson.completed).length}</strong>
            <span>{t('completedMetric')}</span>
          </article>
          <article>
            <strong>{continueItems.length}</strong>
            <span>{t('recentMetric')}</span>
          </article>
        </div>
      </header>

      <nav className="lesson-category-tabs" aria-label="Lesson categories">
        {LESSON_CATEGORIES.map((category) => (
          <button
            key={category.value || 'all'}
            type="button"
            className={activeCategory === category.value ? 'active' : ''}
            onClick={() => selectCategory(category.value)}
          >
            {category.label}
          </button>
        ))}
      </nav>

      {continueItems.length ? (
        <section className="continue-learning-strip">
          <div className="continue-learning-title">
            <Flame size={18} />
            <div>
              <h2>{t('continueLearning')}</h2>
              <span>{t('continueLearningSubtitle')}</span>
            </div>
          </div>
          <div className="continue-learning-list">
            {continueItems.map((item) => (
              <Link key={item.key} to={`/lessons/${item.lessonId}?video=${(item.videoIndex || 0) + 1}`}>
                <span style={{ backgroundImage: item.thumbnail ? `url(${item.thumbnail})` : undefined }} />
                <div>
                  <strong>{item.title}</strong>
                  <small>{Math.round(item.progress || 0)}% {t('watched')}</small>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="lesson-card-skeleton-grid">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} />)}
        </div>
      ) : lessons.length ? (
        <div className="lesson-card-grid">
          {lessons.map((lesson) => (
            <article className="lesson-card-modern" key={lesson.id}>
              <Link className="lesson-card-thumb" to={`/lessons/${lesson.id}`} style={{ backgroundImage: lesson.thumbnail ? `url(${lesson.thumbnail})` : undefined }}>
                <span>
                  <PlayCircle size={24} />
                </span>
              </Link>
              <div className="lesson-card-body">
                <div className="lesson-card-topline">
                  <span>
                    <Clock3 size={14} />
                    {lesson.durationLabel}
                  </span>
                  <span>
                    <Zap size={14} />
                    {lesson.xpReward} XP
                  </span>
                </div>
                <h2>{lesson.title}</h2>
                <p>{lesson.description}</p>
                <div className="lesson-card-tags">
                  <span>{categoryLabel(lesson.category)}</span>
                  <span>{lesson.difficulty}</span>
                  <span>{t('lessonLinksCount')}: {lesson.linksCount ?? 1}</span>
                  {lesson.completed && (
                    <span>
                      <Award size={14} />
                      {t('completedMetric')}
                    </span>
                  )}
                </div>
                <div className="lesson-card-progress">
                  <span style={{ width: `${lesson.progress}%` }} />
                </div>
                <Link className="lesson-card-action" to={`/lessons/${lesson.id}`}>
                  {lesson.progress > 0 ? t('continue') : t('openLesson')}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="lesson-muted">{t('emptyLessons')}</p>
      )}
    </section>
  )
}
