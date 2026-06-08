import { NextResponse } from 'next/server'
import { requestWhatsappQr } from '@/lib/prospection/evolution'

export async function POST() {
  return NextResponse.json(await requestWhatsappQr())
}
