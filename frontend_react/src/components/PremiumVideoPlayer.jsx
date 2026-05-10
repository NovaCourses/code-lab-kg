import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  Maximize,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  Settings,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { buildYoutubeEmbedSrc, convertYoutubeToEmbed, getYoutubeThumbnail } from '../services/youtubeUtils'
import { formatDuration } from '../services/lessonExperience'
import './PremiumVideoPlayer.css'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

const PremiumVideoPlayer = memo(function PremiumVideoPlayer({
  videoUrl,
  title = '',
  subtitle = '',
  durationSeconds = 600,
  initialProgress = 0,
  initialWatchedSeconds = 0,
  isCompleted = false,
  autoplayPreference = false,
  hasNextLesson = false,
  hasPreviousLesson = false,
  onAutoplayChange,
  onBookmark,
  onComplete,
  onNextLesson,
  onPreviousLesson,
  onProgress,
  t = (key) => key,
}) {
  const iframeRef = useRef(null)
  const shellRef = useRef(null)
  const completionReportedRef = useRef(isCompleted)
  const saveTickRef = useRef(0)
  const iframeStartRef = useRef(Math.max(0, Math.round(initialWatchedSeconds || 0)))
  const iframeMutedRef = useRef(Boolean(autoplayPreference))
  const latestCallbacksRef = useRef({ onComplete, onProgress })
  const initialPlaybackRef = useRef({
    autoplayPreference,
    initialProgress,
    initialWatchedSeconds,
    isCompleted,
  })
  const embedBase = useMemo(() => convertYoutubeToEmbed(videoUrl), [videoUrl])
  const thumbnail = useMemo(() => getYoutubeThumbnail(videoUrl, 'maxres'), [videoUrl])

  const [hasStarted, setHasStarted] = useState(Boolean(autoplayPreference))
  const [isPlaying, setIsPlaying] = useState(Boolean(autoplayPreference))
  const [isLoading, setIsLoading] = useState(Boolean(autoplayPreference))
  const [showError, setShowError] = useState(!embedBase)
  const [muted, setMuted] = useState(Boolean(autoplayPreference))
  const [speed, setSpeed] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [iframeNonce, setIframeNonce] = useState(0)
  const [watchedSeconds, setWatchedSeconds] = useState(Math.max(0, Math.round(initialWatchedSeconds || 0)))
  const [progress, setProgress] = useState(initialProgress || 0)
  const [showNextPrompt, setShowNextPrompt] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const displayTitle = title || t('lessonVideo')

  const iframeSrc = useMemo(() => {
    if (!embedBase || !hasStarted) return null
    return buildYoutubeEmbedSrc(videoUrl, {
      autoplay: true,
      mute: iframeMutedRef.current,
      start: iframeStartRef.current > 2 ? iframeStartRef.current : 0,
      rel: 0,
      modestbranding: 1,
      controls: 1,
      playsinline: 1,
      enablejsapi: 1,
    })
  }, [embedBase, hasStarted, videoUrl])
  const iframeKey = useMemo(() => `${embedBase || videoUrl || 'youtube'}-${iframeNonce}`, [embedBase, iframeNonce, videoUrl])

  const sendCommand = useCallback((func, args = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      'https://www.youtube.com',
    )
  }, [])

  useEffect(() => {
    latestCallbacksRef.current = { onComplete, onProgress }
  }, [onComplete, onProgress])

  useEffect(() => {
    initialPlaybackRef.current = {
      autoplayPreference,
      initialProgress,
      initialWatchedSeconds,
      isCompleted,
    }
  }, [autoplayPreference, initialProgress, initialWatchedSeconds, isCompleted])

  useEffect(() => {
    const snapshot = initialPlaybackRef.current
    const watched = Math.max(0, Math.round(snapshot.initialWatchedSeconds || 0))
    iframeStartRef.current = watched
    iframeMutedRef.current = Boolean(snapshot.autoplayPreference)
    setHasStarted(Boolean(snapshot.autoplayPreference))
    setIsPlaying(Boolean(snapshot.autoplayPreference))
    setIsLoading(Boolean(snapshot.autoplayPreference))
    setMuted(Boolean(snapshot.autoplayPreference))
    setShowError(!embedBase)
    setShowNextPrompt(false)
    setCountdown(5)
    setWatchedSeconds(watched)
    setProgress(snapshot.initialProgress || 0)
    setIframeNonce(0)
    completionReportedRef.current = Boolean(snapshot.isCompleted)
  }, [embedBase, videoUrl])

  useEffect(() => {
    sendCommand(muted ? 'mute' : 'unMute')
  }, [muted, sendCommand])

  useEffect(() => {
    sendCommand('setPlaybackRate', [speed])
  }, [sendCommand, speed])

  useEffect(() => {
    if (!hasStarted || !isPlaying || showError) return undefined

    const timer = window.setInterval(() => {
      setWatchedSeconds((previous) => {
        const nextSeconds = Math.min(durationSeconds, previous + speed)
        const nextProgress = durationSeconds ? (nextSeconds / durationSeconds) * 100 : 0
        const completed = nextProgress >= 95

        setProgress(nextProgress)
        saveTickRef.current += 1

        if (saveTickRef.current >= 3 || completed) {
          saveTickRef.current = 0
          latestCallbacksRef.current.onProgress?.({
            completed,
            durationSeconds,
            progress: nextProgress,
            watchedSeconds: nextSeconds,
          })
        }

        if (completed && !completionReportedRef.current) {
          completionReportedRef.current = true
          setIsPlaying(false)
          setShowNextPrompt(true)
          latestCallbacksRef.current.onComplete?.({
            durationSeconds,
            progress: 100,
            watchedSeconds: durationSeconds,
          })
        }

        return nextSeconds
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [durationSeconds, hasStarted, isPlaying, showError, speed])

  useEffect(() => {
    if (!showNextPrompt || !autoplayPreference || !hasNextLesson) return undefined

    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          onNextLesson?.()
          return 0
        }
        return value - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [autoplayPreference, hasNextLesson, onNextLesson, showNextPrompt])

  const startPlayback = () => {
    if (!embedBase) {
      setShowError(true)
      return
    }
    iframeMutedRef.current = muted
    iframeStartRef.current = watchedSeconds > 2 ? watchedSeconds : 0
    setHasStarted(true)
    setIsPlaying(true)
    setIsLoading(true)
    window.setTimeout(() => sendCommand('playVideo'), 250)
  }

  const togglePlayback = () => {
    if (!hasStarted) {
      startPlayback()
      return
    }

    const nextPlaying = !isPlaying
    setIsPlaying(nextPlaying)
    sendCommand(nextPlaying ? 'playVideo' : 'pauseVideo')
  }

  const toggleMuted = () => {
    setMuted((value) => !value)
  }

  const retryVideo = () => {
    setShowError(false)
    setIsLoading(true)
    setHasStarted(true)
    setIsPlaying(true)
    iframeMutedRef.current = muted
    iframeStartRef.current = watchedSeconds > 2 ? watchedSeconds : 0
    setIframeNonce((value) => value + 1)
  }

  const handleSeek = (event) => {
    const nextProgress = Number(event.target.value)
    const nextSeconds = Math.round((durationSeconds * nextProgress) / 100)
    setProgress(nextProgress)
    setWatchedSeconds(nextSeconds)
    iframeStartRef.current = nextSeconds
    sendCommand('seekTo', [nextSeconds, true])
    onProgress?.({
      completed: nextProgress >= 95,
      durationSeconds,
      progress: nextProgress,
      watchedSeconds: nextSeconds,
    })
  }

  const handleFullscreen = () => {
    shellRef.current?.requestFullscreen?.()
  }

  const toggleAutoplay = () => {
    onAutoplayChange?.(!autoplayPreference)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: displayTitle, url: window.location.href })
    } else {
      navigator.clipboard?.writeText(window.location.href)
    }
  }

  return (
    <motion.section
      className="nova-player"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      aria-label={displayTitle}
    >
      <div className="nova-player-shell" ref={shellRef}>
        <div className="nova-player-frame" style={{ '--poster': thumbnail ? `url(${thumbnail})` : 'none' }}>
          <div className="nova-player-ambient" aria-hidden="true" />

          <AnimatePresence>
            {!hasStarted && !showError && (
              <motion.button
                type="button"
                className="nova-player-poster"
                onClick={startPlayback}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="nova-player-play-ring">
                  <Play size={34} fill="currentColor" />
                </span>
                <span className="nova-player-poster-copy">
                  <strong>{displayTitle}</strong>
                  <small>{subtitle || t('readyToContinue')}</small>
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isLoading && hasStarted && !showError && (
              <motion.div className="nova-player-skeleton" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div />
                <span>{t('loadingLessonStream')}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showError && (
              <motion.div
                className="nova-player-error"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <AlertTriangle size={32} />
                <strong>{t('videoUnavailable')}</strong>
                <p>{t('videoUnavailableMessage')}</p>
                <div className="nova-player-error-actions">
                  <button type="button" onClick={retryVideo}>
                    <RotateCcw size={16} />
                    {t('retry')}
                  </button>
                  <a href={videoUrl} target="_blank" rel="noreferrer">
                    {t('openYoutube')}
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {iframeSrc && !showError && (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={iframeSrc}
              title={displayTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="nova-player-iframe"
              onLoad={() => {
                setIsLoading(false)
                sendCommand('setPlaybackRate', [speed])
                if (isPlaying) sendCommand('playVideo')
              }}
              onError={() => {
                setIsLoading(false)
                setShowError(true)
              }}
            />
          )}

          <div className="nova-player-topbar">
            <div className="nova-player-title">
              <span className="nova-player-kicker">
                <Clock size={14} />
                {formatDuration(durationSeconds)}
              </span>
              <strong>{displayTitle}</strong>
            </div>
            {isCompleted || progress >= 95 ? (
              <span className="nova-player-complete">
                <CheckCircle2 size={15} />
                {t('completedMetric')}
              </span>
            ) : null}
          </div>

          <div className="nova-player-controls">
            <div className="nova-player-progress-row">
              <span>{formatDuration(watchedSeconds)}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.min(100, Math.round(progress))}
                onChange={handleSeek}
                aria-label={t('lessonProgress')}
              />
              <span>{Math.round(progress)}%</span>
            </div>

            <div className="nova-player-control-row">
              <div className="nova-player-control-group">
                <button type="button" onClick={togglePlayback} title={isPlaying ? t('pause') : t('play')}>
                  {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                </button>
                <button type="button" onClick={toggleMuted} title={muted ? t('unmute') : t('mute')}>
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button type="button" onClick={toggleAutoplay} className={autoplayPreference ? 'is-active' : ''} title={t('autoplay')}>
                  <Repeat2 size={18} />
                </button>
              </div>

              <div className="nova-player-nav-group">
                <button type="button" onClick={onPreviousLesson} disabled={!hasPreviousLesson} title={t('previousLesson')}>
                  <ChevronLeft size={18} />
                </button>
                <button type="button" onClick={onNextLesson} disabled={!hasNextLesson} title={t('nextLesson')}>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="nova-player-control-group">
                <div className="nova-speed-control">
                  <button type="button" onClick={() => setShowSettings((value) => !value)} title={t('playbackSpeed')}>
                    <Gauge size={18} />
                    <span>{speed}x</span>
                  </button>
                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        className="nova-speed-menu"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                      >
                        {SPEEDS.map((item) => (
                          <button
                            type="button"
                            key={item}
                            className={speed === item ? 'is-active' : ''}
                            onClick={() => {
                              setSpeed(item)
                              setShowSettings(false)
                            }}
                          >
                            {item}x
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button type="button" onClick={() => onBookmark?.(watchedSeconds)} title={t('bookmarkTimestamp')}>
                  <Bookmark size={18} />
                </button>
                <button type="button" onClick={handleFullscreen} title={t('fullscreen')}>
                  <Maximize size={18} />
                </button>
                <button type="button" onClick={handleShare} title={t('share')}>
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showNextPrompt && hasNextLesson && (
            <motion.div
              className="nova-next-lesson"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
            >
              <div>
                <span>{t('continueLearning')}</span>
                <strong>{autoplayPreference ? `${t('nextLessonStartsIn')} ${countdown}s` : t('readyForNextLesson')}</strong>
              </div>
              <button type="button" onClick={onNextLesson}>
                {t('nextLesson')}
                <ChevronRight size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
})

PremiumVideoPlayer.displayName = 'PremiumVideoPlayer'

export default PremiumVideoPlayer
