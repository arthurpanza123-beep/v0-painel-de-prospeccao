"use client"

import { useState, useEffect } from "react"
import type { Lead, MessageTemplate } from "@/lib/mock-data"

type SendingState =
  | "Aguardando intervalo humanizado"
  | "Preparando envio"
  | "Enviando mensagem"
  | "Mensagem enviada"

interface CurrentSendingCardProps {
  lead: Lead
  template: MessageTemplate
  initialTimer: string
  isRunning: boolean
}

const stateOrder: SendingState[] = [
  "Aguardando intervalo humanizado",
  "Preparando envio",
  "Enviando mensagem",
  "Mensagem enviada",
]

const stateColors: Record<SendingState, string> = {
  "Aguardando intervalo humanizado": "text-muted-foreground",
  "Preparando envio": "text-[oklch(0.72_0.16_55)]",
  "Enviando mensagem": "text-primary",
  "Mensagem enviada": "text-[oklch(0.62_0.17_145)]",
}

const stateDotColors: Record<SendingState, string> = {
  "Aguardando intervalo humanizado": "bg-muted-foreground",
  "Preparando envio": "bg-[oklch(0.72_0.16_55)] animate-pulse",
  "Enviando mensagem": "bg-primary animate-pulse",
  "Mensagem enviada": "bg-[oklch(0.62_0.17_145)]",
}

function renderWhatsAppMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(1, -1)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function CurrentSendingCard({
  lead,
  template,
  initialTimer,
  isRunning,
}: CurrentSendingCardProps) {
  const [state, setState] = useState<SendingState>("Aguardando intervalo humanizado")
  const [timer, setTimer] = useState(initialTimer)

  // Simula a progressão de estados quando está rodando
  useEffect(() => {
    if (!isRunning) return
    let stateIndex = 0
    const interval = setInterval(() => {
      stateIndex = (stateIndex + 1) % stateOrder.length
      setState(stateOrder[stateIndex])
    }, 4000)
    return () => clearInterval(interval)
  }, [isRunning])

  const paragraphs = template.corpo.split("\n\n")

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          <h2 className="text-sm font-medium text-foreground">Agora enviando</h2>
        </div>
        {/* Estado atual */}
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${stateDotColors[state]}`} />
          <span className={`text-xs font-medium ${stateColors[state]}`}>{state}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Dados do lead */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-secondary p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Lead</span>
              <span className="font-mono text-xs text-primary">{timer}</span>
            </div>
            <span className="text-base font-semibold text-foreground">{lead.nome}</span>
            <span className="font-mono text-xs text-muted-foreground">{lead.telefone}</span>
            <span className="text-xs text-muted-foreground">
              {lead.cidade}, {lead.uf}
            </span>
          </div>

          {/* Barra de progresso dos estados */}
          <div className="flex flex-col gap-1.5">
            {stateOrder.map((s) => {
              const currentIndex = stateOrder.indexOf(state)
              const thisIndex = stateOrder.indexOf(s)
              const isDone = thisIndex < currentIndex
              const isCurrent = thisIndex === currentIndex
              return (
                <div
                  key={s}
                  className={`flex items-center gap-2 text-xs transition-all ${
                    isCurrent
                      ? stateColors[s] + " font-medium"
                      : isDone
                      ? "text-[oklch(0.62_0.17_145)] opacity-70"
                      : "text-muted-foreground/40"
                  }`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      isCurrent
                        ? stateDotColors[s]
                        : isDone
                        ? "bg-[oklch(0.62_0.17_145)]"
                        : "bg-border"
                    }`}
                  />
                  {s}
                </div>
              )
            })}
          </div>
        </div>

        {/* Preview da mensagem */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">
            Variação #{template.id} — mensagem a ser enviada
          </span>
          <div className="rounded-lg border border-border bg-secondary p-3 font-mono text-xs leading-relaxed text-muted-foreground max-h-48 overflow-y-auto">
            {paragraphs.map((para, i) => (
              <p key={i} className="leading-6 mb-2 last:mb-0">
                {renderWhatsAppMarkdown(para.replace("{{nome}}", lead.nome))}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
