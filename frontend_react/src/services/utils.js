export function normalizeApiError(error, t) {
  const detail = error?.body?.detail
  if (detail === 'invalid_credentials') return t('authErrorInvalidCredentials')
  if (detail === 'user_exists') return t('authErrorUserExists')
  return t('authErrorGeneric')
}

export function difficultyLabel(value, t) {
  if (value === 'easy') return t('difficultyEasy')
  if (value === 'medium') return t('difficultyMedium')
  if (value === 'hard') return t('difficultyHard')
  return value
}
