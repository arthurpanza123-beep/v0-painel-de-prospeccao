export async function parseLeadFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer())
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}
