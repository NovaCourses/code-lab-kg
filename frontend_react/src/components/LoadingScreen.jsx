import { AnimatePresence, motion } from 'framer-motion'

export default function LoadingScreen({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="premium-loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(12px)' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <motion.div
            className="loading-logo-wrap"
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="loading-logo-orbit" />
            <div className="loading-logo">NovaCode</div>
            <div className="loading-subtitle">Booting premium learning OS</div>
            <div className="loading-bar">
              <motion.span
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
