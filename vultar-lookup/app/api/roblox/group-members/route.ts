import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId')
  const roleId = searchParams.get('roleId')
  const cursor = searchParams.get('cursor') || ''

  if (!groupId || !roleId) {
    return NextResponse.json({ error: 'Missing groupId or roleId' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles/${roleId}/users?limit=100&sortOrder=Asc&cursor=${cursor}`, {
      next: { revalidate: 3600 }
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}
