import { NextResponse } from 'next/server'
import { listTemplates } from '@/lib/prospection/store'

export async function GET() {
  const templates = await listTemplates()
  return NextResponse.json({ ok: true, templates })
}
