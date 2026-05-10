import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Bot,
  BookOpen,
  FileImage,
  Gamepad2,
  Globe2,
  History,
  Languages,
  Moon,
  Palette,
  Settings,
  Sun,
  TrendingUp,
  Users,
  Edit3,
  Wand2,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import { useAppContext } from '../contexts'
import { apiPost } from '../api'
import './AdminSidebar.css'

const ADMIN_TABS = [
  { id: 'dashboard', labelKey: 'adminDashboardNav', icon: BarChart3 },
  { id: 'users', labelKey: 'adminUsersNav', icon: Users },
  { id: 'lessons', labelKey: 'adminLessons', icon: BookOpen },
  { id: 'tasks', labelKey: 'adminTasks', icon: Edit3 },
  { id: 'games', labelKey: 'adminGames', icon: Gamepad2 },
  { id: 'analytics', labelKey: 'adminAnalyticsNav', icon: TrendingUp },
  { id: 'ai-tools', labelKey: 'adminAiTools', icon: Bot },
  { id: 'settings', labelKey: 'adminSettings', icon: Settings },
  { id: 'themes', labelKey: 'adminThemes', icon: Palette },
  { id: 'media', labelKey: 'adminMediaLibrary', icon: FileImage },
  { id: 'logs', labelKey: 'adminAuditLogs', icon: History },
  { id: 'editor', labelKey: 'adminContentBuilderNav', icon: Edit3 },
  { id: 'builder', labelKey: 'adminWebsiteBuilderNav', icon: Wand2 },
  { id: 'operations', labelKey: 'adminOperationsNav', icon: ShieldCheck },
]

export default function AdminSidebar({ activeTab, onTabChange, isOpen, onToggle, user }) {
  const { refreshSession, t, theme, setTheme, lang, onSetLanguage } = useAppContext()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await apiPost('/api/auth/logout', {})
      await refreshSession()
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* Mobile toggle button */}
      <button className="admin-sidebar-toggle" onClick={onToggle}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar backdrop for mobile */}
      {isOpen && <div className="admin-sidebar-backdrop" onClick={onToggle} />}

      {/* Sidebar */}
      <motion.aside
        className={`admin-sidebar ${isOpen ? 'open' : 'closed'}`}
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3 }}
      >
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <div className="admin-logo-icon">NC</div>
            <div className="admin-logo-text">
              <div className="admin-logo-title">NovaCourses</div>
              <div className="admin-logo-subtitle">{t('adminPanel')}</div>
            </div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <motion.button
                key={tab.id}
                className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  onTabChange(tab.id)
                  if (window.innerWidth < 768) {
                    onToggle()
                  }
                }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={20} className="admin-nav-icon" />
                <span className="admin-nav-label">{t(tab.labelKey)}</span>
              </motion.button>
            )
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-controls">
            <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === 'light' ? t('themeLight') : t('themeDark')}</span>
            </button>
            <button type="button" onClick={() => onSetLanguage(lang === 'ru' ? 'en' : 'ru')}>
              <Languages size={16} />
              <span>{lang.toUpperCase()}</span>
            </button>
            <a href="/admin/" target="_blank" rel="noreferrer">
              <Globe2 size={16} />
              <span>{t('openAdmin')}</span>
            </a>
          </div>
          <div className="admin-user-section">
            <button
              className="admin-user-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="admin-user-avatar">
                {(user?.fullName || user?.name || user?.full_name || t('adminAdministrator')).charAt(0).toUpperCase()}
              </div>
              <div className="admin-user-info">
                <div className="admin-user-name">{user?.fullName || user?.name || user?.full_name || t('adminAdministrator')}</div>
                <div className="admin-user-email">{user?.email}</div>
              </div>
              <ChevronDown
                size={16}
                className={`admin-user-chevron ${showUserMenu ? 'open' : ''}`}
              />
            </button>

            {showUserMenu && (
              <motion.div
                className="admin-user-menu"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="admin-user-menu-item">
                  <span className="admin-user-menu-label">{t('adminRoleLabel')}</span>
                  <span className="admin-user-menu-value">{t('adminAdministrator')}</span>
                </div>
                <div className="admin-user-menu-divider" />
                <button
                  className="admin-logout-button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut size={16} />
                  {isLoggingOut ? t('adminLoggingOut') : t('adminLogout')}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  )
}
