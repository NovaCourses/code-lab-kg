import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Footer, AuthModal, AIAssistant } from './components'
import AchievementToast from './components/AchievementToast'
import CommandPalette from './components/CommandPalette'
import CursorGlow from './components/CursorGlow'
import LoadingScreen from './components/LoadingScreen'
import PremiumBackground from './components/PremiumBackground'
import PremiumSidebar from './components/PremiumSidebar'
import { useAppContext } from './contexts'
import { apiRequest, apiPost } from './api'
import { normalizeApiError } from './services/utils'
import './app.css'
import './theme.css'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CodeEditorPage = lazy(() => import('./pages/CodeEditorPage'))
const LessonsPage = lazy(() => import('./pages/LessonsPage'))
const LessonDetailPage = lazy(() => import('./pages/LessonDetailPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'))
const GamesPage = lazy(() => import('./pages/GamesPage'))
const GameDetailPage = lazy(() => import('./pages/GameDetailPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

const RouteLoadingFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="route-loading-fallback"
  >
    <div className="loading-spinner" />
  </motion.div>
)

function AppShellContent() {
  const location = useLocation()
  const { theme, setTheme, lang, onSetLanguage, t, auth, refreshSession } = useAppContext()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [commandOpen, setCommandOpen] = useState(false)
  const [booting, setBooting] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [googleError, setGoogleError] = useState('')

  useEffect(() => {
    setCommandOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 1250)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (location.pathname === '/login') {
      setAuthMode('login')
      setAuthModalOpen(true)
    } else if (location.pathname === '/register') {
      setAuthMode('register')
      setAuthModalOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const code = params.get('google_error')
    if (!code) {
      setGoogleError('')
      return
    }

    const normalizedCode = code
      .replace(/[_-]([a-z])/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (char) => char.toUpperCase())
    const messageKey = `googleError${normalizedCode}`
    setGoogleError(t(messageKey))
    setAuthMode('login')
    setAuthModalOpen(true)
  }, [location.search, t])

  const onOpenAuthModal = (mode = 'login') => {
    setAuthError('')
    setGoogleError('')
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const onCloseAuthModal = () => {
    setAuthModalOpen(false)
    setAuthError('')
  }

  const onSubmitAuth = async (payload) => {
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      await apiPost(endpoint, payload)
      await refreshSession()
      onCloseAuthModal()
    } catch (error) {
      setAuthError(normalizeApiError(error, t))
    }
  }

  const onLogout = async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    await refreshSession()
  }

  return (
    <div className={`app-shell with-sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      <LoadingScreen visible={booting} />
      <PremiumBackground />
      <CursorGlow />
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <PremiumSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onCommandOpen={() => setCommandOpen(true)}
        onSetLanguage={onSetLanguage}
        onOpenAuth={onOpenAuthModal}
        onLogout={onLogout}
        user={auth.user}
        authenticated={auth.authenticated}
        t={t}
        lang={lang}
        theme={theme}
        setTheme={setTheme}
      />

      <CommandPalette
        open={commandOpen}
        onOpen={() => setCommandOpen(true)}
        onClose={() => setCommandOpen(false)}
        onOpenAuth={onOpenAuthModal}
        authenticated={auth.authenticated}
        theme={theme}
        setTheme={setTheme}
        t={t}
      />

      <main className={`content-wrap ${location.pathname === '/' ? 'home-content-wrap' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="route-transition"
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/code-editor" element={<CodeEditorPage />} />
                <Route path="/lessons" element={<LessonsPage />} />
                <Route path="/lessons/:lessonId" element={<LessonDetailPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
                <Route path="/games" element={<GamesPage />} />
                <Route path="/games/:slug" element={<GameDetailPage />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/register" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer user={auth.user} t={t} />

      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={onCloseAuthModal}
        onSubmit={onSubmitAuth}
        error={authError || googleError}
        t={t}
        googleEnabled={auth.googleEnabled}
      />

      <AIAssistant />
      <AchievementToast />
    </div>
  )
}

export function AppShell() {
  return (
    <BrowserRouter>
      <AppShellContent />
    </BrowserRouter>
  )
}
