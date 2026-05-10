import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Clock3, HelpCircle, Lightbulb, Send, Timer, Trophy, XCircle, Zap } from 'lucide-react'
import { apiGet, apiPost } from '../api'
import { useAppContext } from '../contexts'
import { difficultyLabel } from '../services/utils'

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const { lang, t, auth, onOpenAuth, refreshSession, showToast } = useAppContext()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [xpAwarded, setXpAwarded] = useState(0)
  const [pending, setPending] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [hintOpen, setHintOpen] = useState(false)
  const [burst, setBurst] = useState(false)

  const load = useCallback(() => {
    setError('')
    return apiGet(`/api/tasks/${taskId}?lang=${lang}`)
      .then(setData)
      .catch((loadError) => {
        setError(loadError?.body?.detail || t('taskLoadFailed'))
        setData(null)
      })
  }, [taskId, lang, t])

  useEffect(() => {
    setElapsed(0)
    setResult('')
    setSubmitError('')
    setXpAwarded(0)
    setAnswer('')
    load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const taskMeta = useMemo(() => {
    const difficulty = data?.task?.difficulty || 'easy'
    const limit = data?.task?.timeLimitMinutes || (difficulty === 'hard' ? 18 : difficulty === 'medium' ? 12 : 8)
    const xp = data?.task?.xpReward || (difficulty === 'hard' ? 120 : difficulty === 'medium' ? 80 : 50)
    const progress = Math.min(100, Math.round((elapsed / (limit * 60)) * 100))
    return { limit, xp, progress }
  }, [data?.task?.difficulty, data?.task?.timeLimitMinutes, data?.task?.xpReward, elapsed])

  const submitAnswer = async (event) => {
    event?.preventDefault?.()
    if (pending) return
    if (!answer.trim()) {
      setSubmitError(t('resultIncorrect'))
      return
    }

    setPending(true)
    setResult('')
    setSubmitError('')
    setXpAwarded(0)
    try {
      const response = await apiPost(`/api/tasks/${taskId}/submit`, { answer })
      setResult(response.result)
      setXpAwarded(response.xpAwarded || 0)
      if (response.result === 'correct') {
        setAnswer('')
        setBurst(true)
        window.setTimeout(() => setBurst(false), 900)
        if (response.xpAwarded) {
          await refreshSession()
          showToast({ eyebrow: t('solvedTask'), title: data?.task?.title || t('tasksTitle'), xp: response.xpAwarded })
        } else if (response.requiresAuthForSave) {
          showToast({ eyebrow: t('resultCorrect'), title: t('loginToSubmit'), xp: 0 })
        }
      }
      await load()
    } catch (submitRequestError) {
      setSubmitError(submitRequestError?.status === 401 ? t('loginToSubmit') : t('taskSubmitFailed'))
    } finally {
      setPending(false)
    }
  }

  if (error) return <p className="premium-card alert error">{error}</p>
  if (!data) return <p className="premium-card">{t('loading')}</p>

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
            {t('resultCorrect')} +{xpAwarded || 0} XP
          </p>
        )}
        {result === 'incorrect' && (
          <p className="alert error task-feedback">
            <XCircle size={16} />
            {t('resultIncorrect')}
          </p>
        )}
        {submitError && (
          <p className="alert error task-feedback">
            <XCircle size={16} />
            {submitError}
          </p>
        )}

        <form className="form-stack" onSubmit={submitAnswer}>
          <label>
            {t('answer')}
            <textarea
              className="task-code-editor"
              rows={10}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault()
                  submitAnswer(event)
                }
              }}
              placeholder={t('taskAnswerPlaceholder')}
              spellCheck="false"
            />
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
            <p>{data.task.hint || t('taskHintText')}</p>
          </div>
        )}
        {!auth.authenticated && (
          <p className="meta-line">
            {t('answerWithoutLogin')}
            <button className="inline-link-button" type="button" onClick={() => onOpenAuth('login')}>
              {t('login')}
            </button>
          </p>
        )}
        {burst && (
          <div className="confetti-burst" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--i': index }} />)}
          </div>
        )}
      </section>

      <section className="premium-card fade-in task-submission-card">
        <h2>{t('mySubmissions')}</h2>
        {data.submissions.length ? (
          <ul className="simple-list submission-history-list">
            {data.submissions.map((submission) => (
              <li key={submission.id}>
                <strong>{submission.isCorrect ? t('correct') : t('incorrect')}</strong>
                <span>{new Date(submission.createdAt).toLocaleString()}</span>
                <code>{submission.answer.slice(0, 120)}</code>
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
