import { motion } from 'framer-motion'
import { Lightbulb, Rocket } from 'lucide-react'
import { CodeEditor } from '../components'
import { useAppContext } from '../contexts'
import './CodeEditorPage.css'

export default function CodeEditorPage() {
  const { t } = useAppContext()

  return (
    <div className="code-editor-page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>{t('liveCodeEditor')}</h1>
        <p>{t('codeEditorDescription')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <CodeEditor />
      </motion.div>

      <motion.div
        className="editor-info"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="info-card">
          <h3><Rocket size={18} /> {t('features')}</h3>
          <ul>
            <li>{t('syntaxHighlighting')}</li>
            <li>{t('codeExecution')}</li>
            <li>{t('multipleLanguages')}</li>
            <li>{t('saveShare')}</li>
          </ul>
        </div>

        <div className="info-card">
          <h3><Lightbulb size={18} /> {t('tips')}</h3>
          <ul>
            <li>{t('useTemplates')}</li>
            <li>{t('experiment')}</li>
            <li>{t('learnSyntax')}</li>
          </ul>
        </div>
      </motion.div>
    </div>
  )
}
