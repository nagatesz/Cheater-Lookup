// XTracker API integration
// Docs: https://api.xtracker.xyz
// - /api/registry/user?id=ROBLOX_USER_ID  → cheater registry hits
// - /api/ownership/user?id=ROBLOX_USER_ID → cheat ownership hits
// Auth header: { Authorization: "APIKEY" } — no Bearer prefix

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
}

const BASE = 'https://api.xtracker.xyz'

let keyIndex = 0

async function xtrackerFetch(endpoint: string, robloxId: string | number): Promise<XTrackerEntry[]> {
  const rawApiKey = process.env.XTRACKER_API_KEY
  if (!rawApiKey || rawApiKey === 'placeholder') return []

  const apiKeys = rawApiKey.split(',').map(k => k.trim()).filter(Boolean)
  if (apiKeys.length === 0) return []

  // Rotate round-robin
  const apiKey = apiKeys[keyIndex % apiKeys.length]
  keyIndex++

  try {
    const res = await fetch(`${BASE}${endpoint}?id=${robloxId}`, {
      headers: { Authorization: apiKey },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      if (res.status === 404 || res.status === 204) return []
      console.warn(`XTracker ${endpoint} returned ${res.status}`)
      return []
    }

    const data = await res.json()

    // Normalize — handle the real API structure: { evidence: [...], user_id: "...", alts: "..." }
    if (data && Array.isArray(data.evidence)) {
      return data.evidence.map((ev: any) => ({
        roblox_id: data.user_id,
        reason: ev.reason,
        flagged_at: ev.date,
        evidence: ev.url,
        alts: data.alts
      }))
    }
    
    // Fallbacks just in case
    if (Array.isArray(data)) return data
    if (Array.isArray(data.entries)) return data.entries
    if (Array.isArray(data.results)) return data.results
    if (Array.isArray(data.data)) return data.data
    if (data && typeof data === 'object' && Object.keys(data).length > 0) return [data]
    return []
  } catch (err) {
    console.error(`XTracker fetch failed (${endpoint}):`, err)
    return []
  }
}

// Resolve a Roblox username → Roblox user ID via Roblox API
export async function resolveRobloxId(username: string): Promise<number | null> {
  try {
    const res = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.[0]?.id ?? null
  } catch {
    return null
  }
}

// Fetch Roblox Avatar
export async function resolveRobloxAvatar(robloxId: number | string): Promise<string | null> {
  try {
    const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`, {
      next: { revalidate: 3600 }
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.[0]?.imageUrl ?? null
  } catch {
    return null
  }
}

// Main XTracker lookup — takes a Roblox User ID
export async function lookupXTrackerByRobloxId(robloxId: string | number): Promise<XTrackerResult> {
  const [registry, ownership] = await Promise.all([
    xtrackerFetch('/api/registry/user', robloxId),
    xtrackerFetch('/api/ownership/user', robloxId),
  ])

  const allEntries = [...registry, ...ownership]

  return {
    found: allEntries.length > 0,
    entries: registry,
    ownershipEntries: ownership,
    total: allEntries.length,
  }
}

// Resolve Discord username via bot token (optional)
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
