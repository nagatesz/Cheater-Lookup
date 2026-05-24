import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== 'vultar-admin-cleanup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  return NextResponse.json({
    length: serviceKey.length,
    startsWithEyJ: serviceKey.startsWith('eyJ'),
    prefix: serviceKey.substring(0, 15),
  })
}
