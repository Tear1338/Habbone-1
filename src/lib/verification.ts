import crypto from 'crypto'
import { parseTimestamp } from '@/lib/date-utils'

const DEFAULT_CODE_PREFIX = 'H1'
const DEFAULT_CODE_LENGTH = 6
const DEFAULT_TTL_MINUTES = 10
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateVerificationCode(options?: { prefix?: string; length?: number }) {
  const prefix = options?.prefix ?? DEFAULT_CODE_PREFIX
  const length = Math.max(4, Math.min(options?.length ?? DEFAULT_CODE_LENGTH, 32))
  const bytes = crypto.randomBytes(length)
  let payload = ''
  for (let i = 0; i < length; i += 1) {
    const idx = bytes[i] % ALPHABET.length
    payload += ALPHABET[idx]
  }
  return `${prefix}-${payload}`
}

export function computeVerificationExpiry(ttlMinutes = DEFAULT_TTL_MINUTES) {
  const ms = ttlMinutes * 60 * 1000
  return new Date(Date.now() + ms).toISOString()
}

function normalizeIso(value: string) {
  if (!value) return value
  if (value.endsWith('Z') || /[+-]\d\d:?\d\d$/.test(value)) return value
  return `${value}Z`
}

export function isVerificationExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false
  const normalized = normalizeIso(expiresAt)
  const ts = parseTimestamp(normalized, { numeric: 'ms', numericString: 'parse' })
  if (!ts) {
    if (normalized.startsWith('1970-01-01')) return Date.now() >= 0
    return false
  }
  return Date.now() >= ts
}
