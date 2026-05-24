import { NextResponse } from 'next/server'
import { lookupByQuery, lookupByRobloxId } from '@/lib/lookup-user'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url)
  const workerParam = searchParams.get('worker')
  const workerSlot =
    workerParam !== null && workerParam !== '' ? parseInt(workerParam, 10) : undefined

  try {
    if (/^\d{1,15}$/.test(params.id)) {
      const result = await lookupByRobloxId(parseInt(params.id, 10), workerSlot)
      return NextResponse.json(result)
    }
    const result = await lookupByQuery(params.id)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
