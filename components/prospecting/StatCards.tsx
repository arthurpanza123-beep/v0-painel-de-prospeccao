"use client"

import type { CampaignStats } from "@/lib/mock-data"

interface StatCardsProps {
  stats: CampaignStats
}

const cards = [
  {
    key: "leadsImportados" as keyof CampaignStats,
    label: "Importados",
    color: "default",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: "naFila" as keyof CampaignStats,
    label: "Na fila",
    color: "primary",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    key: "enviadosHoje" as keyof CampaignStats,
    label: "Enviados hoje",
    color: "default",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
  },
  {
    key: "responderam" as keyof CampaignStats,
    label: "Responderam",
    color: "success",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    key: "optOut" as keyof CampaignStats,
    label: "Opt-out",
    color: "error",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
  },
  {
    key: "proximoEnvio" as keyof CampaignStats,
    label: "Próximo envio",
    color: "warning",
    isTimer: true,
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
]

const colorMap = {
  default: { label: "text-muted-foreground", value: "text-foreground" },
  primary: { label: "text-primary/70", value: "text-primary" },
  success: {
    label: "text-[oklch(0.60_0.18_148)/0.7]",
    value: "text-[oklch(0.60_0.18_148)]",
  },
  error: {
    label: "text-destructive/70",
    value: "text-destructive",
  },
  warning: {
    label: "text-[oklch(0.72_0.17_56)/0.7]",
    value: "text-[oklch(0.72_0.17_56)]",
  },
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-5">
      {cards.map((card) => {
        const value = stats[card.key]
        const colors = colorMap[card.color as keyof typeof colorMap]

        return (
          <div
            key={card.key}
            className="flex flex-col gap-2.5 rounded-lg border border-border bg-card px-4 py-3.5"
          >
            <div className={`flex items-center gap-1.5 text-[11px] font-medium ${colors.label}`}>
              {card.icon}
              {card.label}
            </div>
            <span className={`text-2xl font-bold tabular-nums leading-none ${colors.value}`}>
              {String(value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
