import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== 'vultar-admin-cleanup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()

  // Delete all records matching reiayanamifan1738 or discord_id 1086798921755525273
  const { data: d1, error: e1 } = await db
    .from('cheaters')
    .delete()
    .ilike('roblox_username', 'reiayanamifan1738')
    .select()

  const { data: d2, error: e2 } = await db
    .from('cheaters')
    .delete()
    .eq('discord_id', '1086798921755525273')
    .select()

  return NextResponse.json({
    deleted_by_roblox: d1,
    deleted_by_discord: d2,
    errors: [e1?.message, e2?.message].filter(Boolean),
  })
}
