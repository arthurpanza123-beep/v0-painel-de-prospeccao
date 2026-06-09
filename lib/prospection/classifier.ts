const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export function isOptOutText(text: string) {
  const value = normalize(text)
  return /^(nao|n|não)$/i.test(value) || /(^|\b)(nao quero|nao tenho interesse|parar|pare|remover|sair|cancelar|cancela|stop|me remove|nao me chama|nao chama|remove)(\b|$)/i.test(value)
}

export function isPositiveText(text: string) {
  const value = normalize(text)
  if (isOptOutText(text)) return false
  if (isWrongNumberText(text) || isIdentityQuestionText(text)) return false
  return /(^|\b)(sim|pode|posso sim|claro|ok|beleza|manda|pode mandar|quero|tenho interesse|yes|pode explicar|me explica|quero saber|fala ai|fala aí|explica)(\b|$)/i.test(value)
}

export function isIdentityQuestionText(text: string) {
  const value = normalize(text)
  return /(quem e voce|quem é voce|quem é você|com quem estou falando|como pegou meu numero|como pegou meu número|onde conseguiu meu contato|que lista e essa|que lista é essa|nao te conheco|não te conheço|sobre o que e|sobre o que é|de onde voce e|de onde você é|qual empresa|do que se trata)/i.test(value)
}

export function isWrongNumberText(text: string) {
  const value = normalize(text)
  return /(numero errado|número errado|nao sou essa pessoa|não sou essa pessoa|esse numero nao e de|esse número não é de|este numero nao e de|este número não é de|aqui nao e|aqui não é|com quem voce quer falar|com quem você quer falar|nao conheco essa pessoa|não conheço essa pessoa)/i.test(value)
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

export function classifyInbound(text: string): 'opt_out' | 'wrong_number' | 'question_identity' | 'device' | 'positive' | 'ambiguous' {
  if (isWrongNumberText(text)) return 'wrong_number'
  if (isOptOutText(text)) return 'opt_out'
  if (isIdentityQuestionText(text)) return 'question_identity'
  if (detectDevice(text)) return 'device'
  if (isPositiveText(text)) return 'positive'
  return 'ambiguous'
}
