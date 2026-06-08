import type { CampaignStats } from "@/lib/mock-data"

const items = (s: CampaignStats) => [
  { label: "Importados", value: s.leadsImportados, tone: "text-foreground" },
  { label: "Na fila", value: s.naFila, tone: "text-foreground" },
  { label: "Simulados hoje", value: s.enviadosHoje, tone: "text-foreground" },
  { label: "Responderam", value: s.responderam, tone: "text-[var(--success)]" },
]

export function MetricsBar({ stats }: { stats: CampaignStats }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {items(stats).map((m) => (
        <div key={m.label} className="rounded-xl bg-card px-3 py-2.5 sm:px-4 sm:py-3">
          <p className={`text-xl font-bold leading-none tabular-nums sm:text-3xl ${m.tone}`}>
            {m.value}
          </p>
          <p className="mt-1 truncate text-[10px] font-medium text-muted-foreground sm:text-xs">
            {m.label}
          </p>
        </div>
      ))}
    </div>
  )
}
