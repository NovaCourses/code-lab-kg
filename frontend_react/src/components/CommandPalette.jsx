import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Code2,
  Gamepad2,
  LayoutDashboard,
  LogIn,
  Moon,
  Search,
  Sparkles,
  Sun,
  Trophy,
  UserRound,
  Zap,
} from 'lucide-react'

export default function CommandPalette({
  open,
  onOpen,
  onClose,
  onOpenAuth,
  authenticated,
  theme,
  setTheme,
  t,
}) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const commands = useMemo(
    () => [
      { title: t('navHome'), subtitle: t('commandHomeSubtitle'), path: '/', type: t('commandTypeNavigation'), icon: Sparkles, keywords: 'main start hero' },
      { title: t('navDashboard'), subtitle: t('commandDashboardSubtitle'), path: '/dashboard', type: t('commandTypeNavigation'), icon: LayoutDashboard, keywords: 'stats progress xp', hidden: !authenticated },
      { title: t('liveCodeEditor'), subtitle: t('commandCodeEditorSubtitle'), path: '/code-editor', type: t('commandTypeTool'), icon: Code2, keywords: 'monaco ide vscode code' },
      { title: t('navLessons'), subtitle: t('commandLessonsSubtitle'), path: '/lessons', type: t('lessonsMetric'), icon: BookOpen, keywords: 'course video learn' },
      { title: 'FizzBuzz', subtitle: t('commandTaskSubtitle'), path: '/tasks', type: t('navTasks'), icon: Trophy, keywords: 'task challenge solve' },
      { title: t('binaryBlitz'), subtitle: t('commandGamesSubtitle'), path: '/games', type: t('navGames'), icon: Gamepad2, keywords: 'game leaderboard play' },
      {
        title: t('commandAskAi'),
        subtitle: t('commandAskAiSubtitle'),
        type: t('aiAssistant'),
        icon: Sparkles,
        keywords: 'chat helper explain summarize ai',
        action: () => window.dispatchEvent(new CustomEvent('nova-open-ai')),
      },
      {
        title: t('commandAnalyzeCode'),
        subtitle: t('commandAnalyzeCodeSubtitle'),
        path: '/code-editor',
        type: t('aiAssistant'),
        icon: Zap,
        keywords: 'review code realtime errors',
      },
      {
        title: theme === 'light' ? t('switchToDarkMode') : t('switchToLightMode'),
        subtitle: t('changeTheme'),
        type: t('commandTypeCommand'),
        icon: theme === 'light' ? Moon : Sun,
        keywords: 'theme color dark light',
        action: () => setTheme(theme === 'light' ? 'dark' : 'light'),
      },
      {
        title: t('login'),
        subtitle: t('commandLoginSubtitle'),
        type: t('commandTypeAccount'),
        icon: LogIn,
        keywords: 'signin account auth',
        hidden: authenticated,
        action: () => onOpenAuth('login'),
      },
      { title: 'Alex Johnson', subtitle: `${t('leaderboardTopUser')}, ${t('level')} 25`, type: t('commandTypeUsers'), icon: UserRound, keywords: 'user profile leaderboard alex' },
      { title: 'Sarah Chen', subtitle: `${t('leaderboardTopUser')}, ${t('level')} 23`, type: t('commandTypeUsers'), icon: UserRound, keywords: 'user profile leaderboard sarah' },
    ],
    [authenticated, onOpenAuth, setTheme, t, theme]
  )

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return commands
      .filter((item) => !item.hidden)
      .filter((item) => {
        if (!normalized) return true
        return `${item.title} ${item.subtitle} ${item.type} ${item.keywords}`.toLowerCase().includes(normalized)
      })
      .slice(0, 9)
  }, [commands, query])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpen()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onOpen])

  useEffect(() => {
    if (!open) return

    setQuery('')
    setActiveIndex(0)
    window.setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const selectResult = (item) => {
    if (!item) return

    if (item.path) {
      navigate(item.path)
    }

    if (item.action) {
      item.action()
    }

    onClose()
  }

  const onInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, results.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      selectResult(results[activeIndex])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="command-palette-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="command-palette"
            initial={{ opacity: 0, y: -28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="command-search-row">
              <Search size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t('commandSearchPlaceholder')}
              />
              <kbd>Esc</kbd>
            </div>

            <div className="command-results">
              {results.length ? (
                results.map((item, index) => (
                  <button
                    key={`${item.type}-${item.title}`}
                    type="button"
                    className={`command-result ${index === activeIndex ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectResult(item)}
                  >
                    <span className="command-icon">
                      <item.icon size={18} />
                    </span>
                    <span className="command-copy">
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </span>
                    <span className="command-type">{item.type}</span>
                  </button>
                ))
              ) : (
                <div className="command-empty">
                  <Sparkles size={20} />
                  <span>{t('commandNoResults')}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
