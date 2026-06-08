import { NextResponse } from 'next/server'
import { getWhatsappStatus } from '@/lib/prospection/evolution'

export async function GET() {
  return NextResponse.json(await getWhatsappStatus())
}
