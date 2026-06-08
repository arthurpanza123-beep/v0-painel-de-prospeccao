import { NextResponse } from 'next/server'
import { getQueueSummary } from '@/lib/prospection/store'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const campaignId = url.searchParams.get('campaign_id') || url.searchParams.get('campaignId') || undefined
  const queue = await getQueueSummary({ campaignId })
  return NextResponse.json({ ok: true, ...queue })
}
