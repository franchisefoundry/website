// ─────────────────────────────────────────────────────────────────────────────
// Phone validation — free, dependency-free, UK-first.
//
// Catches malformed and obviously-fake numbers (wrong length, all-same or
// sequential digits). It does NOT prove the person owns the number — that's
// OTP verification, which can be added later. Shared by the public lead form
// (client) and /api/leads (server) so the rule is identical in both places.
// ─────────────────────────────────────────────────────────────────────────────

/** Strip spaces and punctuation; turn an international 00 prefix into +. */
export function normalisePhone(raw: string): string {
  return (raw || '')
    .trim()
    .replace(/[\s().\-‐-―]/g, '') // spaces, brackets, hyphens/dashes
    .replace(/^00/, '+')
}

/** Obvious junk: all one digit, ≤2 distinct digits, or a leading 123456/987654 run. */
function looksFake(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return true          // 00000000000
  if (new Set(digits).size <= 2) return true          // 0101010101, 1212121212
  if (/^0?1234567|^0?9876543/.test(digits)) return true // starts with a sequence
  return false
}

/** Normalise to UK local 0-form, or null when the number is clearly not UK. */
function ukLocal(p: string): string | null {
  if (p.startsWith('+44')) return '0' + p.slice(3)
  if (/^0\d+$/.test(p)) return p // a bare 0-number: treat as UK
  return null
}

/**
 * True when `raw` is a plausibly-real phone number.
 *
 * UK numbers must match the national format (10–11 digits; mobiles are 07 + 9
 * digits = 11). Anything starting with + is treated as international and must
 * carry a country code (8–15 digits). Obvious junk patterns are rejected.
 */
export function isValidPhone(raw: string): boolean {
  const p = normalisePhone(raw)
  if (!/^\+?\d{7,15}$/.test(p)) return false
  const digits = p.replace(/^\+/, '')
  if (looksFake(digits)) return false

  const uk = ukLocal(p)
  if (uk !== null) {
    if (!/^0\d{9,10}$/.test(uk)) return false              // UK: 10 or 11 digits
    if (uk.startsWith('07') && uk.length !== 11) return false // UK mobile = 11 digits
    return true
  }
  return /^\+\d{8,15}$/.test(p) // international must include a country code
}
