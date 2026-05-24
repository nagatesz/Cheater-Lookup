import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== 'vultar-admin-cleanup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  
  // Try querying with specific filters
  const { data: byDiscord, error: e1 } = await db
    .from('cheaters')
    .select('*')
    .eq('discord_id', '1086798921755525273')

  const { data: byUsername, error: e2 } = await db
    .from('cheaters')
    .select('*')
    .ilike('roblox_username', 'reiayanamifan1738')

  const { data: allNoFilter, error: e3 } = await db
    .from('cheaters')
    .select('*')

  return NextResponse.json({
    byDiscord,
    byUsername,
    allNoFilter,
    errors: { e1: e1?.message, e2: e2?.message, e3: e3?.message },
  })
}
