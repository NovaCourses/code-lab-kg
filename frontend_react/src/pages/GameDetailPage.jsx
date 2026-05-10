import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Binary, Bug, CheckCircle2, Crown, Gamepad2, Music2, RotateCcw, Timer, Trophy, VolumeX, Zap } from 'lucide-react'
import { apiGet, apiPost } from '../api'
import { useAppContext } from '../contexts'

const makeDecimal = (max = 31) => Math.floor(Math.random() * max) + 1

export default function GameDetailPage() {
  const { slug } = useParams()
  const { lang, t, auth, onOpenAuth } = useAppContext()
  const [data, setData] = useState(null)
  const [statusText, setStatusText] = useState('')
  const [feedback, setFeedback] = useState('')
  const [soundOn, setSoundOn] = useState(true)
  const [burst, setBurst] = useState(false)
  const [binaryState, setBinaryState] = useState({
    round: 1,
    score: 0,
    combo: 0,
    decimal: makeDecimal(),
    value: '',
    done: false,
  })
  const [quizState, setQuizState] = useState({ index: 0, score: 0, combo: 0, done: false })

  const load = useCallback(() => {
    return apiGet(`/api/games/${slug}?lang=${lang}`).then(setData)
  }, [slug, lang])

  useEffect(() => {
    load().catch(() => setData({ game: null, leaderboard: [] }))
    setStatusText('')
    setFeedback('')
    setBinaryState({ round: 1, score: 0, combo: 0, decimal: makeDecimal(), value: '', done: false })
    setQuizState({ index: 0, score: 0, combo: 0, done: false })
  }, [load, slug, lang])

  const questions = useMemo(() => {
    const apiQuestions = data?.game?.questions || []
    if (apiQuestions.length) return apiQuestions
    return [
      { title: t('gameQuestionOutput'), code: 'print(2 + 2 * 2)', choices: ['6', '8', '4'], correct: 0 },
      { title: t('gameQuestionOutput'), code: "print('a' * 3)", choices: ['aaa', 'a3', t('runtimeError')], correct: 0 },
      { title: t('gameQuestionOutput'), code: 'x = [1, 2]\nprint(len(x))', choices: ['1', '2', '3'], correct: 1 },
      { title: t('gameQuestionBool'), code: 'print(5 > 3 and 2 < 1)', choices: ['True', 'False', 'None'], correct: 1 },
    ]
  }, [data?.game?.questions, t])

  const playTone = useCallback((kind) => {
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
      // Audio is optional and depends on browser gesture permissions.
    }
  }, [soundOn])

  const celebrate = useCallback((message) => {
    setFeedback(message)
    setBurst(true)
    window.setTimeout(() => setBurst(false), 850)
  }, [])

  if (!data) return <p className="premium-card">{t('loading')}</p>
  if (!data.game) return <p className="premium-card">{t('gameUnknown')}</p>

  const game = data.game
  const engine = game.engine || slug
  const isBinary = engine === 'binary-blitz' || engine === 'binary-blitz-2'
  const rounds = engine === 'binary-blitz-2' ? 8 : Number(game.config?.rounds || 5)
  const maxDecimal = engine === 'binary-blitz-2' ? 255 : Number(game.config?.maxDecimal || 31)
  const pointsPerCorrect = Number(game.config?.pointsPerCorrect || 10)

  const saveScore = async (score) => {
    if (!auth.authenticated) {
      setStatusText(t('loginToSaveScore'))
      return
    }
    await apiPost(`/api/games/${slug}/score`, { score })
    await load()
    setStatusText(t('scoreSaved'))
  }

  const onBinarySubmit = async (event) => {
    event.preventDefault()
    if (binaryState.done) return
    const expected = binaryState.decimal.toString(2)
    const correct = binaryState.value.trim() === expected
    const nextRound = binaryState.round + 1
    const nextCombo = correct ? binaryState.combo + 1 : 0
    const comboBonus = correct ? Math.max(0, nextCombo - 1) * 2 : 0
    const nextScore = binaryState.score + (correct ? pointsPerCorrect + comboBonus : 0)

    if (correct) {
      playTone('success')
      celebrate(t('gameCorrectFeedback'))
    } else {
      playTone('error')
      setFeedback(`${t('gameWrongFeedback')} ${expected}`)
    }

    if (nextRound > rounds) {
      setBinaryState((prev) => ({ ...prev, score: nextScore, combo: nextCombo, done: true, value: '' }))
      await saveScore(nextScore)
      return
    }

    setBinaryState({
      round: nextRound,
      score: nextScore,
      combo: nextCombo,
      decimal: makeDecimal(maxDecimal),
      value: '',
      done: false,
    })
  }

  const onQuizChoose = async (choiceIndex) => {
    if (quizState.done) return
    const question = questions[quizState.index]
    const correct = choiceIndex === question.correct
    const nextIndex = quizState.index + 1
    const nextCombo = correct ? quizState.combo + 1 : 0
    const nextScore = quizState.score + (correct ? pointsPerCorrect + Math.max(0, nextCombo - 1) * 2 : 0)

    if (correct) {
      playTone('success')
      celebrate(t('gameCorrectFeedback'))
    } else {
      playTone('error')
      setFeedback(t('gameWrongTryAgain'))
    }

    if (nextIndex >= questions.length) {
      setQuizState({ index: nextIndex, score: nextScore, combo: nextCombo, done: true })
      await saveScore(nextScore)
      return
    }
    setQuizState({ index: nextIndex, score: nextScore, combo: nextCombo, done: false })
  }

  const resetGame = () => {
    setFeedback('')
    setStatusText('')
    setBinaryState({ round: 1, score: 0, combo: 0, decimal: makeDecimal(maxDecimal), value: '', done: false })
    setQuizState({ index: 0, score: 0, combo: 0, done: false })
  }

  const renderHud = () => {
    const currentScore = isBinary ? binaryState.score : quizState.score
    const combo = isBinary ? binaryState.combo : quizState.combo
    const currentRound = isBinary ? binaryState.round : Math.min(questions.length, quizState.index + 1)
    const totalRounds = isBinary ? rounds : questions.length
    return (
      <div className="game-hud">
        <span><Trophy size={16} /> {t('score')}: {currentScore}</span>
        <span><Zap size={16} /> {t('gameCombo')}: x{combo || 1}</span>
        <span><Timer size={16} /> {t('round')} {currentRound}/{totalRounds}</span>
      </div>
    )
  }

  const renderBinary = () => (
    <div className="game-stage">
      {!binaryState.done ? (
        <>
          <div className="binary-target">
            <span>{t('convertHintPrefix')}</span>
            <strong>{binaryState.decimal}</strong>
            <small>{t('convertHintSuffix')}</small>
          </div>
          <form className="inline-form game-answer-form" onSubmit={onBinarySubmit}>
            <input value={binaryState.value} onChange={(event) => setBinaryState((prev) => ({ ...prev, value: event.target.value }))} />
            <button className="btn" type="submit">
              <CheckCircle2 size={16} />
              {t('check')}
            </button>
          </form>
        </>
      ) : (
        <div className="game-finish">
          <Crown size={42} />
          <p>
            {t('finalScore')}: <strong>{binaryState.score}</strong>
          </p>
          <button className="premium-button" type="button" onClick={resetGame}>
            <RotateCcw size={16} />
            {t('restart')}
          </button>
        </div>
      )}
    </div>
  )

  const renderQuiz = () => {
    const question = questions[Math.min(quizState.index, questions.length - 1)]
    return (
      <div className="game-stage">
        {!quizState.done ? (
          <>
            <p className="game-question-title">{question.title}</p>
            <pre>{question.code}</pre>
            <div className="choices game-choices">
              {question.choices.map((choice, index) => (
                <button key={`${choice}-${index}`} type="button" className="btn btn-ghost" onClick={() => onQuizChoose(index)}>
                  {choice}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="game-finish">
            <Crown size={42} />
            <p>
              {t('finalScore')}: <strong>{quizState.score}</strong>
            </p>
            <button className="premium-button" type="button" onClick={resetGame}>
              <RotateCcw size={16} />
              {t('restart')}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-grid game-detail-grid">
      <section className="premium-card fade-in game-arena-card">
        <div className="game-topbar">
          <div>
            <p className="section-eyebrow">{t('gameArenaEyebrow')}</p>
            <h1>{game.title}</h1>
            <p>{game.description}</p>
          </div>
          <button className="btn btn-ghost sound-toggle" type="button" onClick={() => setSoundOn((value) => !value)}>
            {soundOn ? <Music2 size={16} /> : <VolumeX size={16} />}
            {soundOn ? t('gameSoundOn') : t('gameSoundOff')}
          </button>
        </div>

        {renderHud()}
        <div className="combo-meter">
          <span style={{ width: `${Math.min(100, ((isBinary ? binaryState.combo : quizState.combo) || 1) * 18)}%` }} />
        </div>

        {game.externalUrl && (
          <a className="game-external-link" href={game.externalUrl} target="_blank" rel="noreferrer">
            <Gamepad2 size={16} />
            {t('gameOpenExternal')}
          </a>
        )}
        {isBinary ? renderBinary() : renderQuiz()}
        {feedback && <p className="game-feedback">{feedback}</p>}
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
