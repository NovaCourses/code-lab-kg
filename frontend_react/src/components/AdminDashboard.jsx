import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Gamepad2,
  MessageSquare,
  Plus,
  Rocket,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { apiGet, unwrapAdminResponse } from '../api'
import { useAppContext } from '../contexts'
import './AdminDashboard.css'

const StatSkeleton = () => (
  <div className="admin-stat-skeleton">
    <div className="admin-stat-skeleton-title" />
    <div className="admin-stat-skeleton-value" />
    <div className="admin-stat-skeleton-subtitle" />
  </div>
)

const formatNumber = (num = 0) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return String(num)
}

const quickActions = [
  { labelKey: 'adminAddLesson', href: '/admin/lesson/create', icon: Plus },
  { labelKey: 'adminAddTask', href: '/admin/task/create', icon: Plus },
  { labelKey: 'adminAddGame', href: '/admin/game/create', icon: Gamepad2 },
  { labelKey: 'adminOpenSite', href: '/', icon: Rocket },
]

const formatCourseType = (type, t) => ({
  lesson: t('adminLesson'),
  task: t('adminTask'),
  game: t('adminGame'),
}[type] || type)

const formatCourseStatus = (status, t) => (status === 'published' || !status ? t('adminPublished') : status)

export default function AdminDashboard() {
  const { t } = useAppContext()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [topStudents, setTopStudents] = useState([])
  const [courseStats, setCourseStats] = useState([])
  const [error, setError] = useState(null)

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsResponse, studentsResponse, coursesResponse] = await Promise.all([
        apiGet('/api/admin/dashboard/stats'),
        apiGet('/api/admin/dashboard/top-students?limit=10'),
        apiGet('/api/admin/dashboard/course-stats'),
      ])

      const nextStats = unwrapAdminResponse(statsResponse)
      const students = unwrapAdminResponse(studentsResponse)
      const courses = unwrapAdminResponse(coursesResponse)

      setStats(nextStats)
      setTopStudents(students.students || students.users || [])
      setCourseStats(courses.courses || [])
    } catch (err) {
      console.error('Dashboard error:', err)
      setError(t('adminLoadDashboardFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const statCards = [
    {
      title: t('adminTotalUsers'),
      value: stats?.total_users,
      subtitle: `${formatNumber(stats?.new_users_today)} ${t('adminNewToday')}`,
      icon: Users,
      tone: 'users',
    },
    {
      title: t('adminActiveUsers'),
      value: stats?.active_users_week,
      subtitle: `${formatNumber(stats?.active_users)} ${t('adminActiveToday')}`,
      icon: Activity,
      tone: 'growth',
    },
    {
      title: t('adminLessons'),
      value: stats?.total_lessons,
      subtitle: `${formatNumber(stats?.completed_lessons)} ${t('adminViewsCompletions')}`,
      icon: BookOpen,
      tone: 'courses',
    },
    {
      title: t('adminTasks'),
      value: stats?.total_tasks,
      subtitle: `${formatNumber(stats?.task_submissions)} ${t('adminSubmissions')}`,
      icon: CheckCircle2,
      tone: 'courses',
    },
    {
      title: t('adminGames'),
      value: stats?.total_games,
      subtitle: `${formatNumber(stats?.games_played)} ${t('adminPlays')}`,
      icon: Gamepad2,
      tone: 'growth',
    },
    {
      title: t('adminComments'),
      value: stats?.total_comments,
      subtitle: t('adminModerationQueue'),
      icon: MessageSquare,
      tone: 'users',
    },
    {
      title: t('adminTotalXp'),
      value: stats?.total_xp_earned || stats?.total_xp,
      subtitle: `${formatNumber(stats?.avg_xp)} ${t('adminAvgPerUser')}`,
      icon: Zap,
      tone: 'xp',
    },
    {
      title: t('adminGrowth'),
      value: `${stats?.growth_percentage || 0}%`,
      subtitle: t('adminLast30Days'),
      icon: Trophy,
      tone: 'growth',
    },
  ]

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <p className="admin-dashboard-eyebrow">{t('adminControlCenter')}</p>
          <h1>{t('adminDashboardTitle')}</h1>
        </div>
        <button className="admin-dashboard-refresh" onClick={loadDashboardData}>
          <Activity size={18} />
          {t('adminRefresh')}
        </button>
      </div>

      {error && (
        <div className="admin-error-banner">
          <p>{error}</p>
          <button onClick={loadDashboardData}>{t('adminRetry')}</button>
        </div>
      )}

      <div className="admin-quick-grid">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <a className="admin-quick-card" href={action.href} key={action.labelKey}>
              <Icon size={18} />
              <span>{t(action.labelKey)}</span>
            </a>
          )
        })}
      </div>

      <div className="admin-stats-grid">
        {loading
          ? Array.from({ length: 8 }, (_, index) => <StatSkeleton key={index} />)
          : statCards.map((card, index) => {
              const Icon = card.icon
              return (
                <motion.div
                  className="admin-stat-card"
                  key={card.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className={`admin-stat-icon ${card.tone}`}>
                    <Icon size={24} />
                  </div>
                  <div className="admin-stat-content">
                    <h3>{card.title}</h3>
                    <p className="admin-stat-value">{formatNumber(card.value || 0)}</p>
                    <p className="admin-stat-subtitle">{card.subtitle}</p>
                  </div>
                </motion.div>
              )
            })}
      </div>

      <div className="admin-charts-section">
        <motion.div className="admin-chart-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="admin-chart-title">{t('adminTopStudents')}</h3>
          {topStudents.length > 0 ? (
            <div className="admin-students-list">
              {topStudents.map((student, index) => (
                <div key={student.id} className="admin-student-item">
                  <div className="admin-student-rank">#{index + 1}</div>
                  <div className="admin-student-info">
                    <p className="admin-student-name">{student.name || student.full_name}</p>
                    <p className="admin-student-email">{student.email}</p>
                  </div>
                  <div className="admin-student-xp">{formatNumber(student.xp)} XP</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">{t('adminNoStudents')}</div>
          )}
        </motion.div>

        <motion.div className="admin-chart-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="admin-chart-title">{t('adminContentHealth')}</h3>
          {courseStats.length > 0 ? (
            <div className="admin-courses-list">
              {courseStats.map((course) => (
                <div key={`${course.type}-${course.id}`} className="admin-course-item">
                  <div className="admin-course-info">
                    <p className="admin-course-name">{course.title}</p>
                    <p className="admin-course-meta">
                      {formatCourseType(course.type, t)} / {formatCourseStatus(course.status, t)} / {course.completion_rate || 0}% {t('adminComplete')}
                    </p>
                  </div>
                  <div className="admin-course-progress">
                    <div className="admin-progress-bar">
                      <div className="admin-progress-fill" style={{ width: `${course.completion_rate || 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">{t('adminNoContent')}</div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
