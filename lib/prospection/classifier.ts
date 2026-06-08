const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export function isOptOutText(text: string) {
  const value = normalize(text)
  return /(^|\b)(nao|não|nao quero|parar|pare|remover|sair|cancelar|cancela|stop|me remove|nao me chama|nao chama|remove)(\b|$)/i.test(value)
}

export function isPositiveText(text: string) {
  const value = normalize(text)
  if (isOptOutText(text)) return false
  return /(^|\b)(sim|pode|quero|tenho interesse|pode mandar|me explica|quero saber|manda|ok|claro|explica|tenho interesse sim)(\b|$)/i.test(value)
}

export function detectDevice(text: string) {
  const value = normalize(text)
  if (/(samsung|sansung)/.test(value)) return 'Samsung'
  if (/\blg\b/.test(value)) return 'LG'
  if (/roku/.test(value)) return 'Roku'
  if (/(android tv|google tv|tcl)/.test(value)) return 'Android TV / Google TV / TCL'
  if (/(tv box|box tv)/.test(value)) return 'TV Box'
  if (/(fire stick|fire tv|mi stick|stick)/.test(value)) return 'Fire Stick / Mi Stick'
  if (/(celular|android)/.test(value)) return 'Celular Android'
  if (/(iphone|ios)/.test(value)) return 'iPhone / iOS'
  if (/(pc|computador|notebook|windows)/.test(value)) return 'PC'
  return ''
}

export function classifyInbound(text: string): 'opt_out' | 'device' | 'positive' | 'ambiguous' {
  if (isOptOutText(text)) return 'opt_out'
  if (detectDevice(text)) return 'device'
  if (isPositiveText(text)) return 'positive'
  return 'ambiguous'
}
