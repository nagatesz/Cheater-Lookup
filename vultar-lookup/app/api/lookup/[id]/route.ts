import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  lookupXTrackerByRobloxId,
  resolveRobloxId,
  resolveDiscordUser,
} from '@/lib/xtracker'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!/^\d{17,20}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid Discord ID' }, { status: 400 })
  }

  const db = createServiceClient()

  // 1. Check our local DB first
  const { data: dbResult } = await db
    .from('cheaters')
    .select('*')
    .eq('discord_id', id)
    .maybeSingle()

  // 2. Resolve Roblox ID for XTracker (needs Roblox user ID, not Discord)
  //    Use stored roblox_username from DB if available, otherwise skip XTracker
  let robloxId: number | null = null
  if (dbResult?.roblox_username) {
    robloxId = await resolveRobloxId(dbResult.roblox_username)
  }

  // 3. Query XTracker (only if we have a Roblox ID) + Discord resolver in parallel
  const xtrackerPromise = robloxId
    ? lookupXTrackerByRobloxId(robloxId)
    : Promise.resolve({ found: false, entries: [], ownershipEntries: [], total: 0 })

  const discordPromise = resolveDiscordUser(id)

  const [xtrackerResult, discordInfo] = await Promise.all([xtrackerPromise, discordPromise])

  const foundInDb = !!dbResult
  const foundInXtracker = xtrackerResult.found

  if (!foundInDb && !foundInXtracker) {
    return NextResponse.json({ found: false, discord_id: id })
  }

  // Merge sources
  const sources: string[] = []
  if (foundInDb) sources.push('manual')
  if (foundInXtracker) sources.push('xtracker')

  // Calculate confidence
  let confidence = 0
  if (foundInDb) confidence += dbResult.confidence ?? 60
  if (foundInXtracker) confidence = Math.min(100, confidence + 30)
  if (!foundInDb && foundInXtracker) confidence = Math.max(65, confidence)

  // Determine severity (take highest from either source)
  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
  let severity = dbResult?.severity || 'medium'
  if (foundInXtracker && xtrackerResult.entries[0]?.severity) {
    const xtSev = xtrackerResult.entries[0].severity as keyof typeof severityOrder
    if (severityOrder[xtSev] > severityOrder[severity as keyof typeof severityOrder]) {
      severity = xtSev
    }
  }

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

  const response = {
    found: true,
    discord_id: id,
    username: discordInfo.username || dbResult?.username || null,
    avatar_url: discordInfo.avatar_url || dbResult?.avatar_url || null,
    roblox_username: dbResult?.roblox_username || xtrackerResult.entries[0]?.roblox_username || null,
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
