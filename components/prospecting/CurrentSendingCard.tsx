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

const stateStyle: Record<SendingState, { text: string; dot: string }> = {
  "Aguardando intervalo humanizado": { text: "text-muted-foreground", dot: "bg-muted-foreground" },
  "Preparando envio": { text: "text-[oklch(0.72_0.17_56)]", dot: "bg-[oklch(0.72_0.17_56)] animate-pulse" },
  "Enviando mensagem": { text: "text-primary", dot: "bg-primary animate-pulse" },
  "Mensagem enviada": { text: "text-[oklch(0.60_0.18_148)]", dot: "bg-[oklch(0.60_0.18_148)]" },
}

function renderWA(text: string): React.ReactNode {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") ? (
      <strong key={i} className="font-semibold text-foreground">{part.slice(1, -1)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function CurrentSendingCard({ lead, template, initialTimer, isRunning }: CurrentSendingCardProps) {
  const [state, setState] = useState<SendingState>("Aguardando intervalo humanizado")

  useEffect(() => {
    if (!isRunning) return
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % stateOrder.length
      setState(stateOrder[idx])
    }, 4000)
    return () => clearInterval(interval)
  }, [isRunning])

  const currentIndex = stateOrder.indexOf(state)

  return (
    <div className="rounded-lg border border-primary/15 bg-card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Enviando agora</h2>
        </div>
        <span className={`text-[11px] font-medium flex items-center gap-1 ${stateStyle[state].text}`}>
          <span className={`h-1 w-1 rounded-full ${stateStyle[state].dot}`} />
          {state}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Dados do lead + progresso */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-border bg-[oklch(0.11_0.012_243)] px-3 py-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Lead atual</span>
              <span className="font-mono text-[11px] text-[oklch(0.72_0.17_56)]">{initialTimer}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">{lead.nome}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{lead.telefone}</span>
            <span className="text-[11px] text-muted-foreground">{lead.cidade}, {lead.uf}</span>
          </div>

          {/* Barra de progresso */}
          <div className="flex flex-col gap-1.5">
            {stateOrder.map((s, i) => {
              const isDone = i < currentIndex
              const isCurrent = i === currentIndex
              return (
                <div key={s} className={`flex items-center gap-2 text-[11px] transition-all ${
                  isCurrent ? `${stateStyle[s].text} font-medium` :
                  isDone ? "text-[oklch(0.60_0.18_148)] opacity-60" : "text-muted-foreground/30"
                }`}>
                  <span className={`h-1 w-1 rounded-full shrink-0 ${
                    isCurrent ? stateStyle[s].dot : isDone ? "bg-[oklch(0.60_0.18_148)]" : "bg-border"
                  }`} />
                  {s}
                </div>
              )
            })}
          </div>
        </div>

        {/* Preview da mensagem estilo bolha */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Variação #{template.id} — mensagem
          </span>
          <div className="rounded-lg bg-[oklch(0.20_0.014_243)] px-3.5 py-2.5 font-mono text-[11px] leading-[1.65] text-muted-foreground max-h-44 overflow-y-auto">
            {template.corpo.split("\n\n").map((para, i) => (
              <p key={i} className="mb-2 last:mb-0">
                {renderWA(para.replace("{{nome}}", lead.nome))}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
