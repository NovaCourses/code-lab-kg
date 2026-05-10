async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function buildError(response, body) {
  const error = new Error('Request failed')
  error.status = response.status
  error.body = body
  return error
}

export async function apiRequest(path, options = {}) {
  const init = {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  }

  const response = await fetch(path, init)
  const body = await parseResponse(response)
  if (!response.ok) {
    throw buildError(response, body)
  }
  return body
}

export async function apiGet(path) {
  return apiRequest(path)
}

export async function apiPost(path, payload) {
  return apiRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function unwrapAdminResponse(response, fallback = {}) {
  if (response?.success === false) {
    throw new Error(response.error || response.detail || 'Admin request failed')
  }
  return response?.data ?? response ?? fallback
}
