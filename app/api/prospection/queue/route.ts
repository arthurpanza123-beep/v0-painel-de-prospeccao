import { NextResponse } from 'next/server'
import { getQueueSummary } from '@/lib/prospection/store'

export async function GET() {
  const queue = await getQueueSummary()
  return NextResponse.json({ ok: true, ...queue })
}
