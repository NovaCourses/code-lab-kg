import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Clock3, HelpCircle, Lightbulb, Send, Timer, Trophy, Zap } from 'lucide-react'
import { apiGet, apiPost } from '../api'
import { useAppContext } from '../contexts'
import { difficultyLabel } from '../services/utils'

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const { lang, t, auth, onOpenAuth } = useAppContext()
  const [data, setData] = useState(null)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState('')
  const [pending, setPending] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [hintOpen, setHintOpen] = useState(false)

  const load = useCallback(() => {
    return apiGet(`/api/tasks/${taskId}?lang=${lang}`).then(setData)
  }, [taskId, lang])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const taskMeta = useMemo(() => {
    const difficulty = data?.task?.difficulty || 'easy'
    const limit = difficulty === 'hard' ? 18 : difficulty === 'medium' ? 12 : 8
    const xp = difficulty === 'hard' ? 120 : difficulty === 'medium' ? 80 : 50
    const progress = Math.min(100, Math.round((elapsed / (limit * 60)) * 100))
    return { limit, xp, progress }
  }, [data?.task?.difficulty, elapsed])

  if (!data) return <p className="premium-card">{t('loading')}</p>

  const submitAnswer = async (event) => {
    event.preventDefault()
    if (!auth.authenticated) {
      onOpenAuth('login')
      return
    }
    if (!answer.trim()) return

    setPending(true)
    try {
      const response = await apiPost(`/api/tasks/${taskId}/submit`, { answer })
      setResult(response.result)
      if (response.result === 'correct') {
        setAnswer('')
      }
      await load()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="page-grid task-detail-layout">
      <section className="premium-card fade-in task-hero-card">
        <p className="section-eyebrow">{t('interactiveTasks')}</p>
        <h1>{data.task.title}</h1>
        <p>{data.task.description}</p>
        <div className="task-status-grid">
          <span>
            <Zap size={16} />
            {difficultyLabel(data.task.difficulty, t)}
          </span>
          <span>
            <Trophy size={16} />
            {taskMeta.xp} XP
          </span>
          <span>
            <Clock3 size={16} />
            {taskMeta.limit} {t('minuteShort')}
          </span>
          <span>
            <Timer size={16} />
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="mini-progress task-timer-progress">
          <span style={{ width: `${taskMeta.progress}%` }} />
        </div>
      </section>

      <section className="premium-card fade-in task-editor-card">
        {result === 'correct' && (
          <p className="alert success task-feedback">
            <CheckCircle2 size={16} />
            {t('resultCorrect')} +{taskMeta.xp} XP
          </p>
        )}
        {result === 'incorrect' && <p className="alert error task-feedback">{t('resultIncorrect')}</p>}

        <form className="form-stack" onSubmit={submitAnswer}>
          <label>
            {t('answer')}
            <textarea rows={8} value={answer} onChange={(event) => setAnswer(event.target.value)} />
          </label>
          <div className="task-actions-row">
            <button type="button" className="btn btn-ghost" onClick={() => setHintOpen((value) => !value)}>
              <HelpCircle size={16} />
              {t('taskHint')}
            </button>
            <button type="submit" className="premium-button" disabled={pending}>
              <Send size={16} />
              {pending ? t('loading') : t('submit')}
            </button>
          </div>
        </form>
        {hintOpen && (
          <div className="task-hint-card">
            <Lightbulb size={18} />
            <p>{t('taskHintText')}</p>
          </div>
        )}
        {!auth.authenticated && <p>{t('loginToSubmit')}</p>}
      </section>

      <section className="premium-card fade-in task-submission-card">
        <h2>{t('mySubmissions')}</h2>
        {data.submissions.length ? (
          <ul className="simple-list">
            {data.submissions.map((submission) => (
              <li key={submission.id}>
                <strong>{submission.isCorrect ? t('correct') : t('incorrect')}</strong> /{' '}
                {new Date(submission.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('noSubmissions')}</p>
        )}
      </section>
    </div>
  )
}
