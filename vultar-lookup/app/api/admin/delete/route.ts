import { NextResponse } from 'next/server'
import { lookupXTrackerByRobloxId } from '@/lib/xtracker'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== 'vultar-admin-cleanup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const xtrackerKey = process.env.XTRACKER_API_KEY || ''
  const xtrackerBase = process.env.XTRACKER_API_BASE || ''

  // Test the xtracker lookup directly for roblox ID 35349299 (Tateyvl)
  const lookupRes = await lookupXTrackerByRobloxId(35349299)

  return NextResponse.json({
    xtrackerKeyExists: !!xtrackerKey,
    xtrackerKeyLength: xtrackerKey.length,
    xtrackerKeysCount: xtrackerKey.split(',').length,
    xtrackerBase,
    lookupRes,
  })
}
