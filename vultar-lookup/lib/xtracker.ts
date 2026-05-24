// XTracker API integration
// Docs: https://api.xtracker.xyz
// - /api/registry/user?id=ROBLOX_USER_ID  → cheater registry hits
// - /api/ownership/user?id=ROBLOX_USER_ID → cheat ownership hits
// Auth header: { Authorization: "APIKEY" } — no Bearer prefix
//
// Set multiple keys comma-separated in XTRACKER_API_KEY for parallel clan scans.

export type XTrackerEntry = {
  roblox_username?: string
  roblox_id?: string | number
  reason?: string
  cheat?: string
  flagged_at?: string
  evidence?: string
  flagged_by?: string
  severity?: string
  [key: string]: unknown
}

export type XTrackerResult = {
  found: boolean
  entries: XTrackerEntry[]
  ownershipEntries: XTrackerEntry[]
  total: number
  /** True when we could not get a trustworthy answer — do not treat as "clean" */
  inconclusive: boolean
}

const BASE = 'https://api.xtracker.xyz'

type CacheEntry<T> = { data: T; timestamp: number }
const xtrackerCache = new Map<string, CacheEntry<XTrackerEntry[]>>()
const robloxIdCache = new Map<string, CacheEntry<number | null>>()
const avatarCache = new Map<string, CacheEntry<string | null>>()

const XTRACKER_TTL = 5 * 60 * 1000
const ROBLOX_TTL = 60 * 60 * 1000

const WORKER_RETRY_ATTEMPTS = 6
const WORKER_RETRY_BASE_MS = 1500

export function getXTrackerApiKeys(): string[] {
  const raw = process.env.XTRACKER_API_KEY
  if (!raw || raw === 'placeholder') return []
  return raw.split(/[,\n;]+/).map(k => k.trim()).filter(Boolean)
}

export function getXTrackerKeyCount(): number {
  return getXTrackerApiKeys().length
}

export function pickApiKeyBySlot(slot: number, attempt = 0): string | null {
  const keys = getXTrackerApiKeys()
  if (keys.length === 0) return null
  return keys[(slot + attempt) % keys.length]
}

function pickApiKey(robloxId: string | number, attempt = 0): string | null {
  const keys = getXTrackerApiKeys()
  if (keys.length === 0) return null
  const id = String(robloxId)
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return keys[(hash + attempt) % keys.length]
}

function normalizeXTrackerPayload(data: unknown): XTrackerEntry[] {
  if (!data || typeof data !== 'object') return []
  const d = data as Record<string, unknown>

  if (d.success === false) return []

  const nested = d.data
  if (nested !== undefined && nested !== null) {
    if (Array.isArray(nested)) return nested as XTrackerEntry[]
    if (typeof nested === 'object') return normalizeXTrackerPayload(nested)
  }

  if (Array.isArray(d.evidence)) {
    return (d.evidence as Array<Record<string, unknown>>).map(ev => ({
      roblox_id: d.user_id as string | number | undefined,
      reason: ev.reason as string | undefined,
      flagged_at: ev.date as string | undefined,
      evidence: ev.url as string | undefined,
      alts: d.alts,
    }))
  }
  if (Array.isArray(data)) return data as XTrackerEntry[]
  if (Array.isArray(d.entries)) return d.entries as XTrackerEntry[]
  if (Array.isArray(d.results)) return d.results as XTrackerEntry[]
  if (Array.isArray(d.records)) return d.records as XTrackerEntry[]
  if (Array.isArray(d.flags)) return d.flags as XTrackerEntry[]

  if (d.user_id != null && (d.reason || d.cheat || d.flagged_at)) {
    return [d as XTrackerEntry]
  }

  return []
}

type FetchOutcome =
  | { entries: XTrackerEntry[]; trusted: true }
  | { entries: []; trusted: false }

async function xtrackerFetch(
  endpoint: string,
  robloxId: string | number,
  apiKey: string
): Promise<FetchOutcome> {
  const cacheKey = `v2:${endpoint}:${robloxId}`
  const cached = xtrackerCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < XTRACKER_TTL) {
    return { entries: cached.data, trusted: true }
  }

  try {
    const res = await fetch(`${BASE}${endpoint}?id=${robloxId}`, {
      headers: { Authorization: apiKey },
      cache: 'no-store',
    })

    if (res.status === 429) {
      return { entries: [], trusted: false }
    }

    if (!res.ok) {
      if (res.status === 404 || res.status === 204) {
        xtrackerCache.set(cacheKey, { data: [], timestamp: Date.now() })
        return { entries: [], trusted: true }
      }
      console.warn(`XTracker ${endpoint} returned ${res.status} for id=${robloxId}`)
      return { entries: [], trusted: false }
    }

    const data = await res.json()
    const result = normalizeXTrackerPayload(data)
    xtrackerCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return { entries: result, trusted: true }
  } catch (err) {
    console.error(`XTracker fetch failed (${endpoint}):`, err)
    return { entries: [], trusted: false }
  }
}

type FetchRetryResult = { entries: XTrackerEntry[]; inconclusive: boolean }

async function xtrackerFetchWithRetry(
  endpoint: string,
  robloxId: string | number,
  workerSlot?: number
): Promise<FetchRetryResult> {
  const keyCount = getXTrackerKeyCount()
  if (keyCount === 0) return { entries: [], inconclusive: true }

  const maxAttempts =
    workerSlot !== undefined ? WORKER_RETRY_ATTEMPTS : Math.min(keyCount, WORKER_RETRY_ATTEMPTS)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey =
      workerSlot !== undefined
        ? pickApiKeyBySlot(workerSlot, 0)
        : pickApiKey(robloxId, attempt)
    if (!apiKey) return { entries: [], inconclusive: true }

    const { entries, trusted } = await xtrackerFetch(endpoint, robloxId, apiKey)
    if (trusted) return { entries, inconclusive: false }

    const delay =
      workerSlot !== undefined
        ? WORKER_RETRY_BASE_MS * Math.pow(1.5, attempt)
        : 400 * (attempt + 1)
    await new Promise(r => setTimeout(r, delay))
  }

  console.warn(`XTracker ${endpoint} failed after retries (id=${robloxId}, worker=${workerSlot ?? 'n/a'})`)
  return { entries: [], inconclusive: true }
}

export async function resolveRobloxId(username: string): Promise<number | null> {
  const cacheKey = username.toLowerCase()
  const cached = robloxIdCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < ROBLOX_TTL) {
    return cached.data
  }

  try {
    const res = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const id = data?.data?.[0]?.id ?? null
    if (id) robloxIdCache.set(cacheKey, { data: id, timestamp: Date.now() })
    return id
  } catch {
    return null
  }
}

export async function resolveRobloxAvatar(robloxId: number | string): Promise<string | null> {
  const cacheKey = String(robloxId)
  const cached = avatarCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < ROBLOX_TTL) {
    return cached.data
  }

  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    const imageUrl = data?.data?.[0]?.imageUrl ?? null
    if (imageUrl) avatarCache.set(cacheKey, { data: imageUrl, timestamp: Date.now() })
    return imageUrl
  } catch {
    return null
  }
}

export async function lookupXTrackerByRobloxId(
  robloxId: string | number,
  workerSlot?: number
): Promise<XTrackerResult> {
  const registry = await xtrackerFetchWithRetry('/api/registry/user', robloxId, workerSlot)
  await new Promise(r => setTimeout(r, 1000))
  const ownership = await xtrackerFetchWithRetry('/api/ownership/user', robloxId, workerSlot)

  const allEntries = [...registry.entries, ...ownership.entries]
  const anyInconclusive = registry.inconclusive || ownership.inconclusive

  return {
    found: allEntries.length > 0,
    entries: registry.entries,
    ownershipEntries: ownership.entries,
    total: allEntries.length,
    // If either endpoint failed with no hits, do not treat as confirmed clean
    inconclusive: anyInconclusive && allEntries.length === 0,
  }
}

export async function resolveDiscordUser(discordId: string): Promise<{
  username: string | null
  avatar_url: string | null
}> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return { username: null, avatar_url: null }

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 3600 },
    })

    if (!res.ok) return { username: null, avatar_url: null }
    const user = await res.json()
    const avatar_url = user.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.png`
      : null

    return {
      username: user.global_name || user.username || null,
      avatar_url,
    }
  } catch {
    return { username: null, avatar_url: null }
  }
}
