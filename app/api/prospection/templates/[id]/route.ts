import { NextResponse } from 'next/server'
import { updateTemplate } from '@/lib/prospection/store'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 })
  }
  const template = await updateTemplate(Number(id), body)
  return NextResponse.json({ ok: true, template })
}
