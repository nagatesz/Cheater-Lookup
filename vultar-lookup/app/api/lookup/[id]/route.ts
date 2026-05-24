import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  lookupXTrackerByRobloxId,
  resolveRobloxId,
  resolveDiscordUser,
  resolveRobloxAvatar,
} from '@/lib/xtracker'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  let discordId: string | null = null
  let robloxId: number | null = null
  let robloxUsername: string | null = null

  if (/^\d{17,20}$/.test(id)) {
    discordId = id
  } else if (/^\d{1,15}$/.test(id)) {
    robloxId = parseInt(id)
  } else if (/^[a-zA-Z0-9_]{3,22}$/.test(id)) {
    robloxUsername = id
  } else {
    return NextResponse.json({ error: 'Invalid input. Provide a Discord ID, Roblox ID, or Roblox Username.' }, { status: 400 })
  }

  // If we have a username but no ID, resolve the ID
  if (robloxUsername && !robloxId) {
    robloxId = await resolveRobloxId(robloxUsername)
  }

  // If we have an ID but no username (so we can check our DB which only stores username)
  if (robloxId && !robloxUsername) {
    try {
      const res = await fetch(`https://users.roblox.com/v1/users/${robloxId}`)
      if (res.ok) {
        const data = await res.json()
        robloxUsername = data.name
      }
    } catch (e) {}
  }

  const db = createServiceClient()

  // 1. Check our local DB
  let dbQuery = db.from('cheaters').select('*')
  
  if (discordId) {
    dbQuery = dbQuery.eq('discord_id', discordId)
  } else if (robloxUsername) {
    dbQuery = dbQuery.ilike('roblox_username', robloxUsername)
  } else {
    // Can't query DB effectively without discord_id or roblox_username
    dbQuery = dbQuery.eq('discord_id', 'impossible_match')
  }

  const { data: dbResult } = await dbQuery.maybeSingle()

  // If DB found a record, update our identifiers if they were missing
  if (dbResult) {
    if (!discordId) discordId = dbResult.discord_id
    if (!robloxUsername && dbResult.roblox_username) {
      robloxUsername = dbResult.roblox_username as string
      if (!robloxId) robloxId = await resolveRobloxId(robloxUsername)
    }
  }

  // 3. Query XTracker (only if we have a Roblox ID) + Discord resolver in parallel
  const xtrackerPromise = robloxId
    ? lookupXTrackerByRobloxId(robloxId)
    : Promise.resolve({ found: false, entries: [], ownershipEntries: [], total: 0 })

  const discordPromise = discordId ? resolveDiscordUser(discordId) : Promise.resolve({ username: null, avatar_url: null })
  const robloxAvatarPromise = robloxId ? resolveRobloxAvatar(robloxId) : Promise.resolve(null)

  const [xtrackerResult, discordInfo, robloxAvatarUrl] = await Promise.all([xtrackerPromise, discordPromise, robloxAvatarPromise])

  const foundInDb = !!dbResult
  const foundInXtracker = xtrackerResult.found

  if (!foundInDb && !foundInXtracker) {
    return NextResponse.json({ found: false, search_query: id, discord_id: discordId })
  }

  // Merge sources
  const sources: string[] = []
  if (foundInDb) sources.push('manual')
  if (foundInXtracker) sources.push('xtracker')

  // Normalize XTracker entries for display
  const xtrackerEntries = [
    ...xtrackerResult.entries.map(e => ({
      reason: (e.reason || e.cheat || 'Flagged in registry') as string,
      flagged_at: (e.flagged_at || new Date().toISOString()) as string,
      roblox_username: e.roblox_username as string | undefined,
      evidence: e.evidence as string | undefined,
      flagged_by: e.flagged_by as string | undefined,
      type: 'registry',
    })),
    ...xtrackerResult.ownershipEntries.map(e => ({
      reason: `Cheat ownership: ${e.cheat || e.reason || 'Unknown cheat'}`,
      flagged_at: (e.flagged_at || new Date().toISOString()) as string,
      roblox_username: e.roblox_username as string | undefined,
      evidence: e.evidence as string | undefined,
      flagged_by: e.flagged_by as string | undefined,
      type: 'ownership',
    })),
  ]

  // Determine severity (take highest from either source)
  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
  let severity = dbResult?.severity || 'medium'
  
  // Calculate confidence dynamically
  let confidence = 0
  if (foundInDb) confidence += dbResult.confidence ?? 60
  
  if (foundInXtracker) {
    let xtrackerScore = 30 // Base score for being in XTracker
    let hasCriticalKeyword = false
    
    // Add points for amount of logs (up to +20)
    xtrackerScore += Math.min(20, xtrackerEntries.length * 5)
    
    const criticalWords = ['aimbot', 'esp', 'cheat', 'lagswitch', 'exploit', 'inject']
    
    for (const entry of xtrackerEntries) {
      const reasonLower = (entry.reason || '').toLowerCase()
      if (criticalWords.some(w => reasonLower.includes(w))) {
        hasCriticalKeyword = true
        xtrackerScore += 15 // Bonus for critical keywords
      }
    }
    
    confidence = Math.min(100, confidence + xtrackerScore)
    
    // Auto-escalate severity if critical words found
    if (hasCriticalKeyword && severityOrder[severity as keyof typeof severityOrder] < severityOrder.critical) {
      severity = 'critical'
    } else if (severityOrder[severity as keyof typeof severityOrder] < severityOrder.high) {
      severity = 'high'
    }
    
    // Minimum confidence if found in Xtracker
    if (!foundInDb) confidence = Math.max(65, confidence)
  }

  const response = {
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

  return NextResponse.json(response)
}
