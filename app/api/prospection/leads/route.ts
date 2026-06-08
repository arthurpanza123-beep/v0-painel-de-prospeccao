import { NextResponse } from 'next/server'
import { listLeads } from '@/lib/prospection/store'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || undefined
  const campaignId = url.searchParams.get('campaign_id') || url.searchParams.get('campaignId') || undefined
  const page = Number(url.searchParams.get('page') || 1)
  const pageSize = Number(url.searchParams.get('pageSize') || 50)
  const result = await listLeads({ status, campaignId, page, pageSize })
  return NextResponse.json({ ok: true, ...result })
}
