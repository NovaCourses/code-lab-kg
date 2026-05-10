import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa'
import { FaBookOpen, FaCode, FaLightbulb, FaWandMagicSparkles } from 'react-icons/fa6'
import { useAppContext } from '../contexts'
import './AIAssistant.css'

export default function AIAssistant() {
  const { t } = useAppContext()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: t('aiWelcome'),
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const openAssistant = () => setIsOpen(true)
    const applyLessonPrompt = (event) => {
      setIsOpen(true)
      if (event.detail?.prompt) {
        setInputValue(event.detail.prompt)
      }
    }

    window.addEventListener('nova-open-ai', openAssistant)
    window.addEventListener('nova-ai-prompt', applyLessonPrompt)
    return () => {
      window.removeEventListener('nova-open-ai', openAssistant)
      window.removeEventListener('nova-ai-prompt', applyLessonPrompt)
    }
  }, [])

  const quickActions = [
    { icon: FaCode, label: 'Explain code', prompt: 'Explain this code step by step and show what can be improved.' },
    { icon: FaBookOpen, label: 'Summarize lesson', prompt: 'Summarize my current lesson and give me 3 things to practice.' },
    { icon: FaWandMagicSparkles, label: 'Generate task', prompt: 'Generate a small programming task with input, output and hints.' },
    { icon: FaLightbulb, label: 'Fix error', prompt: 'Help me debug an error and explain the fix simply.' },
  ]

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      // In a real implementation, this would call your backend AI service
      // For demo purposes, we'll simulate AI responses
      const response = await simulateAIResponse(inputValue)

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: t('aiError'),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const simulateAIResponse = async (userInput) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    const input = userInput.toLowerCase()

    if (input.includes('python') || input.includes('code')) {
      return "Отличный вопрос! В Python вы можете использовать функцию `print()` для вывода текста. Например:\n\n```python\nprint('Hello, World!')\n```\n\nПопробуйте написать код в нашем редакторе кода!"
    }

    if (input.includes('xp') || input.includes('уровень')) {
      return "XP (опыт) - это система очков, которую вы получаете за выполнение уроков, задач и игр. Чем больше XP, тем выше ваш уровень! Посмотрите свой прогресс в дашборде."
    }

    if (input.includes('урок') || input.includes('lesson')) {
      return "У нас есть видеоуроки по различным темам программирования. Начните с 'Python Basics' - это отличная отправная точка для новичков!"
    }

    if (input.includes('задач') || input.includes('task')) {
      return "Задачи помогут вам практиковать навыки программирования. Каждая задача имеет подсказки и проверку решений. Попробуйте 'FizzBuzz' - классическая задача!"
    }

    return "Я здесь, чтобы помочь вам с обучением! Спросите меня о Python, JavaScript, алгоритмах, или о том, как использовать платформу. Что вас интересует?"
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const applyQuickPrompt = (prompt) => {
    setInputValue(prompt)
    inputRef.current?.focus()
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className="ai-assistant-toggle"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FaTimes />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FaRobot />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ai-assistant-window"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="ai-header">
              <div className="ai-header-content">
                <FaRobot className="ai-icon" />
                <div>
                  <h3>{t('aiAssistant')}</h3>
                  <span className="ai-status">{t('online')}</span>
                </div>
              </div>
              <button
                className="ai-close"
                onClick={() => setIsOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="ai-messages">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`message ${message.type}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="message-content">
                    {message.content.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  className="message bot typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="ai-quick-actions">
              {quickActions.map((action) => (
                <button key={action.label} type="button" onClick={() => applyQuickPrompt(action.prompt)}>
                  <action.icon />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            <div className="ai-input">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('askAI')}
                rows={1}
                disabled={isTyping}
              />
              <motion.button
                className="send-button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaPaperPlane />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
