import type { ProspectionTemplate } from './types'
import { getTrustedFirstName } from './names'

const now = () => new Date().toISOString()

const intro = 'Meu nome é *Bruno*. Estou entrando em contato para te apresentar uma opção de entretenimento com *canais ao vivo, filmes e séries*.'

export const defaultTemplates: ProspectionTemplate[] = [
  {
    id: 1,
    name: 'Variacao 1 - Permissao direta',
    body: `Olá, *{{nome}}*, tudo bem?\n\n${intro}\n\nVocê me permite te explicar rapidinho, sem compromisso?\n\nSe não fizer sentido para você, é só responder *NÃO*.`,
  },
  {
    id: 2,
    name: 'Variacao 2 - Oi breve',
    body: `Oi, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Quero te apresentar uma opção de entretenimento com *canais ao vivo, filmes e séries*.\n\nPosso te explicar rapidinho, sem compromisso?\n\nSe não fizer sentido, é só responder *NÃO*.`,
  },
  {
    id: 3,
    name: 'Variacao 3 - Bom dia profissional',
    body: `Bom dia, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Estou falando sobre uma opção de entretenimento com *canais ao vivo, filmes e séries*.\n\nPosso te apresentar sem compromisso?\n\nSe não fizer sentido para você, responda *NÃO*.`,
  },
  {
    id: 4,
    name: 'Variacao 4 - Boa tarde leve',
    body: `Boa tarde, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Tenho uma opção de entretenimento com *canais ao vivo, filmes e séries* para te apresentar.\n\nVocê permite que eu explique rapidinho?\n\nSe não for interessante, é só responder *NÃO*.`,
  },
  {
    id: 5,
    name: 'Variacao 5 - Sem compromisso',
    body: `Olá, *{{nome}}*, tudo certo?\n\nMeu nome é *Bruno*. Estou entrando em contato para apresentar uma alternativa de entretenimento com *canais ao vivo, filmes e séries*.\n\nPosso te mostrar sem compromisso?\n\nSe não fizer sentido, responda *NÃO*.`,
  },
  {
    id: 6,
    name: 'Variacao 6 - Objetiva',
    body: `Oi, *{{nome}}*, tudo certo?\n\nAqui é o *Bruno*. Trabalho com uma opção de entretenimento com *canais ao vivo, filmes e séries*.\n\nPosso te explicar em poucos minutos, sem compromisso?\n\nSe não quiser receber, é só responder *NÃO*.`,
  },
  {
    id: 7,
    name: 'Variacao 7 - Pedido de permissao',
    body: `Olá, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Queria te apresentar uma opção de entretenimento com *canais ao vivo, filmes e séries*.\n\nVocê me autoriza explicar rapidinho?\n\nSe não fizer sentido para você, basta responder *NÃO*.`,
  },
  {
    id: 8,
    name: 'Variacao 8 - Bom dia curto',
    body: `Bom dia, *{{nome}}*, tudo certo?\n\nAqui é o *Bruno*. Estou entrando em contato sobre uma opção com *canais ao vivo, filmes e séries*.\n\nPosso te apresentar sem compromisso?\n\nSe não fizer sentido, é só responder *NÃO*.`,
  },
  {
    id: 9,
    name: 'Variacao 9 - Boa tarde curta',
    body: `Boa tarde, *{{nome}}*, tudo certo?\n\nMeu nome é *Bruno*. Tenho uma opção de entretenimento com *canais ao vivo, filmes e séries* para te mostrar.\n\nPosso te explicar rapidinho?\n\nSe não for para você, responda *NÃO*.`,
  },
  {
    id: 10,
    name: 'Variacao 10 - Apresentacao tranquila',
    body: `Olá, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Quero te apresentar com calma uma opção de entretenimento com *canais ao vivo, filmes e séries*.\n\nPosso explicar rapidinho, sem compromisso?\n\nSe não fizer sentido, é só responder *NÃO*.`,
  },
  {
    id: 11,
    name: 'Variacao 11 - Profissional',
    body: `Oi, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Estou fazendo um contato comercial para apresentar uma opção de entretenimento com *canais ao vivo, filmes e séries*.\n\nPosso te apresentar sem compromisso?\n\nSe não fizer sentido para você, responda *NÃO*.`,
  },
  {
    id: 12,
    name: 'Variacao 12 - Permissao simples',
    body: `Olá, *{{nome}}*, tudo certo?\n\nAqui é o *Bruno*. Tenho uma opção com *canais ao vivo, filmes e séries* que talvez faça sentido para você.\n\nPosso te explicar rapidinho?\n\nSe não fizer sentido, é só responder *NÃO*.`,
  },
  {
    id: 13,
    name: 'Variacao 13 - Bom dia sem pressao',
    body: `Bom dia, *{{nome}}*, tudo bem?\n\nMeu nome é *Bruno*. Estou entrando em contato para apresentar uma opção de entretenimento com *canais ao vivo, filmes e séries*.\n\nPosso te explicar sem compromisso?\n\nSe não quiser receber, responda *NÃO*.`,
  },
  {
    id: 14,
    name: 'Variacao 14 - Boa tarde permissiva',
    body: `Boa tarde, *{{nome}}*, tudo bem?\n\nAqui é o *Bruno*. Quero te mostrar uma opção de entretenimento com *canais ao vivo, filmes e séries*.\n\nPosso te apresentar rapidinho, sem compromisso?\n\nSe não fizer sentido, basta responder *NÃO*.`,
  },
  {
    id: 15,
    name: 'Variacao 15 - Leve e direta',
    body: `Oi, *{{nome}}*, tudo certo?\n\nMeu nome é *Bruno*. Estou entrando em contato para falar de uma opção de entretenimento com *canais ao vivo, filmes e séries*.\n\nPosso te explicar rapidinho?\n\nSe não fizer sentido para você, é só responder *NÃO*.`,
  },
].map((template) => ({
  ...template,
  active: true,
  weight: template.id,
  created_at: now(),
  updated_at: now(),
}))

export function renderTemplate(body: string, name?: string | null) {
  const firstName = getTrustedFirstName(name)
  if (firstName) return body.replace(/\{\{nome\}\}/g, firstName)

  return body
    .replace(/^Olá, \*\{\{nome\}\}\*, tudo bem\?\n\n/, 'Olá, tudo bem?\n\n')
    .replace(/^Olá, \*\{\{nome\}\}\*, tudo certo\?\n\n/, 'Olá, tudo bem?\n\n')
    .replace(/^Oi, \*\{\{nome\}\}\*, tudo bem\?\n\n/, 'Oi, tudo bem?\n\n')
    .replace(/^Oi, \*\{\{nome\}\}\*, tudo certo\?\n\n/, 'Oi, tudo bem?\n\n')
    .replace(/^Bom dia, \*\{\{nome\}\}\*, tudo bem\?\n\n/, 'Bom dia, tudo bem?\n\n')
    .replace(/^Bom dia, \*\{\{nome\}\}\*, tudo certo\?\n\n/, 'Bom dia, tudo bem?\n\n')
    .replace(/^Boa tarde, \*\{\{nome\}\}\*, tudo bem\?\n\n/, 'Boa tarde, tudo bem?\n\n')
    .replace(/^Boa tarde, \*\{\{nome\}\}\*, tudo certo\?\n\n/, 'Boa tarde, tudo bem?\n\n')
    .replace(/\s?\*\{\{nome\}\}\*/g, '')
    .replace(/\s?\{\{nome\}\}/g, '')
}
