"use client"

import type { Lead } from "@/lib/mock-data"

interface Props {
  current: Lead | null
  upNext: Lead[]
  lastSent: Lead | null
  isRunning: boolean
  onViewHistory: () => void
}

export function QueueMiniCard({ current, upNext, lastSent, isRunning, onViewHistory }: Props) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Fila
        </h2>
        <button
          onClick={onViewHistory}
          className="rounded px-1.5 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Ver histórico
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {/* Enviando agora */}
        <div className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5">
          <p className="text-[9px] font-medium uppercase tracking-wide text-primary/80">
            Enviando agora
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {isRunning && current ? (
              <>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse" />
                <span className="truncate text-xs font-semibold text-foreground">
                  {current.nome}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Campanha parada</span>
            )}
          </div>
        </div>

        {/* Próximos */}
        <div>
          <p className="mb-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            Próximos da fila
          </p>
          <ul className="flex flex-col gap-1">
            {upNext.slice(0, 3).map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded bg-secondary px-2 py-1"
              >
                <span className="truncate text-[11px] text-foreground">{l.nome}</span>
                {l.proximoEnvio && (
                  <span className="shrink-0 font-mono text-[10px] text-[var(--warning)]">
                    {l.proximoEnvio}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Último enviado */}
        <div className="mt-auto rounded-md bg-[oklch(0.16_0.011_243)] px-2.5 py-1.5">
          <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            Último enviado
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-[var(--success)]" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="truncate text-[11px] text-foreground">
              {lastSent ? lastSent.nome : "—"}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
