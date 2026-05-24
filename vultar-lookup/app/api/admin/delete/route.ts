import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== 'vultar-admin-cleanup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()

  // Select all records from cheaters
  const { data: allCheaters, error: e1 } = await db
    .from('cheaters')
    .select('*')

  return NextResponse.json({
    allCheaters,
    error: e1?.message || null,
  })
}
