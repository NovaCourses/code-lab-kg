import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Trash2, Ban, Check, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiGet, apiPost, unwrapAdminResponse } from '../api'
import { useAppContext } from '../contexts'
import './AdminUsers.css'

const roleLabel = (role, t) => ({
  super_admin: t('adminSuperAdmins'),
  moderator: t('adminModerators'),
  editor: t('adminEditors'),
  instructor: t('adminInstructors'),
  admin: t('adminAdmins'),
  user: t('adminUsers'),
}[role] || role.replace('_', ' '))

export default function AdminUsers() {
  const { t } = useAppContext()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(null)
  const [editingXP, setEditingXP] = useState(null)
  const [newXP, setNewXP] = useState(0)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        search: searchTerm,
      })
      if (roleFilter !== 'all') params.set('role', roleFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const response = await apiGet(`/api/admin/users?${params}`)
      const data = unwrapAdminResponse(response)
      setUsers(data.users || [])
      setTotalPages(data.total_pages || data.pages || 1)
      setTotalCount(data.total_count || data.total || 0)
    } catch (err) {
      console.error('Failed to load users:', err)
      setError(t('adminLoadUsersFailed'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, roleFilter, searchTerm, statusFilter, t])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleBanUser = async (userId, isBanned) => {
    setActionLoading(`ban-${userId}`)
    try {
      await apiPost(`/api/admin/users/${userId}/ban`, {
        ban: !isBanned,
      })
      await loadUsers()
    } catch (err) {
      console.error('Ban error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('adminDeleteUserConfirm'))) return

    setActionLoading(`delete-${userId}`)
    try {
      await apiPost(`/api/admin/users/${userId}/delete`, {})
      await loadUsers()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateXP = async (userId) => {
    if (editingXP !== userId) {
      setEditingXP(userId)
      const user = users.find((u) => u.id === userId)
      setNewXP(user?.xp || 0)
      return
    }

    setActionLoading(`xp-${userId}`)
    try {
      await apiPost(`/api/admin/users/${userId}/xp`, {
        xp: parseInt(newXP),
      })
      await loadUsers()
      setEditingXP(null)
    } catch (err) {
      console.error('XP update error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPage(1)
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="admin-users">
      <div className="admin-users-header">
        <h2>{t('adminUsersManagement')}</h2>
        <p className="admin-users-count">{t('adminTotal')}: {totalCount} {t('adminUsersLower')}</p>
      </div>

      {/* Search Bar */}
      <div className="admin-users-search">
        <Search size={18} />
        <input
          type="text"
          placeholder={t('adminSearchUsers')}
          value={searchTerm}
          onChange={handleSearch}
        />
        <select value={roleFilter} onChange={(event) => {
          setRoleFilter(event.target.value)
          setPage(1)
        }}>
          <option value="all">{t('adminAllRoles')}</option>
          <option value="super_admin">{t('adminSuperAdmins')}</option>
          <option value="moderator">{t('adminModerators')}</option>
          <option value="editor">{t('adminEditors')}</option>
          <option value="instructor">{t('adminInstructors')}</option>
          <option value="admin">{t('adminAdmins')}</option>
          <option value="user">{t('adminUsers')}</option>
        </select>
        <select value={statusFilter} onChange={(event) => {
          setStatusFilter(event.target.value)
          setPage(1)
        }}>
          <option value="all">{t('adminAllStatus')}</option>
          <option value="active">{t('adminActive')}</option>
          <option value="banned">{t('adminBanned')}</option>
        </select>
      </div>

      {error && (
        <div className="admin-error-banner">
          <p>{error}</p>
          <button onClick={loadUsers}>{t('adminRetry')}</button>
        </div>
      )}

      {/* Users Table */}
      <div className="admin-users-table-wrapper">
        {loading ? (
          <div className="admin-users-loading">
            <div className="admin-spinner" />
            {t('adminLoadingUsers')}
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            <p>{t('adminNoUsersFound')}</p>
            {searchTerm && <p className="admin-empty-subtitle">{t('adminTryDifferentSearch')}</p>}
          </div>
        ) : (
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>{t('adminId')}</th>
                <th>{t('adminName')}</th>
                <th>{t('adminEmail')}</th>
                <th>XP</th>
                <th>{t('adminLevel')}</th>
                <th>{t('adminLanguage')}</th>
                <th>{t('adminRole')}</th>
                <th>{t('adminStatus')}</th>
                <th>{t('adminActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td>
                    <span className="admin-user-id">#{user.id_short || String(user.id).padStart(4, '0').slice(-4)}</span>
                  </td>
                  <td>{user.name || user.full_name}</td>
                  <td className="admin-email-cell">{user.email}</td>
                  <td>
                    {editingXP === user.id ? (
                      <div className="admin-xp-edit">
                        <input
                          type="number"
                          value={newXP}
                          onChange={(e) => setNewXP(e.target.value)}
                          autoFocus
                        />
                        <button onClick={() => handleUpdateXP(user.id)}>
                          {actionLoading === `xp-${user.id}` ? '...' : t('adminSave')}
                        </button>
                      </div>
                    ) : (
                      <span>{formatNumber(user.xp)}</span>
                    )}
                  </td>
                  <td>{user.level}</td>
                  <td>{(user.language || user.preferred_language || 'en').toUpperCase()}</td>
                  <td>
                    <span className={`admin-role-badge ${user.is_admin ? 'admin' : 'user'}`}>
                      {roleLabel(user.role || (user.is_admin ? 'admin' : 'user'), t)}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-status-badge ${user.is_banned || user.is_active === false ? 'banned' : 'active'}`}>
                      {user.is_banned || user.is_active === false ? t('adminBanned') : t('adminActive')}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions-cell">
                      <button
                        className="admin-action-btn edit-xp"
                        onClick={() => handleUpdateXP(user.id)}
                        disabled={actionLoading === `xp-${user.id}`}
                        title={t('adminEditXp')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className={`admin-action-btn ${user.is_banned ? 'unban' : 'ban'}`}
                        onClick={() => handleBanUser(user.id, user.is_banned || user.is_active === false)}
                        disabled={actionLoading === `ban-${user.id}`}
                        title={user.is_banned || user.is_active === false ? t('adminUnban') : t('adminBan')}
                      >
                        {user.is_banned || user.is_active === false ? (
                          <Check size={16} />
                        ) : (
                          <Ban size={16} />
                        )}
                      </button>
                      <button
                        className="admin-action-btn delete"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={actionLoading === `delete-${user.id}`}
                        title={t('adminDelete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="admin-page-btn"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="admin-page-info">
            {t('adminPage')} {page} {t('adminOf')} {totalPages}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="admin-page-btn"
          >
            <ChevronRight size={18} />
          </button>

          <div className="admin-page-size">
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={10}>10 {t('adminPerPage')}</option>
              <option value={25}>25 {t('adminPerPage')}</option>
              <option value={50}>50 {t('adminPerPage')}</option>
              <option value={100}>100 {t('adminPerPage')}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
