"use client"

import type { Lead } from "@/lib/mock-data"

interface Props {
  current: Lead | null
  upNext: Lead[]
  lastSent: Lead | null
  campaignStatus: string
  nextSendLabel: string
  emptyLabel: string
  onViewHistory?: () => void
}

export function QueueMiniCard({ current, upNext, lastSent, campaignStatus, nextSendLabel, emptyLabel, onViewHistory }: Props) {
  const isRunning = campaignStatus === "running_dry_run"
  const isPaused = campaignStatus === "paused"
  const visible = upNext.slice(0, 3)
  const remaining = Math.max(upNext.length - visible.length, 0)
  const activeLead = current || visible[0] || null

  return (
    <section className="glass-card flex h-full flex-col rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">
          Fila da campanha
        </p>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
          {isPaused ? "Pausada" : isRunning ? "Em andamento" : activeLead ? "Pronta" : "Vazia"}
        </span>
      </div>

      <div className="mt-5 flex items-start overflow-x-auto pb-2">
        <div className="flex min-w-[70px] flex-col items-center text-center">
          <span
            className={`grid h-12 w-12 place-items-center rounded-full text-primary-foreground ${isRunning ? "animate-pulse" : ""}`}
            style={{
              background: "linear-gradient(180deg, oklch(0.68 0.2 255), oklch(0.52 0.22 258))",
              boxShadow: "0 1px 0 0 oklch(1 0 0 / 0.5) inset, 0 6px 14px -6px oklch(0.52 0.22 258 / 0.7)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          </span>
          <p className="mt-2 text-xs font-bold text-foreground">Agora</p>
          <p className="max-w-[88px] truncate text-[11px] text-muted-foreground">
            {current?.nome || activeLead?.nome || emptyLabel}
          </p>
        </div>

        {visible.map((lead, index) => (
          <div key={lead.id} className="flex min-w-[96px] flex-1 items-start">
            <span className="mt-6 h-px flex-1 bg-border" aria-hidden="true" />
            <div className="flex flex-col items-center text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-sm font-bold text-foreground shadow-[0_1px_0_0_oklch(1_0_0)_inset,0_2px_6px_-2px_oklch(0.45_0.05_255_/_0.18)]">
                {index + 1}
              </span>
              <p className="mt-2 max-w-[88px] truncate text-xs font-semibold text-foreground">{lead.nome}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">{lead.proximoEnvio || nextSendLabel}</p>
            </div>
          </div>
        ))}

        {remaining > 0 && (
          <div className="flex min-w-[74px] flex-1 items-start">
            <span className="mt-6 h-px flex-1 bg-border" aria-hidden="true" />
            <div className="flex flex-col items-center text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-border bg-card text-xs font-bold text-muted-foreground">
                +{remaining}
              </span>
              <p className="mt-2 text-[11px] text-muted-foreground">Na fila</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
        {lastSent ? (
          <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{lastSent.nome}</p>
              <p className="text-[11px] text-muted-foreground">Último enviado · {lastSent.enviadoEm || "hoje"}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum envio registrado ainda</p>
        )}
        {onViewHistory && (
          <button
            onClick={onViewHistory}
            className="ml-auto shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Ver histórico
          </button>
        )}
      </div>
    </section>
  )
}
