"use client"

import type { HistoryEntry } from "@/lib/mock-data"

interface SentHistoryCardProps {
  entries: HistoryEntry[]
  onExport: () => void
}

const typeConfig = {
  enviado: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
    iconClass: "text-muted-foreground",
    rowClass: "",
  },
  resposta: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    iconClass: "text-[oklch(0.60_0.18_148)]",
    rowClass: "bg-[oklch(0.60_0.18_148/0.04)]",
  },
  optout: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
    iconClass: "text-destructive",
    rowClass: "bg-destructive/4",
  },
  erro: {
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    iconClass: "text-destructive",
    rowClass: "bg-destructive/4",
  },
}

export function SentHistoryCard({ entries, onExport }: SentHistoryCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Histórico</h2>
        </div>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1 rounded border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        {entries.map((entry) => {
          const cfg = typeConfig[entry.tipo]
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 rounded px-2.5 py-2 ${cfg.rowClass}`}
            >
              <span className={`shrink-0 mt-px ${cfg.iconClass}`}>{cfg.icon}</span>
              <span className="flex-1 text-[11px] text-foreground/80 leading-relaxed">{entry.descricao}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">{entry.hora}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
