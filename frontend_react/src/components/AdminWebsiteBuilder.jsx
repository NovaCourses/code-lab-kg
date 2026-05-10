import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot,
  GripVertical,
  Image,
  Layers,
  Monitor,
  Palette,
  Plus,
  Save,
  Search,
  Smartphone,
  Tablet,
  Type,
} from 'lucide-react'
import { apiGet, apiPost, unwrapAdminResponse } from '../api'
import { useAppContext } from '../contexts'
import './AdminWebsiteBuilder.css'

const viewports = [
  { id: 'desktop', labelKey: 'adminDesktop', icon: Monitor },
  { id: 'tablet', labelKey: 'adminTablet', icon: Tablet },
  { id: 'mobile', labelKey: 'adminMobile', icon: Smartphone },
]

const emptyMedia = { name: '', url: '', type: 'image', folder: 'Homepage' }

const sectionLabel = (section, t) => ({
  statistics: t('adminStatistics'),
  leaderboard: t('leaderboard'),
  ai_assistant: t('adminAiAssistant'),
  achievements: t('achievements'),
  daily_missions: t('adminDailyMissions'),
  courses: t('adminCoursesSection'),
  community: t('adminCommunityBlocks'),
}[section.id] || section.label)

const aiToolLabel = (key, t) => ({
  generate_lesson: t('adminGenerateLesson'),
  generate_task: t('adminGenerateTask'),
  generate_quiz: t('adminGenerateQuiz'),
  improve_descriptions: t('adminImproveDescriptions'),
}[key] || key.replaceAll('_', ' '))

export default function AdminWebsiteBuilder() {
  const { t } = useAppContext()
  const [cms, setCms] = useState(null)
  const [viewport, setViewport] = useState('desktop')
  const [draggedSection, setDraggedSection] = useState(null)
  const [mediaForm, setMediaForm] = useState(emptyMedia)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadBuilder = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet('/api/admin/site-builder')
      setCms(unwrapAdminResponse(response))
    } catch (err) {
      console.error('Builder load error:', err)
      setError(t('adminLoadBuilderFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadBuilder()
  }, [loadBuilder])

  const sections = useMemo(() => cms?.sections || [], [cms?.sections])
  const enabledSections = useMemo(() => sections.filter((section) => section.enabled), [sections])

  const updateCms = (path, value) => {
    setCms((current) => {
      const next = structuredClone(current || {})
      let cursor = next
      path.slice(0, -1).forEach((key) => {
        cursor[key] = cursor[key] || {}
        cursor = cursor[key]
      })
      cursor[path[path.length - 1]] = value
      return next
    })
  }

  const updateSection = (sectionId, patch) => {
    updateCms(['sections'], sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section)))
  }

  const moveSection = (fromId, toId) => {
    if (!fromId || fromId === toId) return
    const nextSections = [...sections]
    const fromIndex = nextSections.findIndex((section) => section.id === fromId)
    const toIndex = nextSections.findIndex((section) => section.id === toId)
    if (fromIndex < 0 || toIndex < 0) return
    const [item] = nextSections.splice(fromIndex, 1)
    nextSections.splice(toIndex, 0, item)
    updateCms(['sections'], nextSections)
  }

  const saveBuilder = async () => {
    setSaving(true)
    try {
      const response = await apiPost('/api/admin/site-builder', cms)
      setCms(unwrapAdminResponse(response).cms || cms)
    } finally {
      setSaving(false)
    }
  }

  const addMedia = async () => {
    if (!mediaForm.url.trim()) return
    const response = await apiPost('/api/admin/media', mediaForm)
    const media = unwrapAdminResponse(response).media
    updateCms(['media'], [media, ...(cms?.media || [])])
    setMediaForm(emptyMedia)
  }

  if (loading) {
    return <div className="admin-builder-loading">{t('adminLoadingBuilder')}</div>
  }

  if (error || !cms) {
    return (
      <div className="admin-error-banner">
        <p>{error || t('adminBuilderUnavailable')}</p>
        <button onClick={loadBuilder}>{t('adminRetry')}</button>
      </div>
    )
  }

  const viewportClass = `is-${viewport}`

  return (
    <div className="admin-builder">
      <div className="admin-builder-header">
        <div>
          <p className="admin-builder-eyebrow">{t('adminBuilderEyebrow')}</p>
          <h2>{t('adminWebsiteBuilder')}</h2>
        </div>
        <button className="admin-btn-primary" onClick={saveBuilder} disabled={saving}>
          <Save size={17} />
          {saving ? t('adminSaving') : t('adminSaveBuilder')}
        </button>
      </div>

      <div className="admin-builder-grid">
        <aside className="admin-builder-panel">
          <BuilderBlock icon={Layers} title={t('adminHeroSection')}>
            <label>
              {t('adminBadge')}
              <input value={cms.hero?.badge || ''} onChange={(event) => updateCms(['hero', 'badge'], event.target.value)} placeholder={t('heroBadge')} />
            </label>
            <label>
              {t('adminTitle')}
              <input value={cms.hero?.title || ''} onChange={(event) => updateCms(['hero', 'title'], event.target.value)} placeholder={t('adminHeroTitlePlaceholder')} />
            </label>
            <label>
              {t('adminSubtitle')}
              <textarea value={cms.hero?.subtitle || ''} onChange={(event) => updateCms(['hero', 'subtitle'], event.target.value)} rows={3} placeholder={t('adminHeroDescriptionPlaceholder')} />
            </label>
            <div className="admin-builder-two">
              <label>
                {t('adminPrimaryButton')}
                <input value={cms.hero?.primary_button || ''} onChange={(event) => updateCms(['hero', 'primary_button'], event.target.value)} />
              </label>
              <label>
                {t('adminSecondaryButton')}
                <input value={cms.hero?.secondary_button || ''} onChange={(event) => updateCms(['hero', 'secondary_button'], event.target.value)} />
              </label>
            </div>
            <label>
              {t('adminHeroImage')}
              <input value={cms.hero?.background_image || ''} onChange={(event) => updateCms(['hero', 'background_image'], event.target.value)} placeholder="https://..." />
            </label>
            <label className="admin-builder-toggle">
              <span>{t('adminAnimations')}</span>
              <input type="checkbox" checked={!!cms.hero?.animations_enabled} onChange={(event) => updateCms(['hero', 'animations_enabled'], event.target.checked)} />
            </label>
          </BuilderBlock>

          <BuilderBlock icon={Palette} title={t('adminVisualThemeEditor')}>
            <div className="admin-color-grid">
              <ColorInput label={t('adminPrimary')} value={cms.theme_editor?.primary_color} onChange={(value) => updateCms(['theme_editor', 'primary_color'], value)} />
              <ColorInput label={t('adminSecondary')} value={cms.theme_editor?.secondary_color} onChange={(value) => updateCms(['theme_editor', 'secondary_color'], value)} />
              <ColorInput label={t('adminGlow')} value={cms.theme_editor?.glow_color} onChange={(value) => updateCms(['theme_editor', 'glow_color'], value)} />
              <ColorInput label={t('adminDarkBg')} value={cms.theme_editor?.dark_background} onChange={(value) => updateCms(['theme_editor', 'dark_background'], value)} />
            </div>
          </BuilderBlock>

          <BuilderBlock icon={Type} title={t('adminTypography')}>
            <label>
              {t('adminFontFamily')}
              <input value={cms.theme_editor?.font_family || ''} onChange={(event) => updateCms(['theme_editor', 'font_family'], event.target.value)} />
            </label>
            <div className="admin-builder-two">
              <label>
                {t('adminBaseSize')}
                <input type="number" min="12" max="22" value={cms.theme_editor?.base_font_size || 16} onChange={(event) => updateCms(['theme_editor', 'base_font_size'], Number(event.target.value))} />
              </label>
              <label>
                {t('adminHeadingScale')}
                <input type="number" step="0.05" min="0.8" max="1.4" value={cms.theme_editor?.heading_scale || 1} onChange={(event) => updateCms(['theme_editor', 'heading_scale'], Number(event.target.value))} />
              </label>
            </div>
          </BuilderBlock>

          <BuilderBlock icon={Image} title={t('adminMediaLibrary')}>
            <div className="admin-builder-two">
              <input value={mediaForm.name} onChange={(event) => setMediaForm((value) => ({ ...value, name: event.target.value }))} placeholder={t('adminName')} />
              <select value={mediaForm.type} onChange={(event) => setMediaForm((value) => ({ ...value, type: event.target.value }))}>
                <option value="image">{t('adminImage')}</option>
                <option value="thumbnail">{t('adminThumbnail')}</option>
                <option value="video">{t('adminVideo')}</option>
                <option value="pdf">{t('adminPdf')}</option>
              </select>
            </div>
            <input value={mediaForm.url} onChange={(event) => setMediaForm((value) => ({ ...value, url: event.target.value }))} placeholder={t('adminMediaUrl')} />
            <button type="button" className="admin-btn-secondary" onClick={addMedia}>
              <Plus size={15} />
              {t('adminAddMedia')}
            </button>
          </BuilderBlock>
        </aside>

        <main className="admin-builder-preview-wrap">
          <div className="admin-builder-preview-toolbar">
            <div className="admin-builder-tabs">
              {viewports.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.id} className={viewport === item.id ? 'active' : ''} onClick={() => setViewport(item.id)}>
                    <Icon size={15} />
                    {t(item.labelKey)}
                  </button>
                )
              })}
            </div>
            <span>{enabledSections.length}/{sections.length} {t('adminSectionsVisible')}</span>
          </div>

          <div
            className={`admin-live-preview ${viewportClass}`}
            style={{
              '--builder-primary': cms.theme_editor?.primary_color,
              '--builder-secondary': cms.theme_editor?.secondary_color,
              '--builder-glow': cms.theme_editor?.glow_color,
              '--builder-font': cms.theme_editor?.font_family,
              '--builder-size': `${cms.theme_editor?.base_font_size || 16}px`,
              backgroundImage: cms.hero?.background_image ? `linear-gradient(rgba(5,8,22,.66), rgba(5,8,22,.82)), url(${cms.hero.background_image})` : undefined,
            }}
          >
            <section className="admin-preview-hero">
              <span>{cms.hero?.badge || t('heroBadge')}</span>
              <h1>{cms.hero?.title || t('adminDefaultHeroTitle')}</h1>
              <p>{cms.hero?.subtitle || t('adminDefaultHeroText')}</p>
              <div>
                <button>{cms.hero?.primary_button || t('adminStartLearning')}</button>
                <button>{cms.hero?.secondary_button || t('adminExplorePlatform')}</button>
              </div>
            </section>
            <div className="admin-preview-sections">
              {sections.map((section) => (
                <article
                  key={section.id}
                  draggable
                  onDragStart={() => setDraggedSection(section.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => moveSection(draggedSection, section.id)}
                  className={section.enabled ? '' : 'is-hidden'}
                >
                  <GripVertical size={16} />
                  <div>
                    <strong>{sectionLabel(section, t)}</strong>
                    <small>{section.enabled ? t('adminVisible') : t('adminHidden')} / {t('adminDragToReorder')}</small>
                  </div>
                  <label>
                    <input type="checkbox" checked={section.enabled} onChange={(event) => updateSection(section.id, { enabled: event.target.checked })} />
                  </label>
                </article>
              ))}
            </div>
          </div>
        </main>

        <aside className="admin-builder-panel">
          <BuilderBlock icon={Search} title={t('adminSeoSettings')}>
            <label>
              {t('adminLogoText')}
              <input value={cms.site?.logo_text || ''} onChange={(event) => updateCms(['site', 'logo_text'], event.target.value)} />
            </label>
            <label>
              {t('adminSeoTitle')}
              <input value={cms.site?.seo_title || ''} onChange={(event) => updateCms(['site', 'seo_title'], event.target.value)} />
            </label>
            <label>
              {t('adminSeoDescription')}
              <textarea rows={3} value={cms.site?.seo_description || ''} onChange={(event) => updateCms(['site', 'seo_description'], event.target.value)} />
            </label>
            <label>
              {t('adminOpenGraphImage')}
              <input value={cms.site?.open_graph_image || ''} onChange={(event) => updateCms(['site', 'open_graph_image'], event.target.value)} />
            </label>
          </BuilderBlock>

          <BuilderBlock icon={Bot} title={t('adminAiTools')}>
            {Object.entries(cms.ai_tools || {}).map(([key, enabled]) => (
              <label className="admin-builder-toggle" key={key}>
                <span>{aiToolLabel(key, t)}</span>
                <input type="checkbox" checked={!!enabled} onChange={(event) => updateCms(['ai_tools', key], event.target.checked)} />
              </label>
            ))}
            <div className="admin-ai-command-box">
              <strong>{t('adminPromptGenerator')}</strong>
              <p>{t('adminPromptGeneratorText')}</p>
            </div>
          </BuilderBlock>

          <BuilderBlock icon={Image} title={t('adminLibraryPreview')}>
            <div className="admin-media-grid">
              {(cms.media || []).slice(0, 8).map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                  {item.type === 'image' || item.type === 'thumbnail' ? <img src={item.url} alt={item.name} /> : <span>{item.type}</span>}
                  <small>{item.name}</small>
                </a>
              ))}
            </div>
          </BuilderBlock>
        </aside>
      </div>
    </div>
  )
}

function BuilderBlock({ icon, title, children }) {
  const BlockIcon = icon
  return (
    <section className="admin-builder-block">
      <div className="admin-builder-block-title">
        <BlockIcon size={17} />
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  )
}

function ColorInput({ label, value, onChange }) {
  return (
    <label>
      {label}
      <span className="admin-color-input">
        <input type="color" value={value || '#7c3aed'} onChange={(event) => onChange(event.target.value)} />
        <input value={value || ''} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  )
}
