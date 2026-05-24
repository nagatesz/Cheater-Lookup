import { NextResponse } from 'next/server'
import { getXTrackerKeyCount } from '@/lib/xtracker'

export const dynamic = 'force-dynamic'

export async function GET() {
  const keyCount = getXTrackerKeyCount()

  // One parallel lookup per API key; tiny pause between waves when many keys
  const concurrency = Math.max(1, keyCount)
  const waveDelayMs =
    keyCount >= 8 ? 0 : keyCount >= 5 ? 25 : keyCount >= 3 ? 75 : 200

  return NextResponse.json({
    concurrency,
    waveDelayMs,
    keysConfigured: keyCount,
  })
}
