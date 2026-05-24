import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId')

  if (!groupId) {
    return NextResponse.json({ error: 'Missing groupId' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles`, {
      next: { revalidate: 3600 }
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}
