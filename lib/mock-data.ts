// ─── Types ───────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "aguardando"
  | "proximo"
  | "enviando"
  | "enviado"
  | "respondeu"
  | "nao-quero"
  | "erro"

export type CampaignStatus = "parada" | "rodando" | "pausada" | "concluida"

/**
 * Estado da simulação (modo seguro). Controla o botão principal único da tela.
 * O Codex deve derivar isto de /api/prospection/status.
 */
export type SimStatus =
  | "sem-campanha"
  | "pronta"
  | "simulando"
  | "pausada"
  | "finalizada"

export type WhatsAppStatus = "desconectado" | "conectado" | "conectando"

export interface Lead {
  id: string
  nome: string
  telefone: string
  email: string
  cidade: string
  uf: string
  status: LeadStatus
  templateIndex: number
  proximoEnvio?: string // ex: "03:18"
  enviadoEm?: string
  mensagem?: string
}

export interface MessageTemplate {
  id: number
  titulo: string
  corpo: string
}

export interface CampaignStats {
  leadsImportados: number
  naFila: number
  enviadosHoje: number
  responderam: number
  optOut: number
  proximoEnvio: string
}

/** Resumo da importação (mostrado depois de confirmar). */
export interface ImportSummary {
  arquivo: string
  lidos: number
  adicionados: number
  ignorados: number
}

export const mockImportSummary: ImportSummary = {
  arquivo: "leads-novembro.xlsx",
  lidos: 150,
  adicionados: 142,
  ignorados: 8,
}

export interface SendingRate {
  limitePorLote: number
  janelaMinutos: number
  intervaloMinMin: string
  intervaloMaxMin: string
  horarioInicio: string
  horarioFim: string
}

export interface HistoryEntry {
  id: string
  hora: string
  descricao: string
  tipo: "enviado" | "resposta" | "optout" | "erro"
}

// ─── Mock Templates ───────────────────────────────────────────────────────────

export const mockTemplates: MessageTemplate[] = [
  {
    id: 1,
    titulo: "Variação 1 — Olá, tudo bem?",
    corpo: `Olá, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Seu contato chegou até mim com interesse em *canais ao vivo, filmes e séries*.\n\nVocê me concederia *5 minutos* para eu te apresentar uma proposta?\n\nCaso não faça sentido para você, sem problema. É só responder *NÃO*.`,
  },
  {
    id: 2,
    titulo: "Variação 2 — Olá, tudo bom?",
    corpo: `Olá, *{{nome}}*, tudo bom?\n\nAqui é o *Bruno*. Seu contato chegou até mim relacionado a *canais ao vivo, filmes e séries*.\n\nPosso te apresentar uma proposta rápida em *5 minutos*?\n\nSe não for do seu interesse, sem problema. Responda *NÃO*.`,
  },
  {
    id: 3,
    titulo: "Variação 3 — Bom dia",
    corpo: `Bom dia, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Estou entrando em contato porque seu contato chegou até mim com interesse em *canais ao vivo, filmes e séries*.\n\nVocê me permite te apresentar uma proposta em *5 minutos*?\n\nCaso não faça sentido, é só responder *NÃO*.`,
  },
  {
    id: 4,
    titulo: "Variação 4 — Boa tarde",
    corpo: `Boa tarde, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Tenho uma proposta para quem gosta de *canais ao vivo, filmes e séries*.\n\nPosso te explicar rapidamente?\n\nSe não quiser receber, sem problema. É só responder *NÃO*.`,
  },
  {
    id: 5,
    titulo: "Variação 5 — Boa noite",
    corpo: `Boa noite, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Seu contato chegou até mim com interesse em *canais ao vivo, filmes e séries*.\n\nVocê me concede *5 minutos* para eu te apresentar uma proposta?\n\nCaso não faça sentido, é só me responder *NÃO*.`,
  },
  {
    id: 6,
    titulo: "Variação 6 — Aqui é o Bruno",
    corpo: `Olá, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Me deparei com seu contato com interesse em *canais ao vivo, filmes e séries*.\n\nGostaria de te apresentar algo em *5 minutos*. Faz sentido?\n\nSe preferir não receber, basta responder *NÃO*.`,
  },
  {
    id: 7,
    titulo: "Variação 7 — Proposta rápida",
    corpo: `Olá, *{{nome}}*!\n\nMeu nome é *Bruno* e tenho uma proposta rápida sobre *canais ao vivo, filmes e séries*.\n\nPosso te apresentar em *5 minutos*?\n\nCaso não tenha interesse, sem problema. Responda *NÃO* e não te contato mais.`,
  },
  {
    id: 8,
    titulo: "Variação 8 — Bom dia, direto ao ponto",
    corpo: `Bom dia, *{{nome}}*!\n\nAqui é o *Bruno*. Seu contato chegou até mim com interesse em *filmes, séries e canais ao vivo*.\n\nVocê me concederia *5 minutos* para uma apresentação rápida?\n\nSe não fizer sentido, é só responder *NÃO*.`,
  },
  {
    id: 9,
    titulo: "Variação 9 — Boa tarde, direto",
    corpo: `Boa tarde, *{{nome}}*.\n\nMeu nome é *Bruno*. Tenho algo que pode interessar para quem curte *canais ao vivo, filmes e séries*.\n\nPosso te mostrar em *5 minutos*?\n\nCaso não queira receber, basta responder *NÃO*.`,
  },
  {
    id: 10,
    titulo: "Variação 10 — Interesse em canais",
    corpo: `Olá, *{{nome}}*, tudo bem?\n\nSou o *Bruno*. Vi que você tem interesse em *canais ao vivo, filmes e séries*.\n\nGostaria de te apresentar uma proposta. Levaria apenas *5 minutos*.\n\nSe não quiser, sem problema. É só responder *NÃO*.`,
  },
  {
    id: 11,
    titulo: "Variação 11 — Bom dia, interesse",
    corpo: `Bom dia, *{{nome}}*, tudo bom?\n\nAqui é o *Bruno*. Tenho uma proposta especial para quem gosta de *canais ao vivo, filmes e séries*.\n\nPoderia me dar *5 minutos*?\n\nCaso não seja do seu interesse, sem problema. Responda *NÃO*.`,
  },
  {
    id: 12,
    titulo: "Variação 12 — Boa noite, direto",
    corpo: `Boa noite, *{{nome}}*!\n\nSou o *Bruno* e estou entrando em contato sobre *canais ao vivo, filmes e séries*.\n\nVocê me concederia *5 minutos* para apresentar uma proposta?\n\nSe não fizer sentido, é só responder *NÃO*.`,
  },
  {
    id: 13,
    titulo: "Variação 13 — Abordagem gentil",
    corpo: `Olá, *{{nome}}*, tudo bem por aí?\n\nMeu nome é *Bruno*. Cheguei até você com interesse em *canais ao vivo, filmes e séries*.\n\nPosso te apresentar algo em *5 minutos*? Sem compromisso.\n\nSe preferir não receber, basta responder *NÃO*.`,
  },
  {
    id: 14,
    titulo: "Variação 14 — Sem compromisso",
    corpo: `Boa tarde, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Me deparei com seu contato relacionado a *canais ao vivo, filmes e séries*.\n\nGostaria de te fazer uma apresentação rápida de *5 minutos*, sem compromisso.\n\nCaso não queira, é só responder *NÃO*.`,
  },
  {
    id: 15,
    titulo: "Variação 15 — Curta e direta",
    corpo: `Olá, *{{nome}}*!\n\nSou o *Bruno*. Tenho uma proposta sobre *canais ao vivo, filmes e séries* que pode te interessar.\n\nPosso te apresentar em *5 minutos*?\n\nSe não quiser, sem problema — é só responder *NÃO*.`,
  },
]

// ─── Mock Leads ───────────────────────────────────────────────────────────────

export const mockLeads: Lead[] = [
  {
    id: "1",
    nome: "Maria Souza",
    telefone: "(11) 99999-9999",
    email: "maria@email.com",
    cidade: "São Paulo",
    uf: "SP",
    status: "aguardando",
    templateIndex: 0,
    proximoEnvio: "03:18",
  },
  {
    id: "2",
    nome: "Carlos Lima",
    telefone: "(11) 98888-8888",
    email: "carlos@email.com",
    cidade: "Campinas",
    uf: "SP",
    status: "proximo",
    templateIndex: 1,
    proximoEnvio: "00:42",
  },
  {
    id: "3",
    nome: "João Pereira",
    telefone: "(11) 97777-7777",
    email: "joao@email.com",
    cidade: "Santos",
    uf: "SP",
    status: "enviado",
    templateIndex: 2,
    enviadoEm: "14:20",
  },
  {
    id: "4",
    nome: "Ana Costa",
    telefone: "(11) 96666-6666",
    email: "ana@email.com",
    cidade: "Rio de Janeiro",
    uf: "RJ",
    status: "respondeu",
    templateIndex: 3,
    enviadoEm: "14:24",
  },
  {
    id: "5",
    nome: "Pedro Alves",
    telefone: "(11) 95555-5555",
    email: "pedro@email.com",
    cidade: "Belo Horizonte",
    uf: "MG",
    status: "nao-quero",
    templateIndex: 4,
    enviadoEm: "14:28",
  },
  {
    id: "6",
    nome: "Fernanda Rocha",
    telefone: "(21) 94444-4444",
    email: "fernanda@email.com",
    cidade: "Niterói",
    uf: "RJ",
    status: "aguardando",
    templateIndex: 5,
    proximoEnvio: "06:51",
  },
  {
    id: "7",
    nome: "Lucas Martins",
    telefone: "(31) 93333-3333",
    email: "lucas@email.com",
    cidade: "Contagem",
    uf: "MG",
    status: "erro",
    templateIndex: 6,
    enviadoEm: "14:33",
  },
  {
    id: "8",
    nome: "Juliana Ferreira",
    telefone: "(19) 92222-2222",
    email: "juliana@email.com",
    cidade: "Ribeirão Preto",
    uf: "SP",
    status: "aguardando",
    templateIndex: 7,
    proximoEnvio: "08:05",
  },
]

// ─── Mock Campaign Stats ──────────────────────────────────────────────────────

export const mockCampaignStats: CampaignStats = {
  leadsImportados: 142,
  naFila: 118,
  enviadosHoje: 23,
  responderam: 7,
  optOut: 3,
  proximoEnvio: "00:42",
}

// ─── Mock Sending Rate ────────────────────────────────────────────────────────

export const mockSendingRate: SendingRate = {
  limitePorLote: 15,
  janelaMinutos: 50,
  intervaloMinMin: "2min40s",
  intervaloMaxMin: "4min30s",
  horarioInicio: "09:00",
  horarioFim: "20:00",
}

// ─── Mock Queue (lead atual sendo enviado) ────────────────────────────────────

export const mockCurrentSending = {
  lead: mockLeads[1], // Carlos Lima
  estado: "Aguardando intervalo humanizado" as
    | "Aguardando intervalo humanizado"
    | "Preparando envio"
    | "Enviando mensagem"
    | "Mensagem enviada",
  timerRestante: "00:42",
  templateIndex: 1,
}

// ─── Mock History ─────────────────────────────────────────────────────────────

export const mockHistory: HistoryEntry[] = [
  {
    id: "h1",
    hora: "14:20",
    descricao: "Mensagem enviada para Maria Souza",
    tipo: "enviado",
  },
  {
    id: "h2",
    hora: "14:24",
    descricao: "Carlos Lima respondeu",
    tipo: "resposta",
  },
  {
    id: "h3",
    hora: "14:28",
    descricao: "Pedro Alves respondeu NÃO e foi marcado como opt-out",
    tipo: "optout",
  },
  {
    id: "h4",
    hora: "14:33",
    descricao: "Erro ao enviar para telefone inválido — Lucas Martins",
    tipo: "erro",
  },
  {
    id: "h5",
    hora: "14:37",
    descricao: "Mensagem enviada para João Pereira",
    tipo: "enviado",
  },
  {
    id: "h6",
    hora: "14:41",
    descricao: "Fernanda Rocha respondeu",
    tipo: "resposta",
  },
]
