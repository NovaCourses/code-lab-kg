import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Bell, User, Zap, Trophy } from 'lucide-react'

export function Header({
  isOpen,
  onMenuToggle,
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
  return (
    <motion.header
      className="site-header premium-navbar"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="navbar-glass">
        <Link className="brand premium-logo" to="/">
          <motion.div className="logo-glow" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            NovaCode
          </motion.div>
        </Link>

        <div className="navbar-center">
          <div className="search-container">
            <Search className="search-icon" />
            <input type="text" placeholder={t('searchPlaceholder')} className="search-input" />
          </div>
        </div>

        <div className="navbar-actions">
          {authenticated && (
            <>
              <motion.button className="nav-icon-btn" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Bell className="nav-icon" />
                <span className="notification-dot" />
              </motion.button>

              <div className="xp-badge">
                <Zap className="xp-icon" />
                <span>{user?.xp || 0} XP</span>
              </div>

              <div className="level-badge">
                <Trophy className="level-icon" />
                <span>
                  {t('level')} {user?.level || 1}
                </span>
              </div>

              <motion.div className="profile-avatar" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <User className="avatar-icon" />
              </motion.div>
            </>
          )}

          <button
            type="button"
            className="chip theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {t('theme')}: {theme === 'light' ? t('themeLight') : t('themeDark')}
          </button>

          <button
            type="button"
            className="chip lang-toggle"
            onClick={() => onSetLanguage(lang === 'ru' ? 'en' : 'ru')}
          >
            {t('language')}: {lang.toUpperCase()}
          </button>

          {authenticated ? (
            <motion.button className="btn btn-ghost logout-btn" onClick={onLogout} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              {t('logout')}
            </motion.button>
          ) : (
            <>
              <motion.button className="btn btn-ghost" onClick={() => onOpenAuth('login')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {t('login')}
              </motion.button>
              <motion.button
                className="premium-button"
                onClick={() => onOpenAuth('register')}
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)' }}
                whileTap={{ scale: 0.95 }}
              >
                {t('register')}
              </motion.button>
            </>
          )}
        </div>

        <button
          type="button"
          className="menu-toggle premium-menu-toggle"
          aria-expanded={isOpen}
          aria-label={isOpen ? t('menuClose') : t('menuOpen')}
          onClick={onMenuToggle}
        >
          <motion.div
            className="hamburger"
            animate={isOpen ? 'open' : 'closed'}
            variants={{ open: { rotate: 180 }, closed: { rotate: 0 } }}
          >
            <span />
            <span />
            <span />
          </motion.div>
        </button>
      </div>

      <motion.nav
        className={`site-nav premium-nav ${isOpen ? 'open' : ''}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Link to="/" onClick={() => onMenuToggle && onMenuToggle(false)}>
          {t('navHome')}
        </Link>
        {authenticated && (
          <Link to="/dashboard" onClick={() => onMenuToggle && onMenuToggle(false)}>
            {t('navDashboard')}
          </Link>
        )}
        <Link to="/code-editor" onClick={() => onMenuToggle && onMenuToggle(false)}>
          {t('navCodeEditor')}
        </Link>
        <Link to="/lessons" onClick={() => onMenuToggle && onMenuToggle(false)}>
          {t('navLessons')}
        </Link>
        <Link to="/tasks" onClick={() => onMenuToggle && onMenuToggle(false)}>
          {t('navTasks')}
        </Link>
        <Link to="/games" onClick={() => onMenuToggle && onMenuToggle(false)}>
          {t('navGames')}
        </Link>
        {user?.isAdmin && (
          <a href="/admin/" target="_blank" rel="noreferrer" onClick={() => onMenuToggle && onMenuToggle(false)}>
            {t('navAdmin')}
          </a>
        )}
      </motion.nav>
    </motion.header>
  )
}
