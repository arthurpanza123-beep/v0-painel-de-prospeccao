import type { CampaignStats } from "@/lib/mock-data"

interface Metric {
  label: string
  sub: string
  value: number
  icon: React.ReactNode
}

function buildMetrics(stats: CampaignStats): Metric[] {
  return [
    {
      label: "Importados",
      sub: "Leads importados com sucesso",
      value: stats.leadsImportados,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
    },
    {
      label: "Na fila",
      sub: "Aguardando simulação",
      value: stats.naFila,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: "Simulados hoje",
      sub: "Simulações realizadas hoje",
      value: stats.enviadosHoje,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: "Responderam",
      sub: "Leads que responderam",
      value: stats.responderam,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ]
}

export function MetricsBar({ stats }: { stats: CampaignStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {buildMetrics(stats).map((m) => (
        <div key={m.label} className="metal-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="metal-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary [&_svg]:h-5 [&_svg]:w-5">
              {m.icon}
            </span>
            <div className="min-w-0">
              <p className="text-3xl font-bold leading-none tracking-tight text-foreground tabular-nums sm:text-4xl">
                {m.value}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/70 sm:text-xs">
                {m.label}
              </p>
            </div>
          </div>
          <p className="mt-3 hidden text-[11px] text-muted-foreground sm:block">{m.sub}</p>
        </div>
      ))}
    </div>
  )
}
