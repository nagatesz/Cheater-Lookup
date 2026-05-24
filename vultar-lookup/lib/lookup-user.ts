import { createServiceClient } from '@/lib/supabase'
import {
  lookupXTrackerByRobloxId,
  resolveRobloxId,
  resolveDiscordUser,
  resolveRobloxAvatar,
} from '@/lib/xtracker'

export type LookupResult = {
  found: boolean
  /** Scan could not confirm — rate limited or API error; not the same as clean */
  inconclusive?: boolean
  discord_id?: string | null
  username?: string | null
  avatar_url?: string | null
  severity?: string
  confidence?: number
  servers?: string[]
  source?: string[]
  notes?: string | null
  evidence_links?: string[]
  created_at?: string | null
  roblox_username?: string | null
  roblox_id?: number | null
  search_query?: string
  xtracker_entries?: Array<{
    reason: string
    flagged_at: string
    roblox_username?: string
    evidence?: string
    flagged_by?: string
    type?: string
  }>
}

function isClovrExclusion(dbResult: {
  discord_id: string
  roblox_username?: string | null
  username?: string | null
}): boolean {
  return (
    dbResult.discord_id === '1086798921755525273' ||
    (dbResult.roblox_username?.toLowerCase() === 'reiayanamifan1738') ||
    (dbResult.username?.toLowerCase() === 'clovr')
  )
}

/** Full lookup for a Roblox user ID (clan scanner + batch API). */
export async function lookupByRobloxId(
  robloxId: number,
  workerSlot?: number
): Promise<LookupResult> {
  let discordId: string | null = null
  let robloxUsername: string | null = null

  try {
    const res = await fetch(`https://users.roblox.com/v1/users/${robloxId}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      robloxUsername = data.name
    }
  } catch {
    /* optional */
  }

  const db = createServiceClient()
  let dbQuery = db.from('cheaters').select('*')

  if (robloxUsername) {
    dbQuery = dbQuery.ilike('roblox_username', robloxUsername)
  } else {
    dbQuery = dbQuery.eq('discord_id', 'impossible_match')
  }

  let { data: dbResult } = await dbQuery.maybeSingle()

  if (dbResult && isClovrExclusion(dbResult)) {
    dbResult = null
  }

  if (dbResult) {
    discordId = dbResult.discord_id
    if (!robloxUsername && dbResult.roblox_username) {
      robloxUsername = dbResult.roblox_username as string
    }
  }

  const [xtrackerResult, discordInfo, robloxAvatarUrl] = await Promise.all([
    lookupXTrackerByRobloxId(robloxId, workerSlot),
    discordId ? resolveDiscordUser(discordId) : Promise.resolve({ username: null, avatar_url: null }),
    resolveRobloxAvatar(robloxId),
  ])

  const foundInDb = !!dbResult
  const foundInXtracker = xtrackerResult.found

  if (!foundInDb && !foundInXtracker) {
    return {
      found: false,
      inconclusive: Boolean(xtrackerResult.inconclusive),
      roblox_id: robloxId,
      discord_id: discordId,
      roblox_username: robloxUsername,
    }
  }

  const sources: string[] = []
  if (foundInDb) sources.push('manual')
  if (foundInXtracker) sources.push('xtracker')

  const xtrackerEntries = [
    ...xtrackerResult.entries.map(e => ({
      reason: (e.reason || e.cheat || 'Flagged in registry') as string,
      flagged_at: (e.flagged_at || new Date().toISOString()) as string,
      roblox_username: e.roblox_username as string | undefined,
      evidence: e.evidence as string | undefined,
      flagged_by: e.flagged_by as string | undefined,
      type: 'registry' as const,
    })),
    ...xtrackerResult.ownershipEntries.map(e => ({
      reason: `Cheat ownership: ${e.cheat || e.reason || 'Unknown cheat'}`,
      flagged_at: (e.flagged_at || new Date().toISOString()) as string,
      roblox_username: e.roblox_username as string | undefined,
      evidence: e.evidence as string | undefined,
      flagged_by: e.flagged_by as string | undefined,
      type: 'ownership' as const,
    })),
  ]

  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
  let severity = dbResult?.severity || 'medium'
  let confidence = 0
  if (foundInDb) confidence += dbResult?.confidence ?? 60

  if (foundInXtracker) {
    let xtrackerScore = 30
    let hasCriticalKeyword = false
    xtrackerScore += Math.min(20, xtrackerEntries.length * 5)

    const criticalWords = ['aimbot', 'esp', 'cheat', 'lagswitch', 'exploit', 'inject']
    for (const entry of xtrackerEntries) {
      const reasonLower = (entry.reason || '').toLowerCase()
      if (criticalWords.some(w => reasonLower.includes(w))) {
        hasCriticalKeyword = true
        xtrackerScore += 15
      }
    }

    confidence = Math.min(100, confidence + xtrackerScore)
    if (hasCriticalKeyword && severityOrder[severity as keyof typeof severityOrder] < severityOrder.critical) {
      severity = 'critical'
    } else if (severityOrder[severity as keyof typeof severityOrder] < severityOrder.high) {
      severity = 'high'
    }
    if (!foundInDb) confidence = Math.max(65, confidence)
  }

  return {
    found: true,
    discord_id: discordId || dbResult?.discord_id || null,
    username: discordInfo.username || robloxUsername || dbResult?.username || null,
    avatar_url: discordInfo.avatar_url || dbResult?.avatar_url || robloxAvatarUrl || null,
    roblox_username: robloxUsername || dbResult?.roblox_username || xtrackerResult.entries[0]?.roblox_username || null,
    roblox_id: robloxId,
    severity,
    confidence: Math.min(100, confidence),
    servers: dbResult?.servers || [],
    source: sources,
    notes: dbResult?.notes || null,
    evidence_links: dbResult?.evidence_links || [],
    created_at: dbResult?.created_at || xtrackerResult.entries[0]?.flagged_at || null,
    xtracker_entries: xtrackerEntries,
  }
}

/** Resolve Discord ID, Roblox ID, or username string (single lookup page). */
export async function lookupByQuery(id: string): Promise<LookupResult> {
  let discordId: string | null = null
  let robloxId: number | null = null
  let robloxUsername: string | null = null

  if (/^\d{17,20}$/.test(id)) {
    discordId = id
  } else if (/^\d{1,15}$/.test(id)) {
    robloxId = parseInt(id, 10)
  } else if (/^[a-zA-Z0-9_]{3,22}$/.test(id)) {
    robloxUsername = id
  } else {
    throw new Error('Invalid input. Provide a Discord ID, Roblox ID, or Roblox Username.')
  }

  if (robloxUsername && !robloxId) {
    robloxId = await resolveRobloxId(robloxUsername)
  }

  if (robloxId) {
    const result = await lookupByRobloxId(robloxId)
    return { ...result, search_query: id }
  }

  // Discord-only path (no Roblox ID)
  const db = createServiceClient()
  let { data: dbResult } = await db
    .from('cheaters')
    .select('*')
    .eq('discord_id', discordId!)
    .maybeSingle()

  if (dbResult && isClovrExclusion(dbResult)) dbResult = null

  const discordInfo = discordId ? await resolveDiscordUser(discordId) : { username: null, avatar_url: null }

  if (!dbResult) {
    return { found: false, search_query: id, discord_id: discordId }
  }

  return {
    found: true,
    discord_id: discordId,
    username: discordInfo.username || dbResult.username,
    avatar_url: discordInfo.avatar_url || dbResult.avatar_url,
    roblox_username: dbResult.roblox_username,
    severity: dbResult.severity,
    confidence: dbResult.confidence,
    servers: dbResult.servers || [],
    source: ['manual'],
    notes: dbResult.notes,
    evidence_links: dbResult.evidence_links || [],
    created_at: dbResult.created_at,
    xtracker_entries: [],
  }
}
