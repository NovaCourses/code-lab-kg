import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { motion } from 'framer-motion'
import { FaPlay, FaDownload, FaShare, FaSave } from 'react-icons/fa'
import { useAppContext } from '../contexts'
import './CodeEditor.css'

const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
]

const TEMPLATES = {
  python: `def hello_world():
    print("Hello, World!")

if __name__ == "__main__":
    hello_world()`,
  javascript: `function helloWorld() {
  console.log("Hello, World!");
}

helloWorld();`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  cpp: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`,
  csharp: `using System;

class Program {
    static void Main(string[] args) {
        Console.WriteLine("Hello, World!");
    }
}`,
  go: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
  rust: `fn main() {
    println!("Hello, World!");
}`,
  php: `<?php
echo "Hello, World!";
?>`,
}

export default function CodeEditor({ initialCode = '', initialLanguage = 'python', onCodeChange, readOnly = false }) {
  const { theme, setTheme, t } = useAppContext()
  const [code, setCode] = useState(initialCode || TEMPLATES[initialLanguage] || '')
  const [language, setLanguage] = useState(initialLanguage)
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [analysis, setAnalysis] = useState([])
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs-light'

  const updateAIAnalysis = useCallback((value = code, currentLanguage = language) => {
    const source = value || ''
    const lines = source.split('\n')
    const insights = []
    const markers = []

    if (!source.trim()) {
      insights.push({ tone: 'warning', title: 'Empty file', text: 'Start with a function, print statement, or small algorithm.' })
    }

    if (currentLanguage === 'python' && !source.includes('print(')) {
      insights.push({ tone: 'info', title: 'No visible output', text: 'Add print(...) if you want to see a result in the terminal.' })
    }

    if (currentLanguage === 'javascript' && !source.includes('console.log(')) {
      insights.push({ tone: 'info', title: 'No console output', text: 'Use console.log(...) to inspect values while learning.' })
    }

    if (/todo|fixme/i.test(source)) {
      insights.push({ tone: 'warning', title: 'TODO found', text: 'You have unfinished notes. Turn them into the next concrete step.' })
    }

    if (source.includes('for ') || source.includes('while ')) {
      insights.push({ tone: 'success', title: 'Loop detected', text: 'Nice. Check the loop exit condition and test edge cases.' })
    }

    if (source.includes('def ') || source.includes('function ') || source.includes('=>')) {
      insights.push({ tone: 'success', title: 'Function structure', text: 'Good structure. Try keeping each function focused on one job.' })
    }

    lines.forEach((line, index) => {
      if (/todo|fixme/i.test(line)) {
        markers.push({
          severity: monacoRef.current?.MarkerSeverity?.Warning || 4,
          message: 'AI note: resolve this TODO before submitting.',
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: Math.max(line.length + 1, 2),
        })
      }

      if (currentLanguage === 'python' && line.trim().startsWith('print') && !line.includes('(')) {
        markers.push({
          severity: monacoRef.current?.MarkerSeverity?.Error || 8,
          message: 'AI hint: Python print should usually be written as print(...).',
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: Math.max(line.length + 1, 2),
        })
      }
    })

    if ((source.match(/{/g) || []).length !== (source.match(/}/g) || []).length) {
      insights.push({ tone: 'warning', title: 'Brace balance', text: 'Curly braces look unbalanced. Check opened and closed blocks.' })
    }

    if (!insights.length) {
      insights.push({ tone: 'success', title: 'Looks clean', text: 'No obvious beginner issues found. Try running it and reading the output.' })
    }

    setAnalysis(insights.slice(0, 4))

    const model = editorRef.current?.getModel()
    if (monacoRef.current && model) {
      monacoRef.current.editor.setModelMarkers(model, 'nova-ai', markers)
    }
  }, [code, language])

  useEffect(() => {
    updateAIAnalysis(code, language)
  }, [code, language, updateAIAnalysis])

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(editorTheme)
    }
  }, [editorTheme])

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    monaco.editor.setTheme(editorTheme)
    updateAIAnalysis(code, language)
  }

  const handleCodeChange = (value) => {
    setCode(value)
    if (onCodeChange) {
      onCodeChange(value)
    }
  }

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage)
    if (!code || code === TEMPLATES[language]) {
      const nextCode = TEMPLATES[newLanguage] || ''
      setCode(nextCode)
      updateAIAnalysis(nextCode, newLanguage)
    }
  }

  const runCode = async () => {
    setIsRunning(true)
    setOutput('')

    try {
      // For demo purposes, we'll simulate code execution
      // In a real implementation, this would call a backend API
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (language === 'python') {
        if (code.includes('print(')) {
          setOutput('Hello, World!\nCode executed successfully!')
        } else {
          setOutput('Code executed (no output)')
        }
      } else if (language === 'javascript') {
        if (code.includes('console.log(')) {
          setOutput('Hello, World!\nCode executed successfully!')
        } else {
          setOutput('Code executed (no output)')
        }
      } else {
        setOutput(`Code execution simulated for ${language}`)
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : language}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const shareCode = () => {
    // In a real implementation, this would save to backend and generate shareable link
    navigator.clipboard.writeText(code)
    alert('Code copied to clipboard!')
  }

  const saveCode = () => {
    // In a real implementation, this would save to user's saved codes
    localStorage.setItem(`saved-code-${language}`, code)
    alert('Code saved locally!')
  }

  return (
    <motion.div
      className="code-editor"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="editor-header">
        <div className="editor-controls">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-select"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="theme-toggle"
          >
            {theme === 'dark' ? t('themeDark') : t('themeLight')}
          </button>
        </div>

        <div className="editor-actions">
          <motion.button
            onClick={runCode}
            disabled={isRunning}
            className="action-btn run-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaPlay />
            {isRunning ? t('codeRunning') : t('codeRun')}
          </motion.button>

          <motion.button
            onClick={saveCode}
            className="action-btn save-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaSave />
            {t('codeSave')}
          </motion.button>

          <motion.button
            onClick={downloadCode}
            className="action-btn download-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaDownload />
            {t('codeDownload')}
          </motion.button>

          <motion.button
            onClick={shareCode}
            className="action-btn share-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaShare />
            {t('codeShare')}
          </motion.button>
        </div>
      </div>

      <div className="editor-container">
        <div className="code-panel">
          <Editor
            height="400px"
            language={language}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              glyphMargin: true,
              fontLigatures: true,
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              readOnly,
            }}
            theme={editorTheme}
          />
        </div>

        <div className="output-panel">
          <div className="output-header">
            <h3>{t('codeOutput')}</h3>
          </div>
          <pre className="output-content">
            {output || t('codeRunPrompt')}
          </pre>
        </div>

        <div className="ai-analysis-panel">
          <div className="analysis-header">
            <h3>{t('codeAiAnalysis')}</h3>
            <span>{t('terminalLive')}</span>
          </div>
          <div className="analysis-list">
            {analysis.map((item) => (
              <div key={`${item.title}-${item.text}`} className={`analysis-item ${item.tone}`}>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
