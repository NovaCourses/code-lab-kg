import { useState, useEffect } from 'react'

export function useLocalStorage(key, fallback, allowed = null) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key)
    if (!stored) return fallback
    if (allowed && !allowed.includes(stored)) return fallback
    return stored
  })

  useEffect(() => {
    localStorage.setItem(key, value)
  }, [key, value])

  return [value, setValue]
}
