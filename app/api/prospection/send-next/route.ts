import { NextResponse } from 'next/server'
import { sendNextProspectionLead } from '@/lib/prospection/send-next'

export async function POST() {
  const result = await sendNextProspectionLead()
  return NextResponse.json(result, { status: result.ok ? 200 : 409 })
}
