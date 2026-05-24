import { NextResponse } from 'next/server'
import { getScanSettings } from '@/lib/scan-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getScanSettings())
}
