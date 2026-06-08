import type { SimStatus, SendingRate, Lead } from "@/lib/mock-data"

interface ControlCardProps {
  status: SimStatus
  rate: SendingRate
  rateChanged: boolean
  nextLead: Lead | null
  timer: string
  simuladosCount: number
  onSaveRate: () => void
}

function SafeModeChip() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[var(--warning)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]"
      title="Envio real bloqueado"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Modo seguro
    </span>
  )
}

export function ControlCard({
  status,
  rate,
  rateChanged,
  nextLead,
  timer,
  simuladosCount,
  onSaveRate,
}: ControlCardProps) {
  const big = (() => {
    switch (status) {
      case "sem-campanha":
        return { value: "Sem campanha", sub: "Crie uma campanha para começar.", tone: "text-muted-foreground" }
      case "pronta":
        return { value: "Pronta", sub: `${nextLead?.nome ? `Primeiro: ${nextLead.nome}` : "Fila preparada"}`, tone: "text-foreground" }
      case "simulando":
        return { value: timer, sub: nextLead?.nome ? `Próximo: ${nextLead.nome}` : "Processando fila", tone: "text-primary", mono: true }
      case "pausada":
        return { value: "Pausado", sub: "A fila continuará quando você retomar.", tone: "text-[var(--warning)]" }
      case "finalizada":
        return {
          value: "Simulação finalizada",
          sub: `${simuladosCount} ${simuladosCount === 1 ? "lead simulado" : "leads simulados"} · nenhum WhatsApp real enviado`,
          tone: "text-[var(--success)]",
        }
    }
  })()

  const showSafeMode = status === "simulando" || status === "pronta" || status === "pausada"

  return (
    <section className="flex h-full flex-col rounded-xl bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground">Próximo envio</h2>
        {showSafeMode && <SafeModeChip />}
      </div>

      {/* Destaque central */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p
          className={`font-bold leading-none ${big.tone} ${
            big.mono ? "font-mono text-5xl tabular-nums sm:text-6xl" : "text-2xl sm:text-3xl"
          }`}
        >
          {big.value}
        </p>
        <p className="mt-2 max-w-[26ch] text-pretty text-xs text-muted-foreground">
          {big.sub}
        </p>
      </div>

      {/* Linha de ritmo */}
      <div className="mt-3 rounded-lg bg-[oklch(0.16_0.011_243)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>Lote: <span className="font-medium text-foreground">{rate.limitePorLote}</span></span>
          <span className="text-border">·</span>
          <span>Janela: <span className="font-medium text-foreground">{rate.janelaMinutos}min</span></span>
          <span className="text-border">·</span>
          <span>
            Intervalo:{" "}
            <span className="font-medium text-foreground">
              {rate.intervaloMinMin}–{rate.intervaloMaxMin}
            </span>
          </span>
        </div>
        {rateChanged && (
          <button
            onClick={onSaveRate}
            className="mt-2 w-full rounded-md bg-primary py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Salvar ritmo
          </button>
        )}
      </div>
    </section>
  )
}
