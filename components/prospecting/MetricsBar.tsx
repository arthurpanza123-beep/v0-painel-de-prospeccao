"use client"

import type { CampaignStats } from "@/lib/mock-data"

const items = (s: CampaignStats) => [
  { label: "Importados", value: s.leadsImportados, tone: "text-foreground" },
  { label: "Na fila", value: s.naFila, tone: "text-foreground" },
  { label: "Enviadas hoje", value: s.enviadosHoje, tone: "text-primary" },
  { label: "Responderam", value: s.responderam, tone: "text-[var(--success)]" },
  { label: "Próximo envio", value: s.proximoEnvio, tone: "text-[var(--warning)]", mono: true },
]

export function MetricsBar({ stats }: { stats: CampaignStats }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {items(stats).map((m) => (
        <div
          key={m.label}
          className="rounded-md border border-border bg-card px-2 py-1.5 sm:px-3 sm:py-2"
        >
          <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
            {m.label}
          </p>
          <p className={`mt-0.5 text-sm font-bold leading-none tabular-nums sm:text-lg ${m.tone} ${m.mono ? "font-mono" : ""}`}>
            {m.value}
          </p>
        </div>
      ))}
    </div>
  )
}
