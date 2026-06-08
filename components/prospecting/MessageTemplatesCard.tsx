"use client"

import { useState } from "react"
import type { MessageTemplate } from "@/lib/mock-data"

interface MessageTemplatesCardProps {
  templates: MessageTemplate[]
}

function renderWhatsApp(text: string): React.ReactNode {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(1, -1)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

// Bolha de WhatsApp dark
function WaBubble({ template }: { template: MessageTemplate }) {
  return (
    <div className="flex flex-col gap-0.5">
      {/* Cabeçalho estilo chat */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20.52 3.449C18.24 1.245 15.24 0 12 0C5.443 0 .101 5.34.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.714 1.444h.006c6.556 0 11.899-5.34 11.899-11.893 0-3.176-1.24-6.165-3.434-8.45z"
              fill="oklch(0.60 0.20 252)"
            />
          </svg>
        </div>
        <span className="text-[11px] text-muted-foreground">centralplay-leads · Preview da mensagem</span>
      </div>
      {/* Bolha */}
      <div className="ml-7 max-w-[90%]">
        <div className="relative rounded-lg rounded-tl-none bg-[oklch(0.20_0.014_243)] px-3.5 py-2.5 shadow-sm">
          {/* Triângulo da bolha */}
          <div
            className="absolute -left-2 top-0 h-0 w-0 border-b-[8px] border-r-[8px] border-b-transparent border-r-[oklch(0.20_0.014_243)]"
            aria-hidden="true"
          />
          <div className="font-mono text-[11px] leading-[1.65] text-muted-foreground flex flex-col gap-2 max-h-44 overflow-y-auto">
            {template.corpo.split("\n\n").map((para, i) => (
              <p key={i}>{renderWhatsApp(para)}</p>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-end gap-0.5 text-[10px] text-muted-foreground/50">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MessageTemplatesCard({ templates }: MessageTemplatesCardProps) {
  const [activeId, setActiveId] = useState<number>(1)
  const activeTemplate = templates.find((t) => t.id === activeId) ?? templates[0]

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Mensagem inicial</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{templates.length} variações</span>
      </div>

      {/* Seletor compacto de variações */}
      <div className="flex flex-wrap gap-1">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            aria-pressed={activeId === t.id}
            className={`min-w-[2.25rem] rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              activeId === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
            }`}
          >
            {t.id}
          </button>
        ))}
      </div>

      {/* Nome da variação */}
      <p className="text-[11px] text-muted-foreground">{activeTemplate.titulo}</p>

      {/* Preview em bolha WhatsApp dark */}
      <WaBubble template={activeTemplate} />

      {/* Variáveis */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-muted-foreground">Variáveis:</span>
        {["{{nome}}", "{{cidade}}", "{{telefone}}"].map((v) => (
          <code key={v} className="rounded bg-secondary border border-border px-1.5 py-0.5 font-mono text-[10px] text-primary">
            {v}
          </code>
        ))}
      </div>
    </div>
  )
}
