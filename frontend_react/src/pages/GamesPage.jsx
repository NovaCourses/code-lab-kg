import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Binary, Bug, Gauge, Gamepad2, Keyboard, LockKeyhole, Medal, Music2, Shield, Sparkles, Trophy, Zap } from 'lucide-react'
import { apiGet } from '../api'
import { useAppContext } from '../contexts'

const GAME_ICONS = {
  'binary-blitz': Binary,
  'binary-blitz-2': Binary,
  'bug-hunt': Bug,
  'code-runner-race': Gauge,
  'memory-syntax': Shield,
  'hacker-escape': LockKeyhole,
  'typing-speed-code': Keyboard,
}

export default function GamesPage() {
  const { lang, t } = useAppContext()
  const [items, setItems] = useState([])

  useEffect(() => {
    apiGet(`/api/games?lang=${lang}`).then((data) => setItems(data.items || []))
  }, [lang])

  const stats = useMemo(
    () => [
      { icon: Trophy, label: t('leaderboard'), value: 'Live' },
      { icon: Zap, label: 'XP', value: '+50' },
      { icon: Medal, label: t('achievements'), value: '12' },
      { icon: Music2, label: t('gameAudio'), value: t('gameAudioReady') },
    ],
    [t],
  )

  return (
    <section className="page-grid games-modern-page">
      <div className="games-hero premium-card">
        <div>
          <p className="section-eyebrow">{t('gameArenaEyebrow')}</p>
          <h1 className="page-title">{t('gamesTitle')}</h1>
          <p>{t('gamesModernDescription')}</p>
        </div>
        <div className="games-hero-stats">
          {stats.map((stat) => (
            <span key={stat.label}>
              <stat.icon size={16} />
              <strong>{stat.value}</strong>
              {stat.label}
            </span>
          ))}
        </div>
      </div>

      <div className="games-grid">
        {items.map((game, index) => {
          const Icon = GAME_ICONS[game.slug] || Gamepad2
          const levelCount = game.slug === 'binary-blitz-2' ? 8 : game.engine === 'external' ? 3 : 5
          return (
            <motion.article
              className="game-card-modern"
              key={game.slug}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="game-card-media" style={game.imageUrl ? { backgroundImage: `url(${game.imageUrl})` } : undefined}>
                <div className="game-card-overlay" />
                <span className="game-card-icon">
                  <Icon size={26} />
                </span>
                <span className="game-card-badge">
                  <Sparkles size={14} />
                  {t('gameComboSystem')}
                </span>
              </div>
              <div className="game-card-content">
                <div className="game-mode-row">
                  <span>{game.engine}</span>
                  <span>{levelCount} {t('gameLevels')}</span>
                </div>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
                <div className="game-stat-row">
                  <span>{t('score')}: 0</span>
                  <span>XP +{game.slug === 'binary-blitz-2' ? 120 : 75}</span>
                  <span>{t('gameLeaderboardReady')}</span>
                </div>
                <Link className="premium-button" to={`/games/${game.slug}`}>
                  <Gamepad2 size={16} />
                  {t('play')}
                </Link>
              </div>
            </motion.article>
          )
        })}
        {!items.length && <p className="premium-card empty-state-card">{t('noScores')}</p>}
      </div>
    </section>
  )
}
