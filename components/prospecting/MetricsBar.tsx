"use client"

import type { CampaignStats } from "@/lib/mock-data"

type NextSendCard = {
  value: string
  detail: string
  tone?: string
}

const metrics = (stats: CampaignStats) => [
  { label: "Importados", value: stats.leadsImportados, sub: "Planilha validada" },
  { label: "Na fila", value: stats.naFila, sub: "Prontos para disparo" },
  { label: "Enviados hoje", value: stats.enviadosHoje, sub: "Envios reais do dia" },
  { label: "Responderam", value: stats.responderam, sub: "Respostas reais" },
]

export function MetricsBar({ stats, nextSend }: { stats: CampaignStats; nextSend: NextSendCard }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics(stats).map((metric) => (
        <div key={metric.label} className="metal-card rounded-xl p-4">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {metric.label}
          </p>
          <p className="mt-3 truncate text-3xl font-bold leading-none tabular-nums text-foreground">
            {metric.value}
          </p>
          <p className="mt-2 truncate text-[11px] text-muted-foreground">
            {metric.sub}
          </p>
        </div>
      ))}
    </div>
  )
}
