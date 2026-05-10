import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../contexts'
import AdminSidebar from '../components/AdminSidebar'
import AdminDashboard from '../components/AdminDashboard'
import AdminUsers from '../components/AdminUsers'
import AdminCourses from '../components/AdminCourses'
import AdminAnalytics from '../components/AdminAnalytics'
import AdminEditor from '../components/AdminEditor'
import AdminOperations from '../components/AdminOperations'
import AdminWebsiteBuilder from '../components/AdminWebsiteBuilder'
import './AdminPage.css'

export default function AdminPage() {
  const { auth } = useAppContext()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (auth.loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
      </div>
    )
  }

  const isAdmin = auth.user?.isAdmin || auth.user?.is_admin

  if (!auth.authenticated || !isAdmin) {
    return <Navigate to="/" replace />
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard key="dashboard" />
      case 'users':
        return <AdminUsers key="users" />
      case 'courses':
      case 'lessons':
      case 'tasks':
      case 'games':
        return <AdminCourses key="courses" />
      case 'analytics':
        return <AdminAnalytics key="analytics" />
      case 'editor':
        return <AdminEditor key="editor" />
      case 'builder':
      case 'ai-tools':
      case 'themes':
      case 'media':
        return <AdminWebsiteBuilder key="builder" />
      case 'operations':
      case 'settings':
      case 'logs':
        return <AdminOperations key="operations" />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="admin-page">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        user={auth.user}
      />

      <main className={`admin-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="admin-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
