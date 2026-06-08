"use client"

import type { CampaignStats } from "@/lib/mock-data"

type NextSendCard = {
  value: string
  detail: string
  tone?: string
}

const items = (s: CampaignStats, nextSend: NextSendCard) => [
  { label: "Importados", shortLabel: "Import.", value: s.leadsImportados, tone: "text-foreground" },
  { label: "Na fila", shortLabel: "Fila", value: s.naFila, tone: "text-foreground" },
  { label: "Simuladas hoje", shortLabel: "Simul.", value: s.enviadosHoje, tone: "text-primary" },
  { label: "Responderam", shortLabel: "Resp.", value: s.responderam, tone: "text-[var(--success)]" },
  { label: "Próximo envio", shortLabel: "Próximo", value: nextSend.value, detail: nextSend.detail, tone: nextSend.tone || "text-[var(--warning)]", mono: true, featured: true },
]

export function MetricsBar({ stats, nextSend }: { stats: CampaignStats; nextSend: NextSendCard }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {items(stats, nextSend).map((m) => (
        <div
          key={m.label}
          className={`rounded-md border border-border bg-card px-2 py-1.5 sm:px-3 sm:py-2 ${m.featured ? "border-[var(--warning)]/25 bg-[var(--warning)]/5" : ""}`}
        >
          <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
            <span className="hidden sm:inline">{m.label}</span>
            <span className="sm:hidden">{m.shortLabel}</span>
          </p>
          <p className={`mt-0.5 truncate text-sm font-bold leading-none tabular-nums sm:text-lg ${m.tone} ${m.mono ? "font-mono" : ""}`}>
            {m.value}
          </p>
          {m.detail && (
            <p className="mt-1 truncate text-[9px] text-muted-foreground sm:text-[10px]">
              {m.detail}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
