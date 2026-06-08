"use client"

import type { SimStatus, SendingRate, Lead } from "@/lib/mock-data"

interface OperationsCardProps {
  status: SimStatus
  rate: SendingRate
  nextLead: Lead | null
  timer: string
  onPrimary: () => void
}

const TITLE: Record<SimStatus, string> = {
  "sem-campanha": "Sem campanha ativa",
  pronta: "Pronta para simular",
  simulando: "Simulação em andamento",
  pausada: "Simulação pausada",
  finalizada: "Simulação finalizada",
}

export function OperationsCard({ status, rate, nextLead, timer, onPrimary }: OperationsCardProps) {
  const isRunning = status === "simulando"
  const showTimer = status === "simulando" || status === "pausada"

  return (
    <section className="glass-card flex h-full flex-col rounded-3xl p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Central de Operações
      </p>

      <div className="mt-3 flex flex-1 items-center gap-4">
        {/* Texto à esquerda */}
        <div className="min-w-0 flex-1">
          <h2 className="text-pretty text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {showTimer ? (
              <span className="font-mono tabular-nums">{timer}</span>
            ) : (
              TITLE[status]
            )}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {nextLead ? (
              <>
                {isRunning ? "Enviando: " : "Próximo: "}
                <span className="font-semibold text-foreground">{nextLead.nome}</span>
              </>
            ) : (
              "Importe leads para começar"
            )}
          </p>
        </div>

        {/* Botão de play compacto */}
        <button
          onClick={onPrimary}
          aria-label={isRunning ? "Pausar simulação" : "Iniciar simulação"}
          className="group grid h-16 w-16 shrink-0 place-items-center rounded-full text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 sm:h-20 sm:w-20"
          style={{
            background: isRunning
              ? "linear-gradient(180deg, oklch(0.7 0.04 255), oklch(0.55 0.04 255))"
              : "linear-gradient(180deg, oklch(0.68 0.2 255), oklch(0.52 0.22 258))",
            boxShadow:
              "0 1px 0 0 oklch(1 0 0 / 0.5) inset, 0 -3px 8px oklch(0.3 0.1 258 / 0.4) inset, 0 8px 18px -6px oklch(0.52 0.22 258 / 0.6)",
          }}
        >
          {isRunning ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1" aria-hidden="true">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
          )}
        </button>
      </div>

      {/* Rodapé: parâmetros de ritmo + modo seguro */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-secondary/60 px-4 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Lote</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">{rate.limitePorLote}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Janela</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">{rate.janelaMinutos}min</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Intervalo</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">
            {rate.intervaloMinMin} – {rate.intervaloMaxMin}
          </p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Modo seguro
        </span>
      </div>
    </section>
  )
}
