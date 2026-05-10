import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Trophy, Zap } from 'lucide-react'

export default function AchievementToast() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), 1800)
    const hideTimer = window.setTimeout(() => setVisible(false), 6200)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="achievement-toast"
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <div className="achievement-confetti" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <span key={index} style={{ '--i': index }} />
            ))}
          </div>
          <div className="achievement-toast-icon">
            <Trophy size={22} />
          </div>
          <div className="achievement-toast-copy">
            <span>Achievement unlocked</span>
            <strong>Daily XP streak started</strong>
          </div>
          <div className="achievement-toast-xp">
            <Zap size={16} />
            +50 XP
          </div>
          <Sparkles className="achievement-spark" size={18} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
