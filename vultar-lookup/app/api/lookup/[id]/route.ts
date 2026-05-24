import { NextResponse } from 'next/server'
import { lookupByQuery } from '@/lib/lookup-user'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await lookupByQuery(params.id)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
