import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      discord_id,
      username,
      roblox_username,
      server_name,
      reason,
      severity = 'medium',
      submitted_by,
      notes,
      evidence_links = [],
    } = body

    if (!discord_id || !/^\d{17,20}$/.test(discord_id)) {
      return NextResponse.json({ error: 'Invalid Discord ID' }, { status: 400 })
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    const db = createServiceClient()

    // Log the raw report regardless
    await db.from('reports').insert({
      discord_id,
      reported_by: submitted_by || null,
      server_name: server_name || null,
      reason,
      evidence: evidence_links.join('\n') || null,
    })

    // Check if user already exists in cheaters table
    const { data: existing } = await db
      .from('cheaters')
      .select('*')
      .eq('discord_id', discord_id)
      .maybeSingle()

    const severityOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }
    const currentSeverity = existing?.severity || 'low'
    const newSeverity = severityOrder[severity] > severityOrder[currentSeverity] ? severity : currentSeverity

    // Merge servers
    const existingServers: string[] = existing?.servers || []
    const updatedServers = server_name && !existingServers.includes(server_name)
      ? [...existingServers, server_name]
      : existingServers

    // Merge evidence
    const existingEvidence: string[] = existing?.evidence_links || []
    const newEvidence = evidence_links.filter((l: string) => !existingEvidence.includes(l))
    const updatedEvidence = [...existingEvidence, ...newEvidence]

    // Calculate confidence bump
    const newConfidence = Math.min(100, (existing?.confidence || 40) + 15)

    if (existing) {
      await db.from('cheaters').update({
        severity: newSeverity,
        servers: updatedServers,
        evidence_links: updatedEvidence,
        confidence: newConfidence,
        username: username || existing.username,
        roblox_username: roblox_username || existing.roblox_username,
        notes: notes ? (existing.notes ? `${existing.notes}\n---\n${notes}` : notes) : existing.notes,
        updated_at: new Date().toISOString(),
      }).eq('discord_id', discord_id)
    } else {
      await db.from('cheaters').insert({
        discord_id,
        username: username || null,
        roblox_username: roblox_username || null,
        servers: server_name ? [server_name] : [],
        severity: newSeverity,
        confidence: 50,
        notes: notes || null,
        evidence_links,
        submitted_by: submitted_by || null,
        source: 'manual',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
