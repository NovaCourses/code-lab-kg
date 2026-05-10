import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Binary,
  Bug,
  CheckCircle2,
  Crown,
  Gamepad2,
  Keyboard,
  LockKeyhole,
  Music2,
  RotateCcw,
  Send,
  Timer,
  Trophy,
  VolumeX,
  Zap,
} from 'lucide-react'
import { apiGet, apiPost } from '../api'
import { useAppContext } from '../contexts'

const makeDecimal = (max = 31, min = 1) => Math.floor(Math.random() * (max - min + 1)) + min
const normalizeText = (value) => String(value || '').replace(/\r\n/g, '\n').trim()

const FALLBACK_QUESTIONS = {
  'bug-hunt': [
    { title: 'What is output?', code: 'print(2 + 2 * 2)', choices: ['6', '8', '4'], correct: 0 },
    { title: 'What is output?', code: "print('a' * 3)", choices: ['aaa', 'a3', 'error'], correct: 0 },
    { title: 'What is output?', code: 'x = [1, 2]\nprint(len(x))', choices: ['1', '2', '3'], correct: 1 },
  ],
  'hacker-escape': [
    {
      title: 'Choose the condition that unlocks the admin door.',
      code: "user = {'role': 'admin', 'active': True}",
      choices: ["user['role'] == 'admin' and user['active']", "user['role'] == 'admin' or user['active']", "user['active'] == False"],
      correct: 0,
    },
    {
      title: 'Fix the index guard.',
      code: "codes = ['alpha', 'beta', 'gamma']\nindex = 2",
      choices: ['0 <= index < len(codes)', '0 <= index <= len(codes)', 'index > len(codes)'],
      correct: 0,
    },
  ],
  'typing-race': [
    { title: 'Type the snippet exactly.', code: 'for item in items:\n    print(item.upper())', choices: [''], correct: 0 },
    { title: 'Type the snippet exactly.', code: "squares = [n * n for n in range(10)]", choices: [''], correct: 0 },
  ],
  'output-guess': [
    { title: 'What is the exact output?', code: 'values = [1, 2, 3]\nprint(sum(values))', choices: ['6', '123', '3'], correct: 0 },
    { title: 'What is the exact output?', code: "name = 'Nova'\nprint(name[::-1])", choices: ['avoN', 'Nova', 'navo'], correct: 0 },
  ],
}

function normalizeEngine(game, slug) {
  const engine = game?.engine || slug
  if (engine === 'binary-blitz' || engine === 'binary-blitz-2') return 'binary'
  if (engine === 'typing-speed-code' || engine === 'typing-race' || slug === 'typing-race') return 'typing-race'
  if (engine === 'output-guess' || slug === 'output-guess') return 'output-guess'
  if (engine === 'hacker-escape' || slug === 'hacker-escape') return 'hacker-escape'
  if (engine === 'bug-hunt' || slug === 'bug-hunt') return 'bug-hunt'
  return 'quiz'
}

function GameModeIcon({ mode, size = 28 }) {
  if (mode === 'binary') return <Binary size={size} />
  if (mode === 'bug-hunt') return <Bug size={size} />
  if (mode === 'hacker-escape') return <LockKeyhole size={size} />
  if (mode === 'typing-race') return <Keyboard size={size} />
  return <Gamepad2 size={size} />
}

export default function GameDetailPage() {
  const { slug } = useParams()
  const { lang, t, auth, onOpenAuth, refreshSession, showToast } = useAppContext()
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [statusText, setStatusText] = useState('')
  const [feedback, setFeedback] = useState('')
  const [soundOn, setSoundOn] = useState(true)
  const [burst, setBurst] = useState(false)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [roundIndex, setRoundIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState('playing')
  const [saved, setSaved] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [decimal, setDecimal] = useState(makeDecimal())

  const load = useCallback(() => {
    setLoadError('')
    return apiGet(`/api/games/${slug}?lang=${lang}`)
      .then(setData)
      .catch((error) => {
        setLoadError(error?.body?.detail || t('gameLoadFailed'))
        setData({ game: null, leaderboard: [] })
      })
  }, [slug, lang, t])

  useEffect(() => {
    load()
  }, [load])

  const game = data?.game
  const mode = useMemo(() => normalizeEngine(game, slug), [game, slug])
  const rounds = mode === 'binary' ? Number(game?.config?.rounds || 5) : 0
  const minDecimal = Number(game?.config?.minDecimal || 1)
  const maxDecimal = Number(game?.config?.maxDecimal || (game?.engine === 'binary-blitz-2' ? 255 : 31))
  const pointsPerCorrect = Number(game?.config?.pointsPerCorrect || 10)
  const xpReward = Number(game?.xpReward || game?.config?.xpReward || 75)
  const totalTime = Number(game?.timeLimit || game?.config?.timeLimit || (mode === 'typing-race' ? 60 : 75))

  const questions = useMemo(() => {
    const apiQuestions = game?.questions || []
    const normalized = apiQuestions.length ? apiQuestions : FALLBACK_QUESTIONS[mode] || FALLBACK_QUESTIONS['bug-hunt']
    return normalized.map((question, index) => ({
      id: question.id || index,
      title: question.title,
      code: question.code || '',
      choices: Array.isArray(question.choices) ? question.choices : [],
      correct: Number(question.correct || 0),
    }))
  }, [game?.questions, mode])

  const totalRounds = mode === 'binary' ? rounds : questions.length

  const resetGame = useCallback(() => {
    setStatusText('')
    setFeedback('')
    setScore(0)
    setCombo(0)
    setRoundIndex(0)
    setAnswer('')
    setPhase('playing')
    setSaved(false)
    setSecondsLeft(totalTime)
    setDecimal(makeDecimal(maxDecimal, minDecimal))
  }, [maxDecimal, minDecimal, totalTime])

  useEffect(() => {
    resetGame()
  }, [resetGame, slug, lang])

  useEffect(() => {
    if (!data?.game || phase !== 'playing') return undefined
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          setPhase('lost')
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [data?.game, phase])

  const playTone = useCallback(
    (kind) => {
      if (!soundOn) return
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioContext()
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = kind === 'success' ? 'triangle' : 'sawtooth'
        oscillator.frequency.value = kind === 'success' ? 740 : 220
        gain.gain.setValueAtTime(0.0001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18)
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.start()
        oscillator.stop(ctx.currentTime + 0.2)
      } catch {
        // Browser audio can be blocked until a user gesture; the game still works.
      }
    },
    [soundOn],
  )

  const celebrate = useCallback(
    (message) => {
      setFeedback(message)
      setBurst(true)
      playTone('success')
      window.setTimeout(() => setBurst(false), 850)
    },
    [playTone],
  )

  const saveScore = useCallback(
    async (finalScore) => {
      if (saved || finalScore <= 0) return
      if (!auth.authenticated) {
        setStatusText(t('loginToSaveScore'))
        return
      }

      setSaved(true)
      try {
        const response = await apiPost(`/api/games/${slug}/score`, {
          score: finalScore,
          combo,
          durationSeconds: totalTime - secondsLeft,
        })
        await refreshSession()
        await load()
        setStatusText(`${t('scoreSaved')} ${response?.xpAwarded ? `+${response.xpAwarded} XP` : ''}`)
        if (response?.xpAwarded) {
          showToast({ eyebrow: t('playedGame'), title: game?.title || t('gamesTitle'), xp: response.xpAwarded })
        }
      } catch (error) {
        setSaved(false)
        setStatusText(error?.status === 401 ? t('loginToSaveScore') : t('scoreSaveFailed'))
      }
    },
    [auth.authenticated, combo, game?.title, load, refreshSession, saved, secondsLeft, showToast, slug, t, totalTime],
  )

  useEffect(() => {
    if ((phase === 'won' || phase === 'lost') && score > 0) {
      saveScore(score)
    }
  }, [phase, saveScore, score])

  const finishRound = (correct, expectedText = '') => {
    const nextCombo = correct ? combo + 1 : 0
    const bonus = correct ? Math.max(0, nextCombo - 1) * 2 : 0
    const nextScore = score + (correct ? pointsPerCorrect + bonus : 0)
    const nextRound = roundIndex + 1

    if (correct) {
      celebrate(t('gameCorrectFeedback'))
    } else {
      playTone('error')
      setFeedback(expectedText ? `${t('gameWrongFeedback')} ${expectedText}` : t('gameWrongTryAgain'))
    }

    setScore(nextScore)
    setCombo(nextCombo)
    setAnswer('')

    if (nextRound >= totalRounds) {
      setPhase(nextScore > 0 ? 'won' : 'lost')
      return
    }

    setRoundIndex(nextRound)
    setDecimal(makeDecimal(maxDecimal, minDecimal))
  }

  const onBinarySubmit = (event) => {
    event.preventDefault()
    if (phase !== 'playing') return
    const expected = decimal.toString(2)
    finishRound(normalizeText(answer) === expected, expected)
  }

  const onTypingSubmit = (event) => {
    event.preventDefault()
    if (phase !== 'playing') return
    const question = questions[Math.min(roundIndex, questions.length - 1)]
    const expected = normalizeText(question.code)
    const correct = normalizeText(answer) === expected
    if (!correct) {
      playTone('error')
      setCombo(0)
      setFeedback(t('typingRaceMismatch'))
      return
    }
    finishRound(true)
  }

  const onChoice = (choiceIndex) => {
    if (phase !== 'playing') return
    const question = questions[Math.min(roundIndex, questions.length - 1)]
    const expected = question.choices[question.correct]
    finishRound(choiceIndex === question.correct, expected)
  }

  if (!data) return <p className="premium-card">{t('loading')}</p>
  if (loadError || !data.game) return <p className="premium-card alert error">{loadError || t('gameUnknown')}</p>

  const currentQuestion = questions[Math.min(roundIndex, questions.length - 1)]
  const progress = Math.min(100, Math.round(((roundIndex + (phase === 'playing' ? 0 : 1)) / Math.max(1, totalRounds)) * 100))
  const timePercent = Math.max(0, Math.round((secondsLeft / Math.max(1, totalTime)) * 100))

  const renderHud = () => (
    <div className="game-hud">
      <span><Trophy size={16} /> {t('score')}: {score}</span>
      <span><Zap size={16} /> {t('gameCombo')}: x{combo || 1}</span>
      <span><Timer size={16} /> {t('round')} {Math.min(roundIndex + 1, totalRounds)}/{totalRounds}</span>
      <span><Zap size={16} /> {xpReward} XP</span>
    </div>
  )

  const renderFinish = () => (
    <div className={`game-finish ${phase === 'won' ? 'is-win' : 'is-lose'}`}>
      <Crown size={42} />
      <h2>{phase === 'won' ? t('gameWinTitle') : t('gameLoseTitle')}</h2>
      <p>
        {t('finalScore')}: <strong>{score}</strong>
      </p>
      <button className="premium-button" type="button" onClick={resetGame}>
        <RotateCcw size={16} />
        {t('restart')}
      </button>
    </div>
  )

  const renderBinary = () => (
    <div className="game-stage">
      {phase !== 'playing' ? renderFinish() : (
        <>
          <div className="binary-target">
            <span>{t('convertHintPrefix')}</span>
            <strong>{decimal}</strong>
            <small>{t('convertHintSuffix')}</small>
          </div>
          <form className="inline-form game-answer-form" onSubmit={onBinarySubmit}>
            <input value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" />
            <button className="btn" type="submit">
              <CheckCircle2 size={16} />
              {t('check')}
            </button>
          </form>
        </>
      )}
    </div>
  )

  const renderTyping = () => (
    <div className="game-stage">
      {phase !== 'playing' ? renderFinish() : (
        <>
          <p className="game-question-title">{currentQuestion.title}</p>
          <pre>{currentQuestion.code}</pre>
          <form className="form-stack" onSubmit={onTypingSubmit}>
            <textarea
              className="game-answer-textarea"
              rows={5}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              spellCheck="false"
            />
            <button className="premium-button" type="submit">
              <Send size={16} />
              {t('submit')}
            </button>
          </form>
        </>
      )}
    </div>
  )

  const renderQuiz = () => (
    <div className="game-stage">
      {phase !== 'playing' ? renderFinish() : (
        <>
          <p className="game-question-title">{currentQuestion.title}</p>
          {mode === 'hacker-escape' && <p className="game-lock-label">{t('hackerEscapeStage')} {roundIndex + 1}</p>}
          <pre>{currentQuestion.code}</pre>
          <div className="choices game-choices">
            {currentQuestion.choices.map((choice, index) => (
              <button key={`${choice}-${index}`} type="button" className="btn btn-ghost" onClick={() => onChoice(index)}>
                {choice}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="page-grid game-detail-grid">
      <section className="premium-card fade-in game-arena-card">
        <div className="game-topbar">
          <div>
            <p className="section-eyebrow">{t('gameArenaEyebrow')}</p>
            <h1><GameModeIcon mode={mode} size={28} /> {game.title}</h1>
            <p>{game.description}</p>
          </div>
          <button className="btn btn-ghost sound-toggle" type="button" onClick={() => setSoundOn((value) => !value)}>
            {soundOn ? <Music2 size={16} /> : <VolumeX size={16} />}
            {soundOn ? t('gameSoundOn') : t('gameSoundOff')}
          </button>
        </div>

        {renderHud()}
        <div className="game-progress-grid">
          <div className="combo-meter" aria-label={t('dashboardProgress')}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="combo-meter game-timer-meter" aria-label={t('timer')}>
            <span style={{ width: `${timePercent}%` }} />
          </div>
        </div>

        {game.externalUrl && (
          <a className="game-external-link" href={game.externalUrl} target="_blank" rel="noreferrer">
            <Gamepad2 size={16} />
            {t('gameOpenExternal')}
          </a>
        )}

        {mode === 'binary' && renderBinary()}
        {mode === 'typing-race' && renderTyping()}
        {mode !== 'binary' && mode !== 'typing-race' && renderQuiz()}

        {feedback && <p className={`game-feedback ${phase === 'lost' ? 'is-error' : ''}`}>{feedback}</p>}
        {statusText && <p className="meta-line">{statusText}</p>}
        {!auth.authenticated && (
          <button className="btn btn-ghost" type="button" onClick={() => onOpenAuth('login')}>
            {t('loginToSaveScore')}
          </button>
        )}
        {burst && (
          <div className="confetti-burst" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--i': index }} />)}
          </div>
        )}
      </section>

      <section className="premium-card fade-in leaderboard-panel">
        <h2>{t('leaderboard')}</h2>
        {data.leaderboard.length ? (
          <ol className="score-list">
            {data.leaderboard.map((record) => (
              <li key={record.id}>
                <span>{record.user.fullName}</span>
                <strong>{record.score}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p>{t('noScores')}</p>
        )}
      </section>
    </div>
  )
}
