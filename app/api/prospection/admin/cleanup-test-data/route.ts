import { NextResponse } from 'next/server'
import { cleanupTestDryRunData } from '@/lib/prospection/store'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  if (body.confirm !== 'LIMPAR_TESTES_DRY_RUN') {
    return NextResponse.json(
      { ok: false, code: 'CONFIRMATION_REQUIRED', message: 'Confirme com LIMPAR_TESTES_DRY_RUN.' },
      { status: 400 },
    )
  }
  const deleted = await cleanupTestDryRunData()
  return NextResponse.json({ ok: true, deleted })
}
