import { NextResponse } from 'next/server'
import { parseLeadFile } from '@/lib/prospection/import-parser'
import { importRows } from '@/lib/prospection/store'

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const campaignId = String(form?.get('campaignId') || '')
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, code: 'FILE_REQUIRED', message: 'Envie arquivo .xlsx ou .csv no campo file.' }, { status: 400 })
  }
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return NextResponse.json({ ok: false, code: 'INVALID_FILE_TYPE', message: 'Formato aceito: .xlsx, .xls ou .csv.' }, { status: 400 })
  }
  const rows = await parseLeadFile(file)
  const summary = await importRows(rows, file.name, campaignId || undefined)
  return NextResponse.json({ ok: true, summary })
}
