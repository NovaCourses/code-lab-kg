import { createContext, useContext, useCallback, useState, useEffect } from 'react'
import { useTranslator } from '../hooks'
import { apiGet, apiPost } from '../api'

const LANGUAGES = ['en', 'ru']

const AppContext = createContext()

function pickStoredValue(key, fallback, allowed = null) {
  if (typeof window === 'undefined') return fallback
  const stored = window.localStorage.getItem(key)
  if (!stored) return fallback
  if (allowed && !allowed.includes(stored)) return fallback
  return stored
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => pickStoredValue('novacode-theme', 'light', ['light', 'dark']))
  const [lang, setLang] = useState(() => pickStoredValue('novacode-lang', 'ru', LANGUAGES))
  const [session, setSession] = useState({
    loading: true,
    authenticated: false,
    googleEnabled: false,
    user: null,
  })
  const t = useTranslator(lang)

  const refreshSession = useCallback(async () => {
    const data = await apiGet('/api/auth/me')
    setSession({
      loading: false,
      authenticated: data.authenticated,
      googleEnabled: data.googleEnabled,
      user: data.user,
    })
  }, [])

  useEffect(() => {
    document.body.dataset.theme = theme
    localStorage.setItem('novacode-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('novacode-lang', lang)
  }, [lang])

  useEffect(() => {
    refreshSession().catch(() =>
      setSession({
        loading: false,
        authenticated: false,
        googleEnabled: false,
        user: null,
      }),
    )
  }, [refreshSession])

  const onSetLanguage = async (nextLang) => {
    if (!LANGUAGES.includes(nextLang)) return
    setLang(nextLang)
    try {
      await apiPost(`/api/localization/${nextLang}`, {})
      await refreshSession()
    } catch {
      // Local state stays consistent even if session update fails.
    }
  }

  const context = {
    theme,
    setTheme,
    lang,
    onSetLanguage,
    t,
    auth: session,
    refreshSession,
  }

  return <AppContext.Provider value={context}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
