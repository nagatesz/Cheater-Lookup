import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { lookupXTracker, resolveDiscordUser } from '@/lib/xtracker'

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

  // 2. Query XTracker in parallel
  const xtrackerPromise = lookupXTracker(id)

  // 3. Optionally resolve Discord username
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

  // Determine severity (take the highest from either source)
  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
  let severity = dbResult?.severity || 'medium'
  if (foundInXtracker && xtrackerResult.entries[0]?.severity) {
    const xtSev = xtrackerResult.entries[0].severity as keyof typeof severityOrder
    if (severityOrder[xtSev] > severityOrder[severity as keyof typeof severityOrder]) {
      severity = xtSev
    }
  }

  // If only xtracker found it, bump confidence
  if (!foundInDb && foundInXtracker) confidence = Math.max(65, confidence)

  const response = {
    found: true,
    discord_id: id,
    username: discordInfo.username || dbResult?.username || null,
    avatar_url: discordInfo.avatar_url || dbResult?.avatar_url || null,
    roblox_username: dbResult?.roblox_username || xtrackerResult.entries[0]?.roblox_username || null,
    severity,
    confidence: Math.min(100, confidence),
    servers: dbResult?.servers || [],
    source: sources,
    notes: dbResult?.notes || null,
    evidence_links: dbResult?.evidence_links || [],
    created_at: dbResult?.created_at || xtrackerResult.entries[0]?.flagged_at || null,
    xtracker_entries: xtrackerResult.entries,
  }

  return NextResponse.json(response)
}
