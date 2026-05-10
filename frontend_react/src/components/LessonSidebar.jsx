import { useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Play, Check, Lock, Volume2, BookOpen } from 'lucide-react'
import './LessonSidebar.css'

const LessonSidebar = memo(function LessonSidebar({
  lessons = [],
  currentLessonId,
  completedLessonIds = [],
  onSelectLesson,
  isOpen = true,
}) {
  const [expandedModule, setExpandedModule] = useState(null)

  // Group lessons by modules
  const groupedLessons = lessons.reduce((acc, lesson, idx) => {
    const moduleIdx = Math.floor(idx / 5) // Group by 5 lessons per module
    if (!acc[moduleIdx]) {
      acc[moduleIdx] = { title: `Module ${moduleIdx + 1}`, lessons: [] }
    }
    acc[moduleIdx].lessons.push(lesson)
    return acc
  }, [])

  const toggleModule = (idx) => {
    setExpandedModule(expandedModule === idx ? null : idx)
  }

  if (!isOpen) return null

  return (
    <motion.aside
      className="lesson-sidebar"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="sidebar-header">
        <div className="header-content">
          <BookOpen size={20} className="icon-gradient" />
          <div>
            <h3>Course Content</h3>
            <p className="progress-text">
              {completedLessonIds.length}/{lessons.length} completed
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{
                width: `${(completedLessonIds.length / lessons.length) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="progress-percentage">
            {Math.round((completedLessonIds.length / lessons.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Modules & Lessons */}
      <div className="sidebar-content">
        {Object.entries(groupedLessons).map(([moduleIdx, module]) => {
          const isExpanded = expandedModule === Number(moduleIdx)
          const completedInModule = module.lessons.filter((l) =>
            completedLessonIds.includes(l.id)
          ).length

          return (
            <motion.div
              key={moduleIdx}
              className="module-group"
              layout
            >
              {/* Module Header */}
              <button
                className="module-header"
                onClick={() => toggleModule(Number(moduleIdx))}
              >
                <div className="module-title">
                  <span className="module-name">{module.title}</span>
                  <span className="module-progress">
                    {completedInModule}/{module.lessons.length}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={18} />
                </motion.div>
              </button>

              {/* Module Lessons */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="module-lessons"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {module.lessons.map((lesson, idx) => {
                      const isCurrentLesson = lesson.id === currentLessonId
                      const isCompleted = completedLessonIds.includes(lesson.id)

                      return (
                        <motion.button
                          key={lesson.id}
                          className={`lesson-item ${
                            isCurrentLesson ? 'current' : ''
                          } ${isCompleted ? 'completed' : ''}`}
                          onClick={() => onSelectLesson?.(lesson)}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          layout
                        >
                          {/* Lesson Icon */}
                          <div className="lesson-icon">
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <Check size={14} className="check-icon" />
                              </motion.div>
                            ) : isCurrentLesson ? (
                              <Play size={14} className="play-icon" />
                            ) : (
                              <div className="lesson-number">{idx + 1}</div>
                            )}
                          </div>

                          {/* Lesson Info */}
                          <div className="lesson-info">
                            <p className="lesson-title">{lesson.title}</p>
                            {lesson.duration && (
                              <p className="lesson-duration">
                                <Volume2 size={12} />
                                {lesson.duration}
                              </p>
                            )}
                          </div>

                          {/* Current Indicator */}
                          {isCurrentLesson && (
                            <motion.div
                              className="current-indicator"
                              layoutId="currentIndicator"
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          )}
                        </motion.button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Footer Stats */}
      <motion.div
        className="sidebar-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="stat">
          <span className="stat-label">Completed</span>
          <span className="stat-value">{completedLessonIds.length}</span>
        </div>
        <div className="divider" />
        <div className="stat">
          <span className="stat-label">Remaining</span>
          <span className="stat-value">
            {lessons.length - completedLessonIds.length}
          </span>
        </div>
      </motion.div>

      {/* Cinematic Glow */}
      <div className="sidebar-glow" />
    </motion.aside>
  )
})

LessonSidebar.displayName = 'LessonSidebar'

export default LessonSidebar
