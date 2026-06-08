import { NextResponse } from 'next/server'
import { createCampaign } from '@/lib/prospection/store'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const campaign = await createCampaign({
    name: body.name,
    rate_limit_count: Number(body.rate_limit_count || body.rateLimitCount || 0) || undefined,
    rate_limit_window_minutes: Number(body.rate_limit_window_minutes || body.rateLimitWindowMinutes || 0) || undefined,
    min_delay_seconds: Number(body.min_delay_seconds || body.minDelaySeconds || 0) || undefined,
    max_delay_seconds: Number(body.max_delay_seconds || body.maxDelaySeconds || 0) || undefined,
    allowed_start_time: body.allowed_start_time || body.allowedStartTime,
    allowed_end_time: body.allowed_end_time || body.allowedEndTime,
  })
  return NextResponse.json({ ok: true, campaign })
}
