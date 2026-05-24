import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userIds = searchParams.get('userIds')

  if (!userIds) {
    return NextResponse.json({ error: 'Missing userIds' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=150x150&format=Png&isCircular=false`, {
      next: { revalidate: 3600 }
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch avatars' }, { status: 500 })
  }
}
