"use client"

import type { CampaignStats } from "@/lib/mock-data"

type NextSendCard = {
  value: string
  detail: string
  tone?: string
}

const metrics = (stats: CampaignStats) => [
  { label: "Importados", value: stats.leadsImportados, sub: "Leads adicionados" },
  { label: "Na fila", value: stats.naFila, sub: "Aguardando campanha" },
  { label: "Enviados hoje", value: stats.enviadosHoje, sub: "Processados hoje" },
  { label: "Responderam", value: stats.responderam, sub: "Retornos recebidos" },
]

export function MetricsBar({ stats, nextSend }: { stats: CampaignStats; nextSend: NextSendCard }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics(stats).map((metric) => (
        <div key={metric.label} className="metal-card rounded-xl p-4">
          <p className="truncate text-[11px] font-semibold uppercase text-muted-foreground">
            {metric.label}
          </p>
          <p className="mt-2 truncate text-2xl font-bold leading-none tabular-nums text-foreground">
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
