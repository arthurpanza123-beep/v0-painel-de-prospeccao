"use client"

import type { HistoryEntry } from "@/lib/mock-data"

interface SentHistoryCardProps {
  entries: HistoryEntry[]
  onExport: () => void
}

const typeConfig = {
  enviado: {
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
    className: "text-muted-foreground",
    bg: "bg-muted/30",
  },
  resposta: {
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    className: "text-[oklch(0.62_0.17_145)]",
    bg: "bg-[oklch(0.62_0.17_145/0.06)]",
  },
  optout: {
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
    className: "text-destructive",
    bg: "bg-destructive/5",
  },
  erro: {
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    className: "text-destructive",
    bg: "bg-destructive/5",
  },
}

export function SentHistoryCard({ entries, onExport }: SentHistoryCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
            <path d="M3 3h18v18H3z" rx="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          <h2 className="text-sm font-medium text-foreground">Histórico de envios</h2>
        </div>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => {
          const cfg = typeConfig[entry.tipo]
          return (
            <div
              key={entry.id}
              className={`flex items-start gap-3 rounded-md px-3 py-2 ${cfg.bg}`}
            >
              <div className={`mt-0.5 flex-shrink-0 ${cfg.className}`}>
                {cfg.icon}
              </div>
              <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
                <span className="text-xs text-foreground leading-relaxed">{entry.descricao}</span>
                <span className="flex-shrink-0 font-mono text-xs text-muted-foreground/70">{entry.hora}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
