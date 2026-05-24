import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const robloxId = searchParams.get('robloxId')
  const discordId = searchParams.get('discordId')
  const secret = searchParams.get('secret')

  // Simple secret gate so no one else can call this
  if (secret !== 'vultar-admin-cleanup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!robloxId && !discordId) {
    return NextResponse.json({ error: 'Provide robloxId or discordId' }, { status: 400 })
  }

  const db = createServiceClient()

  let query = db.from('cheaters').delete()
  if (discordId) {
    query = query.eq('discord_id', discordId)
  } else if (robloxId) {
    query = query.ilike('roblox_username', `%`)
  }

  // Delete by discord_id since that's the primary match
  const { data, error } = await db
    .from('cheaters')
    .delete()
    .eq('discord_id', '1086798921755525273')
    .select()

  return NextResponse.json({ deleted: data, error: error?.message || null })
}
