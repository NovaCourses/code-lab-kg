import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { apiGet, unwrapAdminResponse } from '../api'
import { useAppContext } from '../contexts'
import './AdminAnalytics.css'

const ChartSkeleton = () => (
  <div className="admin-chart-skeleton">
    <div className="admin-chart-skeleton-bar" />
    <div className="admin-chart-skeleton-bar" />
    <div className="admin-chart-skeleton-bar" />
  </div>
)

export default function AdminAnalytics() {
  const { t } = useAppContext()
  const [period, setPeriod] = useState('30')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({
    daily_activity: [],
    retention: [],
    completion_rate: [],
    game_stats: [],
  })

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet(`/api/admin/analytics?period=${period}`)
      const nextData = unwrapAdminResponse(response)
      setData({
        daily_activity: nextData.daily_activity || [],
        retention: nextData.retention || [],
        completion_rate: nextData.completion_rate || [],
        game_stats: nextData.game_stats || [],
      })
    } catch (err) {
      console.error('Analytics error:', err)
      setError(t('adminLoadAnalyticsFailed'))
    } finally {
      setLoading(false)
    }
  }, [period, t])

  useEffect(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  return (
    <div className="admin-analytics">
      <div className="admin-analytics-header">
        <h2>{t('adminAnalytics')}</h2>
        <div className="admin-period-selector">
          <button
            className={`admin-period-btn ${period === '7' ? 'active' : ''}`}
            onClick={() => setPeriod('7')}
          >
            {t('admin7Days')}
          </button>
          <button
            className={`admin-period-btn ${period === '30' ? 'active' : ''}`}
            onClick={() => setPeriod('30')}
          >
            {t('admin30Days')}
          </button>
          <button
            className={`admin-period-btn ${period === '90' ? 'active' : ''}`}
            onClick={() => setPeriod('90')}
          >
            {t('admin90Days')}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error-banner">
          <p>{error}</p>
          <button onClick={loadAnalyticsData}>{t('adminRetry')}</button>
        </div>
      )}

      <div className="admin-analytics-grid">
        {/* Daily Activity Chart */}
        <motion.div
          className="admin-analytics-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h3 className="admin-analytics-title">{t('adminDailyActivity')}</h3>
          {loading ? (
            <ChartSkeleton />
          ) : data.daily_activity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.daily_activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--ink-soft)" />
                <YAxis stroke="var(--ink-soft)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--panel-strong)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="active_users"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="admin-chart-empty">{t('adminNoDataAvailable')}</div>
          )}
        </motion.div>

        {/* User Retention Chart */}
        <motion.div
          className="admin-analytics-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="admin-analytics-title">{t('adminUserRetention')}</h3>
          {loading ? (
            <ChartSkeleton />
          ) : data.retention.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.retention}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--ink-soft)" />
                <YAxis stroke="var(--ink-soft)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--panel-strong)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="retention_rate"
                  stroke="var(--secondary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="admin-chart-empty">{t('adminNoDataAvailable')}</div>
          )}
        </motion.div>

        {/* Lesson Completion Rate Chart */}
        <motion.div
          className="admin-analytics-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="admin-analytics-title">{t('adminLessonCompletionRate')}</h3>
          {loading ? (
            <ChartSkeleton />
          ) : data.completion_rate.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.completion_rate}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="lesson" stroke="var(--ink-soft)" />
                <YAxis stroke="var(--ink-soft)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--panel-strong)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="completion_rate" fill="var(--accent-b)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="admin-chart-empty">{t('adminNoDataAvailable')}</div>
          )}
        </motion.div>

        {/* Game Play Statistics */}
        <motion.div
          className="admin-analytics-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="admin-analytics-title">{t('adminGamePlayStatistics')}</h3>
          {loading ? (
            <ChartSkeleton />
          ) : data.game_stats.length > 0 ? (
            <div className="admin-game-stats-list">
              {data.game_stats.map((game) => (
                <div key={game.id} className="admin-game-stat-item">
                  <div className="admin-game-stat-info">
                    <p className="admin-game-stat-name">{game.name}</p>
                    <p className="admin-game-stat-plays">{game.plays} {t('adminPlaysLower')}</p>
                  </div>
                  <div className="admin-game-stat-score">
                    {game.avg_score?.toFixed(1) || 0} {t('adminAverageShort')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-chart-empty">{t('adminNoDataAvailable')}</div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
