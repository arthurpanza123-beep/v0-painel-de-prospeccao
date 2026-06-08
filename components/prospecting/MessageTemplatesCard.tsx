"use client"

import { useState } from "react"
import type { MessageTemplate } from "@/lib/mock-data"

interface MessageTemplatesCardProps {
  templates: MessageTemplate[]
}

function renderWhatsAppMarkdown(text: string): React.ReactNode {
  // Renderiza *texto* como negrito no estilo WhatsApp
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

function MessagePreview({ template }: { template: MessageTemplate }) {
  const paragraphs = template.corpo.split("\n\n")
  return (
    <div className="rounded-lg border border-border bg-secondary p-4 font-mono text-xs leading-relaxed text-muted-foreground">
      <div className="flex flex-col gap-3">
        {paragraphs.map((para, i) => (
          <p key={i} className="leading-6">
            {renderWhatsAppMarkdown(para)}
          </p>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground/60">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Entregue
      </div>
    </div>
  )
}

export function MessageTemplatesCard({ templates }: MessageTemplatesCardProps) {
  const [activeId, setActiveId] = useState<number>(1)
  const activeTemplate = templates.find((t) => t.id === activeId) ?? templates[0]

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h2 className="text-sm font-medium text-foreground">Mensagem inicial</h2>
        </div>
        <span className="text-xs text-muted-foreground">{templates.length} variações</span>
      </div>

      {/* Grid de seleção */}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              activeId === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
            }`}
          >
            #{t.id}
          </button>
        ))}
      </div>

      {/* Título da variação selecionada */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{activeTemplate.titulo}</span>
      </div>

      {/* Preview da mensagem */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20.52 3.449C18.24 1.245 15.24 0 12 0C5.443 0 .101 5.34.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.714 1.444h.006c6.556 0 11.899-5.34 11.899-11.893 0-3.176-1.24-6.165-3.434-8.45z"
              fill="currentColor"
            />
          </svg>
          Preview — variáveis serão substituídas na hora do envio
        </div>
        <MessagePreview template={activeTemplate} />
      </div>

      {/* Legenda de variáveis */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Variáveis disponíveis:</span>
        {["{{nome}}", "{{cidade}}", "{{telefone}}"].map((v) => (
          <span
            key={v}
            className="inline-flex items-center rounded-md bg-secondary border border-border px-2 py-0.5 font-mono text-xs text-primary"
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}
