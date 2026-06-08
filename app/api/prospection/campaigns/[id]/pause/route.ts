import { NextResponse } from 'next/server'
import { updateCampaignStatus } from '@/lib/prospection/store'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const campaign = await updateCampaignStatus(id, 'paused')
  return NextResponse.json({ ok: true, campaign })
}
