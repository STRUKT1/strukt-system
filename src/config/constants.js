/**
 * Application Constants
 * Centralized configuration values for validation, limits, and constraints
 */

module.exports = {
  PHOTO_UPLOAD: {
    MAX_SIZE_MB: 10,
    MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB in bytes
    ALLOWED_FORMATS: ['jpeg', 'jpg', 'png', 'webp'],
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  },

  SERVER: {
    REQUEST_TIMEOUT: 30000,        // 30 seconds
    KEEP_ALIVE_TIMEOUT: 35000,     // 35 seconds (higher than request timeout)
    HEADERS_TIMEOUT: 36000,        // 36 seconds (higher than keep-alive)
  },

  TRANSCRIPTION: {
    MAX_LENGTH_CHARS: 5000,        // Maximum transcribed text length
    MAX_AUDIO_DURATION_SEC: 300,   // 5 minutes max audio duration
    MAX_AUDIO_SIZE_MB: 25,         // Whisper API limit
  },
};
