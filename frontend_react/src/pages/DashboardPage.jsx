import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { FaTrophy, FaFire, FaStar, FaCode, FaBook, FaGamepad, FaCalendar, FaMedal } from 'react-icons/fa'
import { useAppContext } from '../contexts'
import { apiRequest } from '../api'
import './DashboardPage.css'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1']

export default function DashboardPage() {
  const { t, auth } = useAppContext()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboardStats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiRequest('/api/auth/me')
      setStats(data)
    } catch {
      setError(t('dashboardLoadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadDashboardStats()
  }, [loadDashboardStats])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p>{t('loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={loadDashboardStats}>{t('retry')}</button>
      </div>
    )
  }

  if (!stats) return null

  const xpData = [
    { day: 'Mon', xp: 50 },
    { day: 'Tue', xp: 75 },
    { day: 'Wed', xp: 100 },
    { day: 'Thu', xp: 60 },
    { day: 'Fri', xp: 90 },
    { day: 'Sat', xp: 120 },
    { day: 'Sun', xp: 80 },
  ]

  const activityData = [
    { name: 'Lessons', value: 12, color: '#8884d8' },
    { name: 'Tasks', value: 8, color: '#82ca9d' },
    { name: 'Games', value: 5, color: '#ffc658' },
  ]

  return (
    <div className="dashboard-page">
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>{t('dashboard')}</h1>
        <p>{t('welcomeBack')} {auth.user?.fullName}</p>
      </motion.div>

      <div className="dashboard-stats-grid">
        <motion.div
          className="stat-card xp-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="stat-icon">
            <FaStar />
          </div>
          <div className="stat-content">
            <h3>{stats.xp || 0}</h3>
            <p>{t('totalXP')}</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card level-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="stat-icon">
            <FaTrophy />
          </div>
          <div className="stat-content">
            <h3>{stats.level || 1}</h3>
            <p>{t('level')}</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card streak-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="stat-icon">
            <FaFire />
          </div>
          <div className="stat-content">
            <h3>{stats.streaks || 0}</h3>
            <p>{t('currentStreak')}</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card achievements-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="stat-icon">
            <FaMedal />
          </div>
          <div className="stat-content">
            <h3>5</h3>
            <p>{t('achievements')}</p>
          </div>
        </motion.div>
      </div>

      <div className="dashboard-charts">
        <motion.div
          className="chart-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h2>{t('xpProgress')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={xpData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="xp" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="chart-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2>{t('activityBreakdown')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={activityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {activityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div
        className="recent-activity"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <h2>{t('recentActivity')}</h2>
        <div className="activity-list">
          <div className="activity-item">
            <FaBook className="activity-icon" />
            <div className="activity-content">
              <p>{t('completedLesson')} "Python Basics"</p>
              <span>2 hours ago</span>
            </div>
          </div>
          <div className="activity-item">
            <FaCode className="activity-icon" />
            <div className="activity-content">
              <p>{t('solvedTask')} "FizzBuzz"</p>
              <span>1 day ago</span>
            </div>
          </div>
          <div className="activity-item">
            <FaGamepad className="activity-icon" />
            <div className="activity-content">
              <p>{t('playedGame')} "Binary Blitz"</p>
              <span>2 days ago</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
