import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Eye } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { apiGet, apiPost, unwrapAdminResponse } from '../api'
import { useAppContext } from '../contexts'
import './AdminEditor.css'

export default function AdminEditor() {
  const { theme, t } = useAppContext()
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState(false)
  const [contentType, setContentType] = useState('markdown')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await apiGet('/api/admin/editor/templates')
      const data = unwrapAdminResponse(response)
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Failed to load templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      await apiPost('/api/admin/editor/save', {
        content,
        type: contentType,
        template_id: selectedTemplate,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save error:', err)
      setError(t('adminSaveContentFailed'))
    } finally {
      setSaving(false)
    }
  }

  const loadTemplate = (templateId) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setContent(template.content)
      setSelectedTemplate(templateId)
    }
  }

  const renderMarkdownPreview = (markdown) => {
    // Simple markdown rendering (use a proper markdown library in production)
    return markdown
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-header">
        <h2>{t('adminContentEditor')}</h2>
        <div className="admin-editor-controls">
          <button
            className={`admin-editor-btn ${preview ? 'active' : ''}`}
            onClick={() => setPreview(!preview)}
            title={t('adminTogglePreview')}
          >
            <Eye size={18} />
          </button>
          <button
            className="admin-editor-btn save"
            onClick={handleSave}
            disabled={saving}
            title={t('adminSaveContent')}
          >
            <Save size={18} />
            {saving ? t('adminSaving') : t('adminSave')}
          </button>
        </div>
      </div>

      {saved && (
        <motion.div
          className="admin-editor-toast"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          {t('adminContentSaved')}
        </motion.div>
      )}

      {error && (
        <div className="admin-error-banner">
          <p>{error}</p>
          <button onClick={handleSave}>{t('adminRetry')}</button>
        </div>
      )}

      <div className="admin-editor-container">
        {/* Sidebar with templates */}
        <div className="admin-editor-sidebar">
          <div className="admin-editor-section">
            <h3>{t('adminTemplates')}</h3>
            <div className="admin-templates-list">
              {loading ? (
                <p className="admin-loading-text">{t('adminLoadingTemplates')}</p>
              ) : templates.length === 0 ? (
                <p className="admin-empty-text">{t('adminNoTemplates')}</p>
              ) : (
                templates.map((template) => (
                  <button
                    key={template.id}
                    className={`admin-template-item ${selectedTemplate === template.id ? 'active' : ''}`}
                    onClick={() => loadTemplate(template.id)}
                  >
                    {template.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="admin-editor-section">
            <h3>{t('adminFormat')}</h3>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="admin-format-select"
            >
              <option value="markdown">{t('adminMarkdown')}</option>
              <option value="html">{t('adminHtml')}</option>
              <option value="text">{t('adminPlainText')}</option>
            </select>
          </div>

          <div className="admin-editor-section">
            <h3>{t('adminQuickActions')}</h3>
            <div className="admin-quick-actions">
              <button
                className="admin-quick-action"
                onClick={() => setContent(`${content}\n# ${t('adminNewHeading')}\n`)}
              >
                {t('adminAddHeading')}
              </button>
              <button
                className="admin-quick-action"
                onClick={() => setContent(`${content}\n- ${t('adminListItem')} 1\n- ${t('adminListItem')} 2\n`)}
              >
                {t('adminAddList')}
              </button>
              <button
                className="admin-quick-action"
                onClick={() => setContent('')}
              >
                {t('adminClear')}
              </button>
            </div>
          </div>
        </div>

        {/* Editor area */}
        <div className="admin-editor-main">
          {preview ? (
            <div className="admin-editor-preview">
              <div
                className="admin-preview-content"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownPreview(content),
                }}
              />
            </div>
          ) : (
            <Editor
              height="600px"
              defaultLanguage={contentType === 'markdown' ? 'markdown' : contentType}
              value={content}
              onChange={(value) => setContent(value || '')}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'IBM Plex Mono, monospace',
                lineHeight: 1.6,
                wordWrap: 'on',
                formatOnPaste: true,
              }}
            />
          )}
        </div>
      </div>

      {/* Character and line count */}
      <div className="admin-editor-footer">
        <div className="admin-editor-stats">
          <span className="admin-stat">
            {t('adminLines')}: {content.split('\n').length}
          </span>
          <span className="admin-stat">
            {t('adminCharacters')}: {content.length}
          </span>
          <span className="admin-stat">
            {t('adminWords')}: {content.split(/\s+/).filter((w) => w).length}
          </span>
        </div>
      </div>
    </div>
  )
}
