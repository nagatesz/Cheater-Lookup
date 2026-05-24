import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== 'vultar-admin-cleanup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set'
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'not set'
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || 'not set'

  const db = createServiceClient()
  
  // Try querying a different way or check error
  const { data, error } = await db.from('cheaters').select('*').limit(5)

  return NextResponse.json({
    env: {
      url,
      anon: anon !== 'not set' ? anon.substring(0, 10) + '...' : 'not set',
      service: service !== 'not set' ? service.substring(0, 10) + '...' : 'not set',
    },
    data,
    error: error?.message || null,
  })
}
