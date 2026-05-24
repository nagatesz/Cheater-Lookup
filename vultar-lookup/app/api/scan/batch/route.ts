import { NextResponse } from 'next/server'
import { lookupByRobloxId } from '@/lib/lookup-user'
import { getScanSettings } from '@/lib/scan-settings'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  const { ids } = (await req.json()) as { ids?: unknown }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 })
  }

  const { concurrency, keysConfigured } = getScanSettings()
  const robloxIds = ids
    .map(id => (typeof id === 'string' ? parseInt(id, 10) : Number(id)))
    .filter(id => Number.isFinite(id) && id > 0)
    .slice(0, concurrency)

  if (robloxIds.length === 0) {
    return NextResponse.json({ error: 'No valid Roblox IDs' }, { status: 400 })
  }

  const results = await Promise.all(
    robloxIds.map(async (roblox_id, index) => ({
      roblox_id,
      result: await lookupByRobloxId(roblox_id, index),
    }))
  )

  return NextResponse.json({
    results,
    keysConfigured,
    batchSize: robloxIds.length,
  })
}
