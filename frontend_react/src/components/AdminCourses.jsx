import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Code2, Edit2, Gamepad2, Plus, Trash2, Upload, Video } from 'lucide-react'
import { apiGet, apiPost, unwrapAdminResponse } from '../api'
import { useAppContext } from '../contexts'
import './AdminCourses.css'

const initialForm = {
  type: 'lesson',
  title: '',
  description: '',
  youtube_url: '',
  difficulty: 'easy',
  slug: '',
  image_url: '',
  external_url: '',
}

const typeIcons = {
  lesson: Video,
  task: Code2,
  game: Gamepad2,
}

const typeLabel = (type, t) => ({
  lesson: t('adminLesson'),
  task: t('adminTask'),
  game: t('adminGame'),
}[type] || type)

const difficultyLabel = (difficulty, t) => ({
  easy: t('adminEasy'),
  medium: t('adminMedium'),
  hard: t('adminHard'),
  mixed: t('adminMixed'),
}[difficulty] || difficulty)

export default function AdminCourses() {
  const { t } = useAppContext()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNewCourseModal, setShowNewCourseModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [courseType, setCourseType] = useState('all')
  const [formData, setFormData] = useState(initialForm)

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ limit: 30 })
      if (courseType !== 'all') params.set('course_type', courseType)
      const response = await apiGet(`/api/admin/courses?${params}`)
      const data = unwrapAdminResponse(response)
      setCourses(data.courses || [])
    } catch (err) {
      console.error('Failed to load courses:', err)
      setError(t('adminLoadContentFailed'))
    } finally {
      setLoading(false)
    }
  }, [courseType, t])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const updateForm = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleCreateCourse = async (event) => {
    event.preventDefault()
    setActionLoading('create')
    setError(null)

    try {
      await apiPost('/api/admin/courses', formData)
      await loadCourses()
      setShowNewCourseModal(false)
      setFormData(initialForm)
    } catch (err) {
      console.error('Create content error:', err)
      setError(err.message || t('adminCreateContentFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`${t('adminDeleteConfirm')} ${course.title}?`)) return

    setActionLoading(`delete-${course.type}-${course.id}`)
    try {
      await apiPost(`/api/admin/courses/${course.id}/delete?course_type=${course.type}`, {})
      await loadCourses()
    } catch (err) {
      console.error('Delete content error:', err)
      setError(t('adminDeleteContentFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="admin-courses">
      <div className="admin-courses-header">
        <div>
          <h2>{t('adminContentManagement')}</h2>
          <p className="admin-courses-subtitle">{t('adminContentSubtitle')}</p>
        </div>
        <div className="admin-course-toolbar">
          <select value={courseType} onChange={(event) => setCourseType(event.target.value)}>
            <option value="all">{t('adminAllContent')}</option>
            <option value="lesson">{t('adminLessons')}</option>
            <option value="task">{t('adminTasks')}</option>
            <option value="game">{t('adminGames')}</option>
          </select>
          <button className="admin-btn-primary" onClick={() => setShowNewCourseModal(true)}>
            <Plus size={18} />
            {t('adminNewContent')}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error-banner">
          <p>{error}</p>
          <button onClick={loadCourses}>{t('adminRetry')}</button>
        </div>
      )}

      <div className="admin-courses-grid">
        {loading ? (
          <>
            <div className="admin-course-card-skeleton" />
            <div className="admin-course-card-skeleton" />
            <div className="admin-course-card-skeleton" />
          </>
        ) : courses.length === 0 ? (
          <div className="admin-empty-state">
            <p>{t('adminNoContentCreated')}</p>
            <button className="admin-btn-secondary" onClick={() => setShowNewCourseModal(true)}>
              {t('adminCreateFirstItem')}
            </button>
          </div>
        ) : (
          courses.map((course, index) => {
            const Icon = typeIcons[course.type] || Upload
            return (
              <motion.div
                key={`${course.type}-${course.id}`}
                className="admin-course-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="admin-course-thumbnail">
                  {course.thumbnail_url || course.image_url ? (
                    <img src={course.thumbnail_url || course.image_url} alt={course.title} />
                  ) : (
                    <div className="admin-course-no-image">
                      <Icon size={24} />
                    </div>
                  )}
                </div>

                <div className="admin-course-content">
                  <div className="admin-course-badges">
                    <span>{typeLabel(course.type, t)}</span>
                    <span>{course.status === 'published' || !course.status ? t('adminPublished') : course.status}</span>
                    <span>{difficultyLabel(course.difficulty || 'mixed', t)}</span>
                  </div>
                  <h3 className="admin-course-title">{course.title}</h3>
                  <p className="admin-course-description">{course.description}</p>

                  <div className="admin-course-meta">
                    <span className="admin-course-meta-item">{course.duration || t('adminSelfPaced')}</span>
                    <span className="admin-course-meta-item">{course.xp_reward || 0} XP</span>
                    {course.embed_url && <span className="admin-course-meta-item">{t('adminYoutubeEmbedReady')}</span>}
                  </div>

                  <div className="admin-course-actions">
                    <a className="admin-course-action-btn edit" href="/admin/" target="_blank" rel="noreferrer">
                      <Edit2 size={16} />
                      {t('adminEdit')}
                    </a>
                    <button
                      className="admin-course-action-btn delete"
                      onClick={() => handleDeleteCourse(course)}
                      disabled={actionLoading === `delete-${course.type}-${course.id}`}
                    >
                      <Trash2 size={16} />
                      {t('adminDelete')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {showNewCourseModal && (
        <div className="admin-modal-overlay" onClick={() => setShowNewCourseModal(false)}>
          <motion.div
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="admin-modal-header">
              <h3>{t('adminCreateContent')}</h3>
              <button className="admin-modal-close" onClick={() => setShowNewCourseModal(false)}>
                x
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="admin-course-form">
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>{t('adminType')}</label>
                  <select value={formData.type} onChange={(event) => updateForm('type', event.target.value)}>
                    <option value="lesson">{t('adminLesson')}</option>
                    <option value="task">{t('adminTask')}</option>
                    <option value="game">{t('adminGame')}</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>{t('difficulty')}</label>
                  <select value={formData.difficulty} onChange={(event) => updateForm('difficulty', event.target.value)}>
                    <option value="easy">{t('adminEasy')}</option>
                    <option value="medium">{t('adminMedium')}</option>
                    <option value="hard">{t('adminHard')}</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>{t('adminTitle')}</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  placeholder={t('adminEnterTitle')}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>{t('adminDescription')}</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  placeholder={t('adminShortDescription')}
                  rows={4}
                />
              </div>

              {formData.type === 'lesson' && (
                <div className="admin-form-group">
                  <label>{t('adminYoutubeUrl')}</label>
                  <input
                    type="url"
                    value={formData.youtube_url}
                    onChange={(event) => updateForm('youtube_url', event.target.value)}
                    placeholder="https://youtu.be/VIDEO_ID"
                    required
                  />
                </div>
              )}

              {formData.type === 'game' && (
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>{t('adminSlug')}</label>
                    <input value={formData.slug} onChange={(event) => updateForm('slug', event.target.value)} placeholder="binary-blitz" />
                  </div>
                  <div className="admin-form-group">
                    <label>{t('adminExternalLink')}</label>
                    <input value={formData.external_url} onChange={(event) => updateForm('external_url', event.target.value)} placeholder="https://..." />
                  </div>
                  <div className="admin-form-group span-2">
                    <label>{t('adminImagePreview')}</label>
                    <input value={formData.image_url} onChange={(event) => updateForm('image_url', event.target.value)} placeholder="https://..." />
                  </div>
                </div>
              )}

              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowNewCourseModal(false)}>
                  {t('adminCancel')}
                </button>
                <button type="submit" className="admin-btn-primary" disabled={actionLoading === 'create'}>
                  {actionLoading === 'create' ? t('adminCreating') : t('adminCreateContentAction')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
