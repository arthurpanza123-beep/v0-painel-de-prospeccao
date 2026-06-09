import { NextResponse } from 'next/server'
import { authorizeRealRecipient } from '@/lib/prospection/store'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; flow?: string; source?: string } | null
  const result = await authorizeRealRecipient({
    phone: body?.phone || '',
    flow: body?.flow,
    source: body?.source,
  })
  return NextResponse.json(result, { status: result.allowed ? 200 : 400 })
}
