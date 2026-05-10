import { useEffect, useState, memo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiGet } from '../api'
import { useAppContext } from '../contexts'
import {
  Award,
  BookOpen,
  ChevronRight,
  Clock,
  Code,
  Cpu,
  Database,
  Layers,
  Server,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'

const AnimatedCounter = memo(function AnimatedCounter({ value, suffix = '' }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    let frame = 0
    const duration = 1200
    const start = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(value * eased))

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <span>
      {current.toLocaleString()}
      {suffix}
    </span>
  )
})

export default function HomePage() {
  const { lang, auth, t } = useAppContext()
  const [, setLoading] = useState(true)
  const [, setData] = useState({ lessons: [], tasks: [] })
  const [siteSettings, setSiteSettings] = useState(null)
  const [userStats, setUserStats] = useState({
    xp: 0,
    level: 1,
    streak: 0,
    completedLessons: 0,
    totalXP: 1250,
  })

  useEffect(() => {
    let mounted = true
    setLoading(true)
    apiGet(`/api/home?lang=${lang}`)
      .then((result) => {
        if (mounted) {
          setData(result)
          setSiteSettings(result.siteSettings || null)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [lang])

  useEffect(() => {
    if (auth.user) {
      setUserStats({
        xp: auth.user.xp || 0,
        level: auth.user.level || 1,
        streak: auth.user.streak || 0,
        completedLessons: auth.user.completedLessons || 0,
        totalXP: 1250,
      })
    }
  }, [auth.user])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  }

  const liveStats = [
    { label: t('liveStudentsOnline'), value: 1284, suffix: '+' },
    { label: t('liveTasksSolved'), value: 48200, suffix: '+' },
    { label: t('liveXpEarnedToday'), value: 915000, suffix: '+' },
    { label: t('liveActiveBuilders'), value: 392, suffix: '' },
  ]

  const terminalCommands = [
    'npm install future',
    'python build.py',
    'nova ai review --live',
    'deploy learning-os',
  ]

  const technologies = [
    { icon: Code, name: 'Python', color: '#3776AB' },
    { icon: Layers, name: 'JavaScript', color: '#F7DF1E' },
    { icon: Cpu, name: 'React', color: '#61DAFB' },
    { icon: Server, name: 'FastAPI', color: '#009688' },
    { icon: Database, name: 'PostgreSQL', color: '#336791' },
    { icon: Zap, name: 'Docker', color: '#2496ED' },
  ]

  const missions = [
    {
      icon: BookOpen,
      title: t('completeLessonMission'),
      text: t('completeLessonMissionText'),
      progress: '0%',
      count: '0/1',
    },
    {
      icon: Code,
      title: t('solveTaskMission'),
      text: t('solveTaskMissionText'),
      progress: '0%',
      count: '0/1',
    },
    {
      icon: Zap,
      title: t('earnXpMission'),
      text: t('earnXpMissionText'),
      progress: '0%',
      count: '0/50',
    },
  ]

  const features = [
    { icon: BookOpen, title: t('featureLessonsTitle'), text: t('featureLessonsText') },
    { icon: Code, title: t('featureTasksTitle'), text: t('featureTasksText') },
    { icon: Trophy, title: t('featureGamesTitle'), text: t('featureGamesText') },
    { icon: Users, title: t('featureCommunityTitle'), text: t('featureCommunityText') },
  ]

  const achievements = [
    { icon: Star, title: t('sevenDayStreak'), description: t('sevenDayStreakDescription'), unlocked: true },
    { icon: BookOpen, title: t('firstLesson'), description: t('firstLessonDescription'), unlocked: true },
    { icon: Zap, title: '1000 XP', description: t('thousandXpDescription'), unlocked: false },
    { icon: Trophy, title: `${t('level')} 20`, description: t('levelTwentyDescription'), unlocked: false },
  ]

  const leaders = [
    { name: 'Alex Johnson', level: 25, xp: 2450, rank: 1 },
    { name: 'Sarah Chen', level: 23, xp: 2180, rank: 2 },
    { name: 'Mike Wilson', level: 22, xp: 1950, rank: 3 },
    { name: 'Emma Davis', level: 21, xp: 1820, rank: 4 },
    { name: 'John Smith', level: 20, xp: 1680, rank: 5 },
  ]

  const aiFeatures = [
    { icon: Code, label: t('aiExplainCode') },
    { icon: Users, label: t('aiMentor') },
    { icon: Target, label: t('aiCodeReview') },
    { icon: Zap, label: t('aiGenerateTasks') },
  ]

  const cmsHero = siteSettings?.hero || {}
  const cmsTheme = siteSettings?.theme_editor || {}
  const sectionEnabled = (sectionId) => {
    const section = siteSettings?.sections?.find((item) => item.id === sectionId)
    return section ? section.enabled : true
  }
  const pageStyle = {
    '--primary': cmsTheme.primary_color || undefined,
    '--secondary': cmsTheme.secondary_color || undefined,
    '--accent-b': cmsTheme.glow_color || undefined,
    '--font-sans': cmsTheme.font_family || undefined,
    fontSize: cmsTheme.base_font_size ? `${cmsTheme.base_font_size}px` : undefined,
  }
  const heroStyle = cmsHero.background_image
    ? {
        backgroundImage: `linear-gradient(rgba(5,8,22,.72), rgba(5,8,22,.86)), url(${cmsHero.background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  return (
    <motion.div className="homepage-container" style={pageStyle} variants={containerVariants} initial="hidden" animate="visible">
      <section className="hero-section" style={heroStyle}>
        <div className="hero-background">
          <div className="floating-particles">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="particle"
                animate={{
                  x: [0, Math.random() * 100 - 50],
                  y: [0, Math.random() * 100 - 50],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>

        <div className="hero-content">
          <motion.div className="hero-left" variants={itemVariants}>
            <motion.div
              className="hero-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              {cmsHero.badge || t('heroBadge')}
            </motion.div>

            <motion.h1 className="hero-title" variants={itemVariants}>
              {cmsHero.title || t('heroTitle')}
            </motion.h1>

            <motion.p className="hero-subtitle" variants={itemVariants}>
              {cmsHero.subtitle || t('heroDescription')}
            </motion.p>

            <motion.div className="hero-buttons" variants={itemVariants}>
              <motion.div
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(124, 58, 237, 0.5)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Link className="hero-primary-btn" to="/lessons">
                  {cmsHero.primary_button || t('heroStart')}
                  <ChevronRight className="btn-icon" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link className="hero-secondary-btn" to="/dashboard">
                  {cmsHero.secondary_button || t('explorePlatform')}
                </Link>
              </motion.div>
            </motion.div>

            <motion.div className="hero-tech-stack" variants={itemVariants}>
              {['Python', 'React', 'FastAPI', 'AI', 'Docker'].map((tech) => (
                <span key={tech} className="hero-tech-pill">
                  {tech}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div className="hero-right" variants={itemVariants}>
            <div className="code-illustration">
              <motion.div
                className="floating-code-window"
                animate={{
                  y: [0, -10, 0],
                  rotateY: [0, 5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div className="code-window-header">
                  <div className="window-controls">
                    <span className="control red"></span>
                    <span className="control yellow"></span>
                    <span className="control green"></span>
                  </div>
                  <div className="window-title">nova-code.py</div>
                </div>
                <div className="code-content">
                  <pre>
                    <code>
                      {`def create_future():
    skills = ["Python", "AI", "Web"]
    for skill in skills:
        master_skill(skill)
    return "Future Ready!"`}
                    </code>
                  </pre>
                </div>
              </motion.div>

              <motion.div
                className="developer-terminal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <div className="terminal-topline">
                  <span>nova-terminal</span>
                  <strong>{t('terminalLive')}</strong>
                </div>
                <div className="terminal-commands">
                  {terminalCommands.map((command, index) => (
                    <div key={command} className="terminal-command" style={{ '--delay': `${index * 0.45}s` }}>
                      <span>$</span>
                      <code>{command}</code>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div className="orbit-ring" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                <div className="orbit-dot"></div>
              </motion.div>

              <motion.div
                className="ai-hologram"
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Cpu className="hologram-icon" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {sectionEnabled('statistics') && <motion.div className="live-stats-strip" variants={itemVariants}>
          {liveStats.map((stat) => (
            <div key={stat.label} className="live-stat-card">
              <strong>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </motion.div>}

        {auth.authenticated && (
          <motion.div className="user-progress-panel" variants={itemVariants}>
            <div className="progress-card">
              <div className="progress-header">
                <div className="user-avatar">
                  <Users className="avatar-icon" />
                </div>
                <div className="user-info">
                  <h3>{auth.user?.fullName || t('guest')}</h3>
                  <p>
                    {t('level')} {userStats.level}
                  </p>
                </div>
              </div>

              <div className="progress-stats">
                <div className="stat-item">
                  <Zap className="stat-icon" />
                  <div>
                    <span className="stat-value">{userStats.xp}</span>
                    <span className="stat-label">XP</span>
                  </div>
                </div>
                <div className="stat-item">
                  <Target className="stat-icon" />
                  <div>
                    <span className="stat-value">{userStats.streak}</span>
                    <span className="stat-label">{t('currentStreak')}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <BookOpen className="stat-icon" />
                  <div>
                    <span className="stat-value">{userStats.completedLessons}</span>
                    <span className="stat-label">{t('lessonsMetric')}</span>
                  </div>
                </div>
              </div>

              <div className="xp-progress-bar">
                <div className="xp-progress-fill" style={{ width: `${(userStats.xp / userStats.totalXP) * 100}%` }}></div>
                <span className="xp-text">
                  {userStats.xp}/{userStats.totalXP} XP
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {sectionEnabled('courses') && <motion.section className="tech-stack-section" variants={itemVariants}>
        <div className="tech-stack-container">
          <motion.h2 className="section-title" variants={itemVariants}>
            {t('futureTech')}
          </motion.h2>

          <div className="tech-icons-grid">
            {technologies.map((tech) => (
              <motion.div
                key={tech.name}
                className="tech-icon-card"
                variants={itemVariants}
                whileHover={{
                  scale: 1.1,
                  boxShadow: `0 0 30px ${tech.color}40`,
                }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <tech.icon className="tech-icon" style={{ color: tech.color }} />
                <span className="tech-name">{tech.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>}

      {auth.authenticated && sectionEnabled('daily_missions') && (
        <motion.section className="daily-missions-section" variants={itemVariants}>
          <div className="missions-container">
            <motion.h2 className="section-title" variants={itemVariants}>
              {t('dailyMission')}
            </motion.h2>

            <div className="missions-grid">
              {missions.map((mission) => (
                <motion.div key={mission.title} className="mission-card" variants={itemVariants} whileHover={{ scale: 1.02 }}>
                  <div className="mission-icon">
                    <mission.icon />
                  </div>
                  <div className="mission-content">
                    <h3>{mission.title}</h3>
                    <p>{mission.text}</p>
                    <div className="mission-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: mission.progress }}></div>
                      </div>
                      <span>{mission.count}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {sectionEnabled('community') && <motion.section className="features-section" variants={itemVariants}>
        <div className="features-container">
          <motion.h2 className="section-title" variants={itemVariants}>
            {t('platformFeatures')}
          </motion.h2>

          <div className="features-grid">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                className="feature-card"
                variants={itemVariants}
                whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
              >
                <div className="feature-icon">
                  <feature.icon />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>}

      {auth.authenticated && sectionEnabled('courses') && (
        <motion.section className="continue-learning-section" variants={itemVariants}>
          <div className="continue-container">
            <motion.h2 className="section-title" variants={itemVariants}>
              {t('continueLearning')}
            </motion.h2>

            <motion.div className="continue-card" variants={itemVariants} whileHover={{ scale: 1.02 }}>
              <div className="continue-content">
                <div className="continue-info">
                  <h3>{t('continuePythonTitle')}</h3>
                  <p>{t('continuePythonText')}</p>
                  <div className="continue-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '30%' }}></div>
                    </div>
                    <span>30% {t('completedPercent')}</span>
                  </div>
                </div>
                <div className="continue-meta">
                  <div className="meta-item">
                    <Clock className="meta-icon" />
                    <span>
                      15 {t('minuteShort')}
                    </span>
                  </div>
                  <div className="meta-item">
                    <Zap className="meta-icon" />
                    <span>+50 XP</span>
                  </div>
                </div>
              </div>
              <motion.div className="continue-button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/lessons/1">
                  {t('continue')}
                  <ChevronRight />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>
      )}

      {sectionEnabled('achievements') && <motion.section className="achievements-section" variants={itemVariants}>
        <div className="achievements-container">
          <motion.h2 className="section-title" variants={itemVariants}>
            {t('achievements')}
          </motion.h2>

          <div className="achievements-grid">
            {achievements.map((achievement) => (
              <motion.div
                key={achievement.title}
                className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
              >
                <div className="achievement-icon">
                  <achievement.icon />
                </div>
                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>
                {achievement.unlocked && (
                  <div className="achievement-badge">
                    <Award size={14} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>}

      {sectionEnabled('leaderboard') && <motion.section className="leaderboard-section" variants={itemVariants}>
        <div className="leaderboard-container">
          <motion.h2 className="section-title" variants={itemVariants}>
            {t('leaderboard')}
          </motion.h2>

          <div className="leaderboard-card">
            <div className="leaderboard-header">
              <span>{t('weeklyRanking')}</span>
              <TrendingUp className="trend-icon" />
            </div>
            <div className="leaderboard-list">
              {leaders.map((user) => (
                <motion.div
                  key={user.name}
                  className="leaderboard-item"
                  variants={itemVariants}
                  whileHover={{ backgroundColor: 'color-mix(in srgb, var(--panel-strong) 70%, var(--primary) 12%)' }}
                >
                  <div className="rank">#{user.rank}</div>
                  <div className="user-info">
                    <div className="user-avatar-small">
                      <Users className="avatar-small-icon" />
                    </div>
                    <div>
                      <span className="user-name">{user.name}</span>
                      <span className="user-level">
                        {t('level')} {user.level}
                      </span>
                    </div>
                  </div>
                  <div className="user-xp">{user.xp} XP</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>}

      {sectionEnabled('ai_assistant') && <motion.section className="ai-assistant-section" variants={itemVariants}>
        <div className="ai-container">
          <motion.div className="ai-card" variants={itemVariants} whileHover={{ scale: 1.02 }}>
            <div className="ai-header">
              <Cpu className="ai-main-icon" />
              <h2>{t('aiTitle')}</h2>
            </div>
            <p className="ai-description">{t('aiDescription')}</p>
            <div className="ai-features">
              {aiFeatures.map((feature) => (
                <div className="ai-feature" key={feature.label}>
                  <feature.icon className="feature-small-icon" />
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
            <motion.button
              className="ai-button"
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)' }}
              whileTap={{ scale: 0.95 }}
            >
              {t('tryAI')}
            </motion.button>
          </motion.div>
        </div>
      </motion.section>}
    </motion.div>
  )
}
