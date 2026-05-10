import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bot,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock3,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Heart,
  HelpCircle,
  ListVideo,
  MessageSquare,
  NotebookPen,
  PlayCircle,
  Reply,
  Send,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react'
import PremiumVideoPlayer from '../components/PremiumVideoPlayer'
import { apiGet, apiPost } from '../api'
import { useAppContext } from '../contexts'
import { convertYoutubeToEmbed, extractYoutubeVideoId, getYoutubeThumbnail } from '../services/youtubeUtils'
import {
  addLessonNote,
  addLocalReply,
  buildLessonVideoKey,
  deleteLessonNote,
  deriveAchievements,
  estimateLessonDuration,
  formatDuration,
  getDiscussionState,
  getLessonAggregate,
  getLessonDifficulty,
  getLessonNotes,
  getLessonProgress,
  getLessonXpReward,
  getQuizResult,
  getWatchHistory,
  saveLessonProgress,
  saveQuizResult,
  toggleLocalCommentLike,
} from '../services/lessonExperience'

function parseDurationToSeconds(value) {
  if (!value) return 0
  const parts = String(value)
    .split(':')
    .map((part) => Number(part.trim()))
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] * 60
}

function buildLessonVideos(lesson, revision = 0) {
  if (!lesson) return []
  const links = lesson.links?.length
    ? lesson.links
    : [
        {
          id: 'legacy',
          title: lesson.title,
          url: lesson.youtubeUrl,
          embedUrl: lesson.embedUrl,
          position: 1,
        },
      ]

  return links.map((link, index) => {
    const url = link.url || link.embedUrl || lesson.youtubeUrl
    const videoId = extractYoutubeVideoId(url)
    const durationSeconds = parseDurationToSeconds(lesson.duration) || estimateLessonDuration(videoId, index)
    const difficulty = lesson.difficulty || getLessonDifficulty(index)
    const progressKey = buildLessonVideoKey(lesson.id, link.id ?? videoId ?? index)
    const saved = getLessonProgress(progressKey)

    return {
      id: link.id ?? `video-${index}`,
      index,
      key: `${link.id ?? videoId ?? index}-${revision}`,
      progressKey,
      title: link.title || lesson.title,
      url,
      embedUrl: convertYoutubeToEmbed(url),
      videoId,
      thumbnail: getYoutubeThumbnail(url, 'high'),
      durationSeconds,
      durationLabel: formatDuration(durationSeconds),
      difficulty,
      xpReward: lesson.xpReward || getLessonXpReward(durationSeconds, difficulty),
      progress: saved?.progress || 0,
      watchedSeconds: saved?.watchedSeconds || 0,
      completed: Boolean(saved?.completed),
      lastWatchedAt: saved?.lastWatchedAt,
    }
  })
}

function buildQuiz(lessonTitle, activeTitle, t) {
  const subject = activeTitle || lessonTitle || t('thisLesson')
  return [
    {
      id: 'practice',
      question: `${t('quizQuestionPracticePrefix')} "${subject}"?`,
      options: [t('quizOptionBuildExample'), t('quizOptionSkipPractice'), t('quizOptionMemorizeTerms')],
      correct: 0,
    },
    {
      id: 'debug',
      question: t('quizQuestionDebug'),
      options: [t('quizOptionErrorText'), t('quizOptionStyleSettings'), t('quizOptionBrowserTheme')],
      correct: 0,
    },
    {
      id: 'repeat',
      question: t('quizQuestionRepeat'),
      options: [t('quizOptionRepeatNotes'), t('quizOptionLeaveTabOpen'), t('quizOptionWatchFastOnly')],
      correct: 0,
    },
  ]
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function LessonDetailPage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { lang, auth, t } = useAppContext()
  const [data, setData] = useState(null)
  const [courseItems, setCourseItems] = useState([])
  const [loadError, setLoadError] = useState('')
  const [localRevision, setLocalRevision] = useState(0)
  const [activeLinkIndex, setActiveLinkIndex] = useState(0)
  const [activeProgress, setActiveProgress] = useState(null)
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem('novacode.videoAutoplay') === 'true')
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [notes, setNotes] = useState([])
  const [discussionState, setDiscussionState] = useState({ likedCommentIds: [], likeCounts: {}, replies: {} })
  const [replyDrafts, setReplyDrafts] = useState({})
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizResult, setQuizResult] = useState(null)

  const load = useCallback(async () => {
    setLoadError('')
    const [lessonData, lessonsData] = await Promise.all([
      apiGet(`/api/lessons/${lessonId}?lang=${lang}`),
      apiGet(`/api/lessons?lang=${lang}`),
    ])
    setData(lessonData)
    setCourseItems(lessonsData.items || [])
  }, [lang, lessonId])

  useEffect(() => {
    load().catch(() => setLoadError(t('lessonLoadFailed')))
  }, [load, t])

  const lesson = data?.lesson
  const videos = useMemo(() => buildLessonVideos(lesson, localRevision), [lesson, localRevision])
  const safeIndex = Math.min(activeLinkIndex, Math.max(videos.length - 1, 0))
  const activeVideo = videos[safeIndex]
  const activeProgressKey = activeVideo?.progressKey
  const activeCourseIndex = courseItems.findIndex((item) => String(item.id) === String(lessonId))
  const nextCourseLesson = activeCourseIndex >= 0 ? courseItems[activeCourseIndex + 1] : null
  const previousCourseLesson = activeCourseIndex > 0 ? courseItems[activeCourseIndex - 1] : null
  const courseProgress = lesson
    ? getLessonAggregate(lesson.id, videos.map((item) => item.progressKey))
    : { progress: 0, completedCount: 0, totalCount: 0 }
  const achievements = deriveAchievements(courseItems.length || 0)
  const watchHistory = getWatchHistory(4)
  const quizQuestions = useMemo(() => buildQuiz(lesson?.title, activeVideo?.title, t), [activeVideo?.title, lesson?.title, t])

  useEffect(() => {
    const queryVideo = Number(searchParams.get('video') || '1') - 1
    if (Number.isFinite(queryVideo) && queryVideo >= 0) {
      setActiveLinkIndex(queryVideo)
    } else {
      setActiveLinkIndex(0)
    }
  }, [lessonId, searchParams])

  useEffect(() => {
    if (!activeProgressKey || !lesson?.id) return
    setNotes(getLessonNotes(activeProgressKey))
    setQuizResult(getQuizResult(activeProgressKey))
    setDiscussionState(getDiscussionState(String(lesson.id)))
    setActiveProgress(getLessonProgress(activeProgressKey))
    setQuizAnswers({})
  }, [activeProgressKey, lesson?.id])

  useEffect(() => {
    localStorage.setItem('novacode.videoAutoplay', String(autoplay))
  }, [autoplay])

  const selectVideo = (index) => {
    const next = new URLSearchParams(searchParams)
    next.set('video', String(index + 1))
    setSearchParams(next)
    setActiveLinkIndex(index)
  }

  const saveProgress = useCallback((payload) => {
    if (!activeVideo || !lesson) return null
    const record = saveLessonProgress(activeVideo.progressKey, {
      ...payload,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      title: activeVideo.title,
      videoIndex: activeVideo.index,
      url: activeVideo.url,
      thumbnail: activeVideo.thumbnail,
      durationSeconds: activeVideo.durationSeconds,
    })
    setActiveProgress(record)
    const previousProgressBucket = Math.floor((activeVideo.progress || 0) / 10)
    const nextProgressBucket = Math.floor((record.progress || 0) / 10)
    if (record.completed || nextProgressBucket > previousProgressBucket) {
      setLocalRevision((value) => value + 1)
    }
    return record
  }, [activeVideo, lesson])

  const goNext = () => {
    if (safeIndex < videos.length - 1) {
      selectVideo(safeIndex + 1)
      return
    }
    if (nextCourseLesson) {
      navigate(`/lessons/${nextCourseLesson.id}`)
    }
  }

  const goPrevious = () => {
    if (safeIndex > 0) {
      selectVideo(safeIndex - 1)
      return
    }
    if (previousCourseLesson) {
      navigate(`/lessons/${previousCourseLesson.id}`)
    }
  }

  const addNote = (isBookmark = false, timestampSeconds = activeProgress?.watchedSeconds || 0) => {
    if (!activeVideo) return
    const content = isBookmark ? `${t('bookmarkAt')} ${formatDuration(timestampSeconds)}` : noteText
    if (!content.trim()) return
    addLessonNote(activeVideo.progressKey, {
      content,
      isBookmark,
      timestampSeconds,
    })
    setNotes(getLessonNotes(activeVideo.progressKey))
    setNoteText('')
  }

  const removeNote = (noteId) => {
    if (!activeVideo) return
    setNotes(deleteLessonNote(activeVideo.progressKey, noteId))
  }

  const submitComment = async (event) => {
    event.preventDefault()
    if (!auth.authenticated) {
      navigate('/login')
      return
    }
    if (!comment.trim()) return
    setPending(true)
    try {
      await apiPost(`/api/lessons/${lessonId}/comments`, { content: comment })
      setComment('')
      await load()
    } finally {
      setPending(false)
    }
  }

  const likeComment = (commentId) => {
    if (!lesson) return
    setDiscussionState(toggleLocalCommentLike(String(lesson.id), commentId))
  }

  const submitReply = (commentId) => {
    if (!lesson) return
    const nextState = addLocalReply(String(lesson.id), commentId, replyDrafts[commentId] || '')
    setDiscussionState(nextState)
    setReplyDrafts((value) => ({ ...value, [commentId]: '' }))
  }

  const openAiPrompt = (prompt) => {
    window.dispatchEvent(new CustomEvent('nova-ai-prompt', { detail: { prompt } }))
  }

  const exportBrief = () => {
    if (!lesson || !activeVideo) return
    downloadTextFile(
      `novacode-${lesson.id}-${safeIndex + 1}-lesson-brief.md`,
      `# ${activeVideo.title}\n\n${lesson.description}\n\nVideo: ${activeVideo.url}\nProgress: ${Math.round(activeVideo.progress)}%\n\n## Practice\n- Rebuild the smallest example from the lesson.\n- Write one question for the AI assistant.\n- Add a timestamped note for the hardest idea.\n`,
    )
  }

  const submitQuiz = () => {
    if (!activeVideo) return
    const score = quizQuestions.reduce((sum, question) => {
      return sum + (Number(quizAnswers[question.id]) === question.correct ? 1 : 0)
    }, 0)
    const passed = score >= Math.ceil(quizQuestions.length * 0.67)
    const result = saveQuizResult(activeVideo.progressKey, {
      score,
      maxScore: quizQuestions.length,
      passed,
      xpEarned: passed ? activeVideo.xpReward : Math.round(activeVideo.xpReward / 3),
      badge: passed ? t('lessonBadge') : null,
    })
    setQuizResult(result)
    if (passed) {
      saveProgress({ completed: true, progress: 100, watchedSeconds: activeVideo.durationSeconds })
    }
  }

  if (loadError) {
    return (
      <section className="lesson-studio-empty">
        <AlertState title={t('lessonUnavailable')} message={loadError} onRetry={load} t={t} />
      </section>
    )
  }

  if (!data || !activeVideo) {
    return (
      <section className="lesson-studio-loading">
        <div />
        <span>{t('preparingLessonStudio')}</span>
      </section>
    )
  }

  const hasNext = safeIndex < videos.length - 1 || Boolean(nextCourseLesson)
  const hasPrevious = safeIndex > 0 || Boolean(previousCourseLesson)
  const currentWatched = activeProgress?.watchedSeconds ?? activeVideo.watchedSeconds
  const completedVideoCount = videos.filter((item) => item.completed).length

  return (
    <section className="lesson-studio">
      <header className="lesson-studio-header">
        <div>
          <span className="lesson-studio-eyebrow">
            <PlayCircle size={16} />
            {t('cinematicLessonExperience')}
          </span>
          <h1>{lesson.title}</h1>
          <p>{lesson.description}</p>
        </div>
        <div className="lesson-studio-status">
          <strong>{Math.round(courseProgress.progress)}%</strong>
          <span>{completedVideoCount}/{videos.length} {t('videosComplete')}</span>
          <div className="lesson-studio-status-bar">
            <span style={{ width: `${courseProgress.progress}%` }} />
          </div>
        </div>
      </header>

      <div className="lesson-studio-layout">
        <main className="lesson-studio-main">
          <PremiumVideoPlayer
            key={activeVideo.progressKey}
            videoUrl={activeVideo.url}
            title={activeVideo.title}
            subtitle={`${activeVideo.difficulty} ${t('lessonLower')} - ${activeVideo.xpReward} XP`}
            durationSeconds={activeVideo.durationSeconds}
            initialProgress={activeVideo.progress}
            initialWatchedSeconds={activeVideo.watchedSeconds}
            isCompleted={activeVideo.completed}
            autoplayPreference={autoplay}
            hasNextLesson={hasNext}
            hasPreviousLesson={hasPrevious}
            onAutoplayChange={setAutoplay}
            onBookmark={(timestamp) => addNote(true, timestamp)}
            onComplete={(payload) => saveProgress(payload)}
            onNextLesson={goNext}
            onPreviousLesson={goPrevious}
            onProgress={saveProgress}
            t={t}
          />

          <div className="lesson-insight-grid">
            <section className="lesson-panel lesson-ai-panel">
              <div className="lesson-panel-heading">
                <Bot size={20} />
                <div>
                  <h2>{t('aiLessonAssistant')}</h2>
                  <p>{t('aiLessonAssistantText')}</p>
                </div>
              </div>
              <div className="lesson-ai-actions">
                {[
                  [t('summarizeLesson'), `${t('summarizeLessonPrompt')} "${activeVideo.title}".`],
                  [t('explainCode'), `${t('explainCodePrompt')} "${activeVideo.title}".`],
                  [t('quizMe'), `${t('quizMePrompt')} "${activeVideo.title}".`],
                  [t('makePractice'), `${t('makePracticePrompt')} "${activeVideo.title}".`],
                ].map(([label, prompt]) => (
                  <button type="button" key={label} onClick={() => openAiPrompt(prompt)}>
                    <Sparkles size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="lesson-panel">
              <div className="lesson-panel-heading">
                <NotebookPen size={20} />
                <div>
                  <h2>{t('notesBookmarks')}</h2>
                  <p>{t('notesBookmarksText')}</p>
                </div>
              </div>
              <div className="lesson-note-composer">
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  rows={3}
                  placeholder={t('writeTimestampedNote')}
                />
                <div>
                  <span>{formatDuration(currentWatched || 0)}</span>
                  <button type="button" onClick={() => addNote(false)}>
                    <Send size={16} />
                    {t('saveNote')}
                  </button>
                </div>
              </div>
              <div className="lesson-notes-list">
                {notes.length ? notes.map((note) => (
                  <article key={note.id} className="lesson-note-item">
                    <span>
                      {note.isBookmark ? <Bookmark size={14} /> : <Clock3 size={14} />}
                      {formatDuration(note.timestampSeconds)}
                    </span>
                    <p>{note.content}</p>
                    <button type="button" onClick={() => removeNote(note.id)}>{t('remove')}</button>
                  </article>
                )) : <p className="lesson-muted">{t('noNotesYet')}</p>}
              </div>
            </section>
          </div>

          <div className="lesson-insight-grid bottom">
            <LessonResources
              activeVideo={activeVideo}
              lesson={lesson}
              onExportBrief={exportBrief}
              t={t}
            />
            <LessonQuiz
              questions={quizQuestions}
              answers={quizAnswers}
              setAnswers={setQuizAnswers}
              result={quizResult}
              onSubmit={submitQuiz}
              xpReward={activeVideo.xpReward}
              t={t}
            />
          </div>

          <section className="lesson-panel lesson-comments-panel">
            <div className="lesson-panel-heading">
                <MessageSquare size={20} />
                <div>
                <h2>{t('lessonDiscussion')}</h2>
                <p>{t('lessonDiscussionText')}</p>
                </div>
              </div>
            <form className="lesson-comment-form" onSubmit={submitComment}>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder={t('shareQuestionInsight')} />
              <button type="submit" disabled={pending}>
                <Send size={16} />
                {t('postComment')}
              </button>
            </form>
            {!auth.authenticated && <p className="lesson-muted">{t('loginToComment')}</p>}
            <div className="lesson-comments-list">
              {data.comments.length ? data.comments.map((item) => {
                const id = String(item.id)
                const liked = discussionState.likedCommentIds.includes(id)
                const replies = discussionState.replies[id] || []
                return (
                  <article key={item.id} className="lesson-comment-item">
                    <div className="lesson-comment-top">
                      <strong>{item.author.fullName}</strong>
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{item.content}</p>
                    <div className="lesson-comment-actions">
                      <button type="button" className={liked ? 'is-active' : ''} onClick={() => likeComment(item.id)}>
                        <Heart size={15} />
                        {discussionState.likeCounts[id] || 0}
                      </button>
                      <button type="button" onClick={() => setReplyDrafts((value) => ({ ...value, [id]: value[id] ?? '' }))}>
                        <Reply size={15} />
                        {t('reply')}
                      </button>
                    </div>
                    {replyDrafts[id] !== undefined && (
                      <div className="lesson-reply-box">
                        <input
                          value={replyDrafts[id]}
                          onChange={(event) => setReplyDrafts((value) => ({ ...value, [id]: event.target.value }))}
                          placeholder={t('writeReply')}
                        />
                        <button type="button" onClick={() => submitReply(id)}>{t('send')}</button>
                      </div>
                    )}
                    {replies.length ? (
                      <div className="lesson-replies">
                        {replies.map((reply) => (
                          <div key={reply.id}>
                            <strong>{reply.author}</strong>
                            <span>{new Date(reply.createdAt).toLocaleString()}</span>
                            <p>{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                )
              }) : <p className="lesson-muted">{t('noComments')}</p>}
            </div>
          </section>
        </main>

        <aside className="lesson-studio-sidebar">
          <section className="lesson-sidebar-panel">
            <div className="lesson-sidebar-title">
              <ListVideo size={19} />
              <div>
                <h2>{t('lessonPlaylist')}</h2>
                <span>{videos.length} {t('videosLower')}</span>
              </div>
            </div>
            <div className="lesson-playlist-modern">
              {videos.map((video, index) => (
                <button
                  type="button"
                  key={video.key}
                  className={`lesson-video-card ${index === safeIndex ? 'is-current' : ''} ${video.completed ? 'is-complete' : ''}`}
                  onClick={() => selectVideo(index)}
                >
                  <span className="lesson-video-thumb" style={{ backgroundImage: video.thumbnail ? `url(${video.thumbnail})` : undefined }}>
                    {video.completed ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}
                  </span>
                  <span className="lesson-video-copy">
                    <strong>{video.title}</strong>
                    <small>
                      {video.durationLabel} · {video.difficulty} · {video.xpReward} XP
                    </small>
                    <span className="lesson-video-progress">
                      <i style={{ width: `${video.progress}%` }} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="lesson-sidebar-panel">
            <div className="lesson-sidebar-title">
              <Trophy size={19} />
              <div>
                <h2>{t('achievements')}</h2>
                <span>{t('learningBadges')}</span>
              </div>
            </div>
            <div className="lesson-achievement-list">
              {achievements.map((item) => (
                <article key={item.id} className={item.unlocked ? 'is-unlocked' : ''}>
                  <Star size={16} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.progress}/{item.target}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="lesson-sidebar-panel">
            <div className="lesson-sidebar-title">
              <BookOpen size={19} />
              <div>
                <h2>{t('continueLearning')}</h2>
                <span>{t('watchHistory')}</span>
              </div>
            </div>
            <div className="lesson-history-list">
              {watchHistory.length ? watchHistory.map((item) => (
                <Link key={item.key} to={`/lessons/${item.lessonId}`}>
                  <strong>{item.title}</strong>
                  <span>{Math.round(item.progress || 0)}% {t('watched')}</span>
                </Link>
              )) : <p className="lesson-muted">{t('historyAfterVideo')}</p>}
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}

function AlertState({ title, message, onRetry, t }) {
  return (
    <div className="lesson-panel lesson-alert-state">
      <HelpCircle size={30} />
      <h1>{title}</h1>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>{t('retry')}</button>
    </div>
  )
}

function LessonResources({ activeVideo, lesson, onExportBrief, t }) {
  const githubUrl = `https://github.com/search?q=${encodeURIComponent(`${lesson.title} ${activeVideo.title} example`)}`

  return (
    <section className="lesson-panel">
      <div className="lesson-panel-heading">
        <FileText size={20} />
        <div>
          <h2>{t('resources')}</h2>
          <p>{t('resourcesText')}</p>
        </div>
      </div>
      <div className="lesson-resource-grid">
        <button type="button" onClick={onExportBrief}>
          <Download size={17} />
          {t('downloadBrief')}
        </button>
        <button type="button" onClick={() => window.print()}>
          <FileText size={17} />
          {t('exportPdf')}
        </button>
        <a href={githubUrl} target="_blank" rel="noreferrer">
          <Code2 size={17} />
          {t('githubExamples')}
        </a>
        <a href={activeVideo.url} target="_blank" rel="noreferrer">
          <ExternalLink size={17} />
          {t('youtubeSource')}
        </a>
      </div>
      <pre className="lesson-code-example">{`// ${t('codePracticeLoop')}
const lesson = "${activeVideo.title}";
console.log("${t('practice')}:", lesson);
// ${t('codePracticeAdvice')}`}</pre>
    </section>
  )
}

function LessonQuiz({ questions, answers, setAnswers, result, onSubmit, xpReward, t }) {
  const answeredCount = questions.filter((question) => answers[question.id] !== undefined).length

  return (
    <section className="lesson-panel">
      <div className="lesson-panel-heading">
        <Zap size={20} />
        <div>
          <h2>{t('miniQuiz')}</h2>
          <p>{t('miniQuizText')}</p>
        </div>
      </div>
      <div className="lesson-quiz-list">
        {questions.map((question) => (
          <fieldset key={question.id}>
            <legend>{question.question}</legend>
            {question.options.map((option, index) => (
              <label key={option}>
                <input
                  type="radio"
                  name={question.id}
                  checked={Number(answers[question.id]) === index}
                  onChange={() => setAnswers((value) => ({ ...value, [question.id]: index }))}
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="lesson-quiz-footer">
        <span>{answeredCount}/{questions.length} {t('answered')} · {xpReward} XP</span>
        <button type="button" onClick={onSubmit} disabled={answeredCount < questions.length}>
          {t('checkQuiz')}
        </button>
      </div>
      {result && (
        <motion.div className="lesson-quiz-result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Trophy size={18} />
          <strong>{result.score}/{result.maxScore}</strong>
          <span>{result.passed ? `${t('badgeEarned')}, +${result.xpEarned} XP` : `${t('keepPracticing')}, +${result.xpEarned} XP`}</span>
        </motion.div>
      )}
    </section>
  )
}
