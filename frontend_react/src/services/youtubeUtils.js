const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/
const YOUTUBE_HOST_PATTERN = /(^|\.)youtube(-nocookie)?\.com$|(^|\.)youtu\.be$/

function normalizeCandidate(candidate) {
  if (!candidate || typeof candidate !== 'string') return null
  const match = candidate.trim().match(/[a-zA-Z0-9_-]{11}/)
  return match?.[0] || null
}

function toUrl(value) {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    return new URL(trimmed)
  } catch {
    try {
      return new URL(`https://${trimmed}`)
    } catch {
      return null
    }
  }
}

/**
 * Extract a video ID from YouTube watch, short, embed, youtu.be, live,
 * legacy /v links, and playlist URLs that include a selected video.
 */
export function extractYoutubeVideoId(url) {
  if (!url || typeof url !== 'string') return null

  const trimmed = url.trim()
  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) return trimmed

  const parsed = toUrl(trimmed)
  if (parsed) {
    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '')
    const isYoutubeHost = YOUTUBE_HOST_PATTERN.test(host)

    if (isYoutubeHost) {
      const videoParam = normalizeCandidate(parsed.searchParams.get('v'))
      if (videoParam) return videoParam

      const attributionTarget = parsed.searchParams.get('u')
      if (attributionTarget) {
        const nestedId = extractYoutubeVideoId(decodeURIComponent(attributionTarget))
        if (nestedId) return nestedId
      }

      const pathParts = parsed.pathname.split('/').filter(Boolean)
      if (host === 'youtu.be') {
        return normalizeCandidate(pathParts[0])
      }

      const pathBasedPrefixes = new Set(['embed', 'shorts', 'live', 'v', 'e'])
      if (pathBasedPrefixes.has(pathParts[0])) {
        return normalizeCandidate(pathParts[1])
      }
    }
  }

  const fallbackMatch = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?.*?v=|embed\/|shorts\/|live\/|v\/|e\/))([a-zA-Z0-9_-]{11})/,
  )

  return fallbackMatch?.[1] || null
}

export function extractYoutubePlaylistId(url) {
  if (!url || typeof url !== 'string') return null
  const parsed = toUrl(url)
  if (!parsed) return null
  return parsed.searchParams.get('list') || null
}

export function getYoutubeEmbedBaseUrl(url) {
  const videoId = extractYoutubeVideoId(url)
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

export function buildYoutubePlayerParams(options = {}) {
  const params = new URLSearchParams()
  const supportedParams = {
    autoplay: options.autoplay ? '1' : options.autoplay === false ? '0' : null,
    rel: options.rel ?? 0,
    modestbranding: options.modestbranding ?? 1,
    controls: options.controls ?? 1,
    playsinline: options.playsinline ?? 1,
    enablejsapi: options.enablejsapi ?? 1,
    iv_load_policy: options.ivLoadPolicy ?? 3,
    start: Number.isFinite(options.start) && options.start > 0 ? Math.floor(options.start) : null,
    mute: options.mute ? 1 : null,
    origin:
      options.origin ||
      (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : null),
  }

  Object.entries(supportedParams).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })

  return params
}

export function buildYoutubeEmbedSrc(url, options = {}) {
  const baseUrl = getYoutubeEmbedBaseUrl(url)
  if (!baseUrl) return null
  const params = buildYoutubePlayerParams(options)
  const query = params.toString()
  return query ? `${baseUrl}?${query}` : baseUrl
}

/**
 * Convert any supported YouTube URL to the canonical embed URL.
 * With no options this returns only https://www.youtube.com/embed/VIDEO_ID.
 */
export function convertYoutubeToEmbed(url, options = null) {
  if (!options || Object.keys(options).length === 0) {
    return getYoutubeEmbedBaseUrl(url)
  }

  return buildYoutubeEmbedSrc(url, options)
}

/**
 * Get YouTube video thumbnail URL
 * @param {string} url - YouTube URL
 * @param {string} size - Thumbnail size: 'default', 'medium', 'high', 'standard', 'maxres'
 * @returns {string|null} - Thumbnail URL or null if invalid
 */
export function getYoutubeThumbnail(url, size = 'high') {
  const videoId = extractYoutubeVideoId(url)
  if (!videoId) return null

  const thumbnailMap = {
    'default': `https://img.youtube.com/vi/${videoId}/default.jpg`,
    'medium': `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    'high': `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    'standard': `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    'maxres': `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  }

  return thumbnailMap[size] || thumbnailMap['high']
}

/**
 * Validate if URL is valid YouTube format
 * @param {string} url - YouTube URL to validate
 * @returns {boolean} - True if valid YouTube URL
 */
export function isValidYoutubeUrl(url) {
  return extractYoutubeVideoId(url) !== null
}

/**
 * Get estimated video duration from video ID (requires external API)
 * This is a placeholder - actual duration would come from YouTube API
 * @param {string} videoId - YouTube video ID
 * @returns {number} - Duration in seconds (placeholder)
 */
export function getVideoDurationPlaceholder() {
  // In production, call YouTube Data API
  // For now, return a placeholder
  return 600 // 10 minutes default
}

export default {
  extractYoutubeVideoId,
  extractYoutubePlaylistId,
  getYoutubeEmbedBaseUrl,
  buildYoutubeEmbedSrc,
  buildYoutubePlayerParams,
  convertYoutubeToEmbed,
  getYoutubeThumbnail,
  isValidYoutubeUrl,
  getVideoDurationPlaceholder,
}
