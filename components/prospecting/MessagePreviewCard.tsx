"use client"

import { useState } from "react"
import type { MessageTemplate } from "@/lib/mock-data"

interface Props {
  templates: MessageTemplate[]
  onEdit: () => void
}

export function MessagePreviewCard({ templates, onEdit }: Props) {
  const [selected, setSelected] = useState(0)
  const current = templates[selected]
  const sampleName = "Maria"

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Mensagem inicial
        </h2>
        <button
          onClick={onEdit}
          className="rounded px-1.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Editar variações
        </button>
      </div>

      {/* Seletor de variações */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-1">
          {templates.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setSelected(i)}
              aria-pressed={selected === i}
              className={`h-5 w-5 rounded text-[10px] font-semibold tabular-nums transition-colors ${
                selected === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.id}
            </button>
          ))}
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Variação {current.id}/{templates.length}
        </span>
      </div>

      {/* Janela de chat WhatsApp */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-[oklch(0.115_0.013_243)]">
        {/* Topo do chat */}
        <div className="flex items-center gap-2 border-b border-border bg-[oklch(0.15_0.013_243)] px-2.5 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)]/20 text-[10px] font-semibold text-[var(--success)]">
            {sampleName.charAt(0)}
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-medium text-foreground">{sampleName}</p>
            <p className="text-[9px] text-[var(--success)]">online</p>
          </div>
        </div>

        {/* Corpo do chat */}
        <div className="flex flex-1 items-start overflow-hidden p-2.5">
          <div className="relative w-full max-w-[90%] rounded-lg rounded-tl-sm bg-[oklch(0.22_0.02_252)] px-3 py-2 shadow-sm">
            <div className="max-h-24 overflow-y-auto pr-1 font-sans text-[11px] leading-[1.55] text-foreground/95">
              {current.corpo
                .replace(/{{nome}}/g, sampleName)
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {para.split(/(\*[^*]+\*)/).map((part, j) =>
                      part.startsWith("*") && part.endsWith("*") ? (
                        <strong key={j} className="font-semibold text-foreground">
                          {part.slice(1, -1)}
                        </strong>
                      ) : (
                        <span key={j}>{part}</span>
                      ),
                    )}
                  </p>
                ))}
            </div>
            <span className="mt-1 flex items-center justify-end gap-1 text-[9px] text-foreground/40">
              14:32
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary" aria-hidden="true">
                <polyline points="18 7 9 16 5 12" />
                <polyline points="22 7 13 16" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
