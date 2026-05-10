import { useCallback, useEffect, useState } from 'react'
import { Bell, EyeOff, MessageSquare, RefreshCw, Settings, ShieldCheck, Trash2 } from 'lucide-react'
import { apiGet, apiPost, unwrapAdminResponse } from '../api'
import { useAppContext } from '../contexts'
import './AdminOperations.css'

export default function AdminOperations() {
  const { t } = useAppContext()
  const [comments, setComments] = useState([])
  const [notifications, setNotifications] = useState([])
  const [logs, setLogs] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadOperations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [commentsResponse, notificationsResponse, logsResponse, settingsResponse] = await Promise.all([
        apiGet('/api/admin/comments?limit=12'),
        apiGet('/api/admin/notifications'),
        apiGet('/api/admin/audit-logs?limit=20'),
        apiGet('/api/admin/settings'),
      ])

      setComments(unwrapAdminResponse(commentsResponse).comments || [])
      setNotifications(unwrapAdminResponse(notificationsResponse).notifications || [])
      setLogs(unwrapAdminResponse(logsResponse).logs || [])
      setSettings(unwrapAdminResponse(settingsResponse))
    } catch (err) {
      console.error('Operations error:', err)
      setError(t('adminLoadOperationsFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadOperations()
  }, [loadOperations])

  const deleteComment = async (commentId) => {
    if (!window.confirm(t('adminDeleteCommentConfirm'))) return
    await apiPost(`/api/admin/comments/${commentId}/delete`, {})
    await loadOperations()
  }

  const hideComment = async (commentId) => {
    await apiPost(`/api/admin/comments/${commentId}/hide`, {})
    await loadOperations()
  }

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...(current || {}), [key]: value }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await apiPost('/api/admin/settings', settings || {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-operations">
      <div className="admin-operations-header">
        <div>
          <p className="admin-operations-eyebrow">{t('adminOperationsEyebrow')}</p>
          <h2>{t('adminOperations')}</h2>
        </div>
        <button className="admin-btn-secondary" onClick={loadOperations}>
          <RefreshCw size={16} />
          {t('adminRefresh')}
        </button>
      </div>

      {error && (
        <div className="admin-error-banner">
          <p>{error}</p>
          <button onClick={loadOperations}>{t('adminRetry')}</button>
        </div>
      )}

      {loading ? (
        <div className="admin-operations-loading">{t('adminLoadingOperations')}</div>
      ) : (
        <div className="admin-operations-grid">
          <section className="admin-ops-card admin-ops-card-wide">
            <div className="admin-ops-card-header">
              <MessageSquare size={18} />
              <h3>{t('adminCommentsModeration')}</h3>
            </div>
            <div className="admin-comment-list">
              {comments.length === 0 ? (
                <p className="admin-empty-text">{t('adminNoCommentsYet')}</p>
              ) : (
                comments.map((comment) => (
                  <article className="admin-comment-row" key={comment.id}>
                    <div>
                      <p className="admin-comment-content">{comment.content}</p>
                      <small>{comment.author} / {comment.lesson_title}</small>
                    </div>
                    <div className="admin-comment-actions">
                      <button title={t('adminHideComment')} onClick={() => hideComment(comment.id)}>
                        <EyeOff size={15} />
                      </button>
                      <button title={t('adminDeleteComment')} onClick={() => deleteComment(comment.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="admin-ops-card">
            <div className="admin-ops-card-header">
              <Bell size={18} />
              <h3>{t('adminNotifications')}</h3>
            </div>
            <div className="admin-notification-list">
              {notifications.map((item) => (
                <div className="admin-notification-row" key={item.id}>
                  <span>{item.title}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-ops-card">
            <div className="admin-ops-card-header">
              <Settings size={18} />
              <h3>{t('adminSettings')}</h3>
            </div>
            {settings && (
              <div className="admin-settings-list">
                <label>
                  <span>{t('adminSiteName')}</span>
                  <input value={settings.site_name || ''} onChange={(event) => updateSetting('site_name', event.target.value)} />
                </label>
                <label>
                  <span>{t('adminDefaultLanguage')}</span>
                  <select value={settings.default_language || 'ru'} onChange={(event) => updateSetting('default_language', event.target.value)}>
                    <option value="ru">RU</option>
                    <option value="en">EN</option>
                  </select>
                </label>
                <label className="admin-toggle-line">
                  <span>{t('adminMaintenanceMode')}</span>
                  <input type="checkbox" checked={!!settings.maintenance_mode} onChange={(event) => updateSetting('maintenance_mode', event.target.checked)} />
                </label>
                <label className="admin-toggle-line">
                  <span>{t('adminAiAssistant')}</span>
                  <input type="checkbox" checked={!!settings.ai_assistant_enabled} onChange={(event) => updateSetting('ai_assistant_enabled', event.target.checked)} />
                </label>
                <button className="admin-btn-primary" onClick={saveSettings} disabled={saving}>
                  {saving ? t('adminSaving') : t('adminSaveSettings')}
                </button>
              </div>
            )}
          </section>

          <section className="admin-ops-card admin-ops-card-wide">
            <div className="admin-ops-card-header">
              <ShieldCheck size={18} />
              <h3>{t('adminAuditLogs')}</h3>
            </div>
            <div className="admin-audit-list">
              {logs.length === 0 ? (
                <p className="admin-empty-text">{t('adminNoActivityYet')}</p>
              ) : (
                logs.map((log) => (
                  <div className="admin-audit-row" key={log.id}>
                    <span>{log.actor}</span>
                    <strong>{log.action}</strong>
                    <small>{new Date(log.created_at).toLocaleString()}</small>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
