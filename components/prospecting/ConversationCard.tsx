"use client"

import { useState } from "react"
import type { MessageTemplate } from "@/lib/mock-data"

interface Props {
  templates: MessageTemplate[]
  contato?: string
  horario?: string
}

export function ConversationCard({ templates, contato = "Maria", horario = "15:42" }: Props) {
  const [selected] = useState(0)
  const current = templates[selected]

  const paragrafos = current.corpo.replace(/{{nome}}/g, contato).split("\n\n")

  return (
    <section className="glass-card flex h-full flex-col rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Conversa atual
        </p>
        <p className="text-[11px] font-medium text-muted-foreground">
          {contato} · {horario}
        </p>
      </div>

      {/* Janela de chat clara estilo WhatsApp */}
      <div
        className="mt-3 flex flex-1 flex-col overflow-hidden rounded-2xl border border-border"
        style={{ background: "linear-gradient(180deg, oklch(0.97 0.01 145), oklch(0.95 0.012 145))" }}
      >
        <div className="flex flex-1 items-start gap-2 overflow-y-auto p-3">
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--success)]/18 text-xs font-bold text-[var(--success)]">
            {contato.charAt(0)}
          </span>
          {/* Balão recebido (branco) */}
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 shadow-[0_1px_2px_oklch(0.4_0.02_145_/_0.12)]">
            <div className="font-sans text-[13px] leading-[1.5] text-foreground">
              {paragrafos.map((para, i) => (
                <p key={i} className="mb-2 last:mb-0">
                  {para.split(/(\*[^*]+\*)/).map((part, j) =>
                    part.startsWith("*") && part.endsWith("*") ? (
                      <strong key={j} className="font-semibold">
                        {part.slice(1, -1)}
                      </strong>
                    ) : (
                      <span key={j}>{part}</span>
                    ),
                  )}
                </p>
              ))}
            </div>
            <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              14:32
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary" aria-hidden="true">
                <polyline points="18 7 9 16 5 12" />
                <polyline points="22 7 13 16" />
              </svg>
            </span>
          </div>
        </div>

        {/* Campo de digitação (somente leitura — modo seguro) */}
        <div className="flex items-center gap-2 border-t border-border bg-card/60 p-2.5">
          <div className="flex-1 rounded-full bg-card px-4 py-2 text-[13px] text-muted-foreground shadow-[inset_0_1px_2px_oklch(0.4_0.02_255_/_0.08)]">
            Digite uma mensagem...
          </div>
          <button
            aria-label="Enviar"
            disabled
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-primary-foreground btn-glossy disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
