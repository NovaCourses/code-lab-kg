import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Trophy, Zap } from 'lucide-react'

export default function AchievementToast() {
  const [visible, setVisible] = useState(false)
  const [toast, setToast] = useState({
    eyebrow: 'Achievement unlocked',
    title: 'Daily XP streak started',
    xp: 50,
  })

  useEffect(() => {
    let hideTimer
    const showToast = (event) => {
      const nextToast = event.detail || {}
      setToast({
        eyebrow: nextToast.eyebrow || 'Achievement unlocked',
        title: nextToast.title || 'XP earned',
        xp: Number(nextToast.xp || 0),
      })
      setVisible(true)
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setVisible(false), 4200)
    }

    window.addEventListener('novacode:toast', showToast)
    return () => {
      window.removeEventListener('novacode:toast', showToast)
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
            <span>{toast.eyebrow}</span>
            <strong>{toast.title}</strong>
          </div>
          {toast.xp > 0 && (
            <div className="achievement-toast-xp">
              <Zap size={16} />
              +{toast.xp} XP
            </div>
          )}
          <Sparkles className="achievement-spark" size={18} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
