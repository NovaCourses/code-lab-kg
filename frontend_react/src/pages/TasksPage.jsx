import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bug, Clock3, Code2, Grip, HelpCircle, Keyboard, Swords, Target, Timer, Trophy, Zap } from 'lucide-react'
import { apiGet } from '../api'
import { useAppContext } from '../contexts'
import { difficultyLabel } from '../services/utils'

const TASK_TYPE_ICONS = [Bug, Grip, Timer, Swords, HelpCircle, Code2]

const taskTypeFor = (task, index, t) => {
  const types = [
    { label: t('taskTypeCodeFix'), description: t('taskTypeCodeFixText') },
    { label: t('taskTypeDragDrop'), description: t('taskTypeDragDropText') },
    { label: t('taskTypeSpeedCoding'), description: t('taskTypeSpeedCodingText') },
    { label: t('taskTypeQuizBattle'), description: t('taskTypeQuizBattleText') },
    { label: t('taskTypeOutputGuessing'), description: t('taskTypeOutputGuessingText') },
    { label: t('taskTypeAlgorithm'), description: t('taskTypeAlgorithmText') },
  ]
  const difficultyOffset = task.difficulty === 'hard' ? 5 : task.difficulty === 'medium' ? 2 : 0
  return types[(index + difficultyOffset) % types.length]
}

export default function TasksPage() {
  const { lang, t } = useAppContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    apiGet(`/api/tasks?lang=${lang}`)
      .then((data) => setItems(data.items || []))
      .catch(() => setError(t('tasksLoadFailed')))
      .finally(() => setLoading(false))
  }, [lang, t])

  return (
    <section className="page-grid tasks-modern-page">
      <div className="tasks-modern-hero premium-card">
        <div>
          <p className="section-eyebrow">{t('interactiveTasks')}</p>
          <h1 className="page-title">{t('tasksTitle')}</h1>
          <p>{t('tasksModernDescription')}</p>
        </div>
        <div className="task-type-strip" aria-label={t('taskTypes')}>
          {[Bug, Grip, Keyboard, Swords, HelpCircle, Code2].map((Icon, index) => (
            <span className="task-type-pill" key={index}>
              <Icon size={16} />
            </span>
          ))}
        </div>
      </div>

      <div className="cards-grid task-card-grid">
        {loading && <p className="premium-card empty-state-card">{t('loading')}</p>}
        {error && <p className="premium-card empty-state-card alert error">{error}</p>}
        {items.map((task, index) => {
          const Icon = TASK_TYPE_ICONS[index % TASK_TYPE_ICONS.length]
          const type = taskTypeFor(task, index, t)
          const xp = task.xpReward || (task.difficulty === 'hard' ? 120 : task.difficulty === 'medium' ? 80 : 50)
          const progress = Math.min(92, 24 + index * 18)

          return (
            <motion.article
              className="premium-card card task-card floating"
              key={task.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="task-card-top">
                <span className="task-card-icon">
                  <Icon size={20} />
                </span>
                <span className="task-type-badge">{type.label}</span>
              </div>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <p className="task-type-description">{type.description}</p>
              <div className="task-metrics">
                <span>
                  <Trophy size={15} />
                  {xp} XP
                </span>
                <span>
                  <Clock3 size={15} />
                  {task.timeLimitMinutes || (task.difficulty === 'hard' ? 18 : task.difficulty === 'medium' ? 12 : 8)} {t('minuteShort')}
                </span>
                <span>
                  <Zap size={15} />
                  {difficultyLabel(task.difficulty, t)}
                </span>
              </div>
              <div className="mini-progress" aria-label={t('dashboardProgress')}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <Link className="premium-button" to={`/tasks/${task.id}`}>
                <Target size={16} />
                {t('openTask')}
              </Link>
            </motion.article>
          )
        })}
        {!loading && !error && !items.length && <p className="premium-card empty-state-card">{t('emptyTasks')}</p>}
      </div>
    </section>
  )
}
