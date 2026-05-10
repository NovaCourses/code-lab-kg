import { Link } from 'react-router-dom'

export function Footer({ user, t }) {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <strong>{t('appName')}</strong>
        <p>{t('footerTagline')}</p>
      </div>
      <div className="footer-links">
        <span>{t('footerQuick')}</span>
        <ul>
          <li>
            <Link to="/lessons">{t('navLessons')}</Link>
          </li>
          <li>
            <Link to="/tasks">{t('navTasks')}</Link>
          </li>
          <li>
            <Link to="/games">{t('navGames')}</Link>
          </li>
          {user?.isAdmin && (
            <li>
              <a href="/admin/" target="_blank" rel="noreferrer">
                {t('openAdmin')}
              </a>
            </li>
          )}
        </ul>
      </div>
      <div className="footer-meta">
        <span>{t('footerContact')}:</span>
        <a href="mailto:support@novacode.local">support@novacode.local</a>
        <span>
          © {new Date().getFullYear()} NovaCode. {t('footerCopyright')}
        </span>
      </div>
    </footer>
  )
}
