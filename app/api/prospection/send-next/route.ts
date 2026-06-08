import { NextResponse } from 'next/server'
import { sendNextProspectionLead } from '@/lib/prospection/send-next'

export async function POST(request: Request) {
  const url = new URL(request.url)
  const body = await request.json().catch(() => ({}))
  const force = ['1', 'true', 'yes', 'on'].includes(String(url.searchParams.get('force') || body.force || '').toLowerCase())
  const campaignId = url.searchParams.get('campaignId') || url.searchParams.get('campaign_id') || body.campaignId || body.campaign_id || undefined
  const result = await sendNextProspectionLead({ force, campaignId })
  return NextResponse.json(result, { status: result.ok ? 200 : 409 })
}
