import { useCallback } from 'react'
import { messages } from '../i18n'

export function useTranslator(lang) {
  return useCallback(
    (key) => messages[lang]?.[key] ?? messages.en[key] ?? key,
    [lang],
  )
}
