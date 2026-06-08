import type { ProspectionTemplate } from './types'

const now = () => new Date().toISOString()

export const defaultTemplates: ProspectionTemplate[] = [
  {
    id: 1,
    name: 'Variacao 1 - Ola, tudo bem?',
    body: `Olá, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Seu contato chegou até mim com interesse em *canais ao vivo, filmes e séries*.\n\nVocê me concederia *5 minutos* para eu te apresentar uma proposta?\n\nCaso não faça sentido para você, sem problema. É só responder *NÃO*.`,
  },
  {
    id: 2,
    name: 'Variacao 2 - Ola, tudo bom?',
    body: `Olá, *{{nome}}*, tudo bom?\n\nAqui é o *Bruno*. Seu contato chegou até mim relacionado a *canais ao vivo, filmes e séries*.\n\nPosso te apresentar uma proposta rápida em *5 minutos*?\n\nSe não for do seu interesse, sem problema. Responda *NÃO*.`,
  },
  {
    id: 3,
    name: 'Variacao 3 - Bom dia',
    body: `Bom dia, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Estou entrando em contato porque seu contato chegou até mim com interesse em *canais ao vivo, filmes e séries*.\n\nVocê me permite te apresentar uma proposta em *5 minutos*?\n\nCaso não faça sentido, é só responder *NÃO*.`,
  },
  {
    id: 4,
    name: 'Variacao 4 - Boa tarde',
    body: `Boa tarde, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Tenho uma proposta para quem gosta de *canais ao vivo, filmes e séries*.\n\nPosso te explicar rapidamente?\n\nSe não quiser receber, sem problema. É só responder *NÃO*.`,
  },
  {
    id: 5,
    name: 'Variacao 5 - Boa noite',
    body: `Boa noite, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Seu contato chegou até mim com interesse em *canais ao vivo, filmes e séries*.\n\nVocê me concede *5 minutos* para eu te apresentar uma proposta?\n\nCaso não faça sentido, é só me responder *NÃO*.`,
  },
  {
    id: 6,
    name: 'Variacao 6 - Apresentacao breve',
    body: `Olá, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Recebi seu contato relacionado a *canais ao vivo, filmes e séries*.\n\nPosso te mostrar uma proposta breve em *5 minutos*?\n\nSe não fizer sentido, sem problema. Responda *NÃO*.`,
  },
  {
    id: 7,
    name: 'Variacao 7 - Sem compromisso',
    body: `Olá, *{{nome}}*, tudo bom?\n\nMeu nome é *Bruno*. Tenho uma proposta rápida para quem busca *canais ao vivo, filmes e séries*.\n\nVocê me permite explicar em *5 minutos*, sem compromisso?\n\nCaso prefira não receber, é só responder *NÃO*.`,
  },
  {
    id: 8,
    name: 'Variacao 8 - Bom dia direto',
    body: `Bom dia, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Seu contato chegou até mim por interesse em *filmes, séries e canais ao vivo*.\n\nPosso te apresentar uma proposta rápida?\n\nSe não for útil para você, sem problema. Responda *NÃO*.`,
  },
  {
    id: 9,
    name: 'Variacao 9 - Boa tarde curta',
    body: `Boa tarde, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Estou com uma proposta sobre *canais ao vivo, filmes e séries*.\n\nVocê teria *5 minutos* para eu te explicar?\n\nSe não quiser receber, basta responder *NÃO*.`,
  },
  {
    id: 10,
    name: 'Variacao 10 - Boa noite curta',
    body: `Boa noite, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Recebi seu contato com interesse em *canais ao vivo, filmes e séries*.\n\nPosso te enviar uma proposta rápida?\n\nCaso não faça sentido, é só responder *NÃO*.`,
  },
  {
    id: 11,
    name: 'Variacao 11 - Profissional',
    body: `Olá, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Estou falando com pessoas que demonstraram interesse em *canais ao vivo, filmes e séries*.\n\nPosso te apresentar uma opção em *5 minutos*?\n\nSe preferir não receber, sem problema. Responda *NÃO*.`,
  },
  {
    id: 12,
    name: 'Variacao 12 - Pedido de permissao',
    body: `Olá, *{{nome}}*, tudo bom?\n\nAqui é o *Bruno*. Tenho uma proposta relacionada a *canais ao vivo, filmes e séries*.\n\nVocê me autoriza explicar rapidamente?\n\nSe não for do seu interesse, responda *NÃO* e eu não te chamo novamente.`
  },
  {
    id: 13,
    name: 'Variacao 13 - Direta e gentil',
    body: `Bom dia, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Seu contato apareceu para mim com interesse em *canais ao vivo, filmes e séries*.\n\nPosso te apresentar uma proposta objetiva em *5 minutos*?\n\nCaso não queira, sem problema. É só responder *NÃO*.`,
  },
  {
    id: 14,
    name: 'Variacao 14 - Tarde sem pressao',
    body: `Boa tarde, *{{nome}}*, tudo bom?\n\nAqui é o *Bruno*. Tenho uma sugestão para quem acompanha *canais ao vivo, filmes e séries*.\n\nPosso te explicar com calma em *5 minutos*?\n\nSe não fizer sentido, basta responder *NÃO*.`,
  },
  {
    id: 15,
    name: 'Variacao 15 - Noite sem insistencia',
    body: `Boa noite, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Estou entrando em contato sobre *canais ao vivo, filmes e séries*.\n\nVocê me concederia *5 minutos* para apresentar uma proposta?\n\nSe não quiser receber, sem problema. Responda *NÃO*.`,
  },
].map((template) => ({
  ...template,
  active: true,
  weight: template.id,
  created_at: now(),
  updated_at: now(),
}))

export function renderTemplate(body: string, name?: string | null) {
  const cleanName = String(name || '').trim()
  if (!cleanName) {
    return body
      .replace(/^Olá, \*\{\{nome\}\}\*, tudo bem\?\n\n/, 'Olá, tudo bem?\n\n')
      .replace(/^Olá, \*\{\{nome\}\}\*, tudo bom\?\n\n/, 'Olá, tudo bom?\n\n')
      .replace(/^Bom dia, \*\{\{nome\}\}\*, tudo bem\?\n\n/, 'Bom dia, tudo bem?\n\n')
      .replace(/^Boa tarde, \*\{\{nome\}\}\*, tudo bem\?\n\n/, 'Boa tarde, tudo bem?\n\n')
      .replace(/^Boa tarde, \*\{\{nome\}\}\*, tudo bom\?\n\n/, 'Boa tarde, tudo bom?\n\n')
      .replace(/^Boa noite, \*\{\{nome\}\}\*, tudo bem\?\n\n/, 'Boa noite, tudo bem?\n\n')
      .replace(/\*\{\{nome\}\}\*/g, '')
      .replace(/\{\{nome\}\}/g, '')
  }
  return body.replace(/\{\{nome\}\}/g, cleanName)
}
