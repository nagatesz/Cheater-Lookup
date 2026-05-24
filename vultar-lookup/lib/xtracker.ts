// XTracker API integration
// XTracker is a Roblox cheater flagging Discord that logs all caught cheaters
// Update XTRACKER_API_BASE in .env with the real endpoint once confirmed

export type XTrackerEntry = {
  discord_id: string
  roblox_username: string
  reason: string
  flagged_at: string
  evidence?: string
  flagged_by?: string
  severity?: string
}

export type XTrackerResult = {
  found: boolean
  entries: XTrackerEntry[]
  total: number
}

export async function lookupXTracker(discordId: string): Promise<XTrackerResult> {
  const apiBase = process.env.XTRACKER_API_BASE
  const apiKey = process.env.XTRACKER_API_KEY

  if (!apiBase || !apiKey) {
    console.warn('XTracker API not configured')
    return { found: false, entries: [], total: 0 }
  }

  try {
    const res = await fetch(`${apiBase}/lookup/${discordId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 }, // cache 5 min
    })

    if (!res.ok) {
      if (res.status === 404) return { found: false, entries: [], total: 0 }
      throw new Error(`XTracker API error: ${res.status}`)
    }

    const data = await res.json()

    // Normalize response — update field mapping once you have the real API schema
    const entries: XTrackerEntry[] = Array.isArray(data.entries)
      ? data.entries
      : Array.isArray(data.results)
      ? data.results
      : data.found
      ? [data]
      : []

    return {
      found: entries.length > 0,
      entries,
      total: entries.length,
    }
  } catch (err) {
    console.error('XTracker lookup failed:', err)
    return { found: false, entries: [], total: 0 }
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
