import { NextResponse } from 'next/server'
import { disconnectWhatsapp } from '@/lib/prospection/evolution'

export async function POST() {
  return NextResponse.json(await disconnectWhatsapp())
}
