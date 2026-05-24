import { NextResponse } from 'next/server'
import { resolveRobloxId, lookupXTrackerByRobloxId } from '@/lib/xtracker'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== 'vultar-admin-cleanup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedId = await resolveRobloxId("Tateyvl")
  const lookupRes = resolvedId ? await lookupXTrackerByRobloxId(resolvedId) : null

  return NextResponse.json({
    username: "Tateyvl",
    resolvedId,
    lookupRes,
  })
}
