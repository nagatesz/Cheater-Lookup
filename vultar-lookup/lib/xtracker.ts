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

async function xtrackerFetch(endpoint: string, robloxId: string | number): Promise<XTrackerEntry[]> {
  const apiKey = process.env.XTRACKER_API_KEY
  if (!apiKey || apiKey === 'placeholder') return []

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

    // Normalize — handle array or object with entries/results/data key
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
