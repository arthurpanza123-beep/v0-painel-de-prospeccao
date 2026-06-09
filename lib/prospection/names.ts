const COMPANY_TERMS = /\b(ltda|eireli|mei|cnpj|empresa|comercio|comercial|servicos|serviço|servicos|industria|industria|associacao|associação|igreja|mercado|loja|restaurante|barbearia|clinica|clínica|consultoria|representacoes|representações)\b/i
const HONORIFICS = new Set(['sr', 'sra', 'srta', 'dr', 'dra'])

function titleCaseWord(value: string) {
  const lower = value.toLocaleLowerCase('pt-BR')
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1)
}

export function getTrustedFirstName(rawName?: string | null) {
  const raw = String(rawName || '').trim().replace(/\s+/g, ' ')
  if (!raw || raw.length > 56 || COMPANY_TERMS.test(raw)) return ''

  const words = raw
    .replace(/[_|/\\]+/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, ''))
    .filter(Boolean)

  if (words.length === 0 || words.length > 6) return ''

  const firstUseful = words.find((word) => !HONORIFICS.has(word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()))
  if (!firstUseful || firstUseful.length < 2 || !/^[A-Za-zÀ-ÿ'-]+$/.test(firstUseful)) return ''

  return titleCaseWord(firstUseful)
}

export function renderGreeting(prefix: string, rawName?: string | null) {
  const firstName = getTrustedFirstName(rawName)
  return firstName ? `${prefix}, *${firstName}*, tudo bem?` : `${prefix}, tudo bem?`
}
