import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Code2,
  Gamepad2,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Sparkles,
  Sun,
  Trophy,
  UserPlus,
  Zap,
} from 'lucide-react'

const navItems = [
  { to: '/', labelKey: 'navHome', icon: Home },
  { to: '/dashboard', labelKey: 'navDashboard', icon: LayoutDashboard, protected: true },
  { to: '/code-editor', labelKey: 'navCodeEditor', icon: Code2 },
  { to: '/lessons', labelKey: 'navLessons', icon: BookOpen },
  { to: '/tasks', labelKey: 'navTasks', icon: Trophy },
  { to: '/games', labelKey: 'navGames', icon: Gamepad2 },
]

export default function PremiumSidebar({
  collapsed,
  onToggle,
  onCommandOpen,
  onSetLanguage,
  onOpenAuth,
  onLogout,
  user,
  authenticated,
  t,
  lang,
  theme,
  setTheme,
}) {
  const displayName = user?.fullName || user?.full_name || user?.email || t('guest')
  const xp = user?.xp || 0
  const level = user?.level || 1
  const nextTheme = theme === 'light' ? 'dark' : 'light'
  const closeOnMobile = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches && !collapsed) {
      onToggle()
    }
  }

  return (
    <>
      <button
        className="mobile-sidebar-toggle"
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? t('menuOpen') : t('menuClose')}
        aria-expanded={!collapsed}
      >
        <Menu size={20} />
      </button>
      {!collapsed && <button className="mobile-sidebar-backdrop" type="button" aria-label={t('menuClose')} onClick={onToggle} />}

      <motion.aside
        className={`premium-sidebar ${collapsed ? 'collapsed' : 'expanded'}`}
        initial={{ x: -120, opacity: 0 }}
        animate={{ x: 0, opacity: 1, width: collapsed ? 84 : 288 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="sidebar-content">
          <div className="sidebar-top">
            <NavLink className="sidebar-logo" to="/" onClick={closeOnMobile}>
              <span className="sidebar-logo-mark">N</span>
              {!collapsed && <span className="sidebar-logo-text">NovaCode</span>}
            </NavLink>

            <button className="sidebar-icon-button" type="button" onClick={onToggle} aria-label={collapsed ? t('menuOpen') : t('menuClose')}>
              <Menu size={18} />
            </button>
          </div>

          <button
            className="command-trigger"
            type="button"
            onClick={() => {
              onCommandOpen()
              closeOnMobile()
            }}
          >
            <Search size={18} />
            {!collapsed && (
              <>
                <span>{t('searchEverywhere')}</span>
                <kbd>Ctrl K</kbd>
              </>
            )}
          </button>

          <nav className="sidebar-nav" aria-label="Main navigation">
            {navItems
              .filter((item) => !item.protected || authenticated)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeOnMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={20} />
                  {!collapsed && <span>{t(item.labelKey)}</span>}
                </NavLink>
              ))}

            {user?.isAdmin && (
              <a className="sidebar-link" href="/admin/" target="_blank" rel="noreferrer" onClick={closeOnMobile}>
                <Shield size={20} />
                {!collapsed && <span>{t('navAdmin')}</span>}
              </a>
            )}
          </nav>

          <div className="sidebar-user">
            <div className="sidebar-profile">
              <div className="profile-orb">
                <Sparkles size={18} />
              </div>
              {!collapsed && (
                <div className="profile-copy">
                  <strong>{displayName}</strong>
                  <span>{authenticated ? `${t('level')} ${level}` : t('signInToSyncXp')}</span>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="sidebar-xp-card">
                <div className="sidebar-xp-top">
                  <span>{t('dailyXp')}</span>
                  <strong>{xp}/1250</strong>
                </div>
                <div className="sidebar-xp-track">
                  <span style={{ width: `${Math.min((xp / 1250) * 100, 100)}%` }} />
                </div>
              </div>
            )}

            <div className="sidebar-actions">
              <button type="button" className="sidebar-action chip" onClick={() => setTheme(nextTheme)}>
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                {!collapsed && (
                  <span>
                    {t('theme')}: {theme === 'light' ? t('themeLight') : t('themeDark')}
                  </span>
                )}
              </button>

              <button type="button" className="sidebar-action chip" onClick={() => onSetLanguage(lang === 'ru' ? 'en' : 'ru')}>
                <span className="language-dot">{lang.toUpperCase()}</span>
                {!collapsed && <span>{t('language')}: {lang.toUpperCase()}</span>}
              </button>

              {authenticated ? (
                <button
                  type="button"
                  className="sidebar-action"
                  onClick={() => {
                    onLogout()
                    closeOnMobile()
                  }}
                >
                  <LogOut size={18} />
                  {!collapsed && <span>{t('logout')}</span>}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="sidebar-action"
                    onClick={() => {
                      onOpenAuth('login')
                      closeOnMobile()
                    }}
                  >
                    <LogIn size={18} />
                    {!collapsed && <span>{t('login')}</span>}
                  </button>
                  <button
                    type="button"
                    className="sidebar-action primary"
                    onClick={() => {
                      onOpenAuth('register')
                      closeOnMobile()
                    }}
                  >
                    <UserPlus size={18} />
                    {!collapsed && <span>{t('register')}</span>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/">
          <Home size={19} />
          <span>{t('navHome')}</span>
        </NavLink>
        <NavLink to="/lessons">
          <BookOpen size={19} />
          <span>{t('mobileLearn')}</span>
        </NavLink>
        <button type="button" onClick={onCommandOpen}>
          <Search size={20} />
          <span>{t('search')}</span>
        </button>
        <NavLink to="/code-editor">
          <Code2 size={19} />
          <span>{t('mobileCode')}</span>
        </NavLink>
        <NavLink to="/games">
          <Zap size={19} />
          <span>{t('mobileXp')}</span>
        </NavLink>
      </nav>
    </>
  )
}
