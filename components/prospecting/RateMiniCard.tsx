"use client"

import { useState } from "react"
import type { SendingRate } from "@/lib/mock-data"

interface Props {
  initialRate: SendingRate
  onSave: (rate: SendingRate) => void
}

export function RateMiniCard({ initialRate, onSave }: Props) {
  const [rate, setRate] = useState(initialRate)
  const [showMore, setShowMore] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (patch: Partial<SendingRate>) => {
    setRate((r) => ({ ...r, ...patch }))
    setSaved(false)
  }

  const field = (
    label: string,
    value: string | number,
    onChange: (v: string) => void,
  ) => (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-input bg-[oklch(0.16_0.011_243)] px-2 py-1 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </label>
  )

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-card p-3">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Ritmo de envio
      </h2>

      <div className="grid flex-1 grid-cols-2 gap-2 content-start">
        {field("Lote", rate.limitePorLote, (v) =>
          update({ limitePorLote: Number(v) || 0 }),
        )}
        {field("Janela (min)", rate.janelaMinutos, (v) =>
          update({ janelaMinutos: Number(v) || 0 }),
        )}
        {field("Interv. mín", rate.intervaloMinMin, (v) =>
          update({ intervaloMinMin: v }),
        )}
        {field("Interv. máx", rate.intervaloMaxMin, (v) =>
          update({ intervaloMaxMin: v }),
        )}
        {showMore && (
          <>
            {field("Início", rate.horarioInicio, (v) =>
              update({ horarioInicio: v }),
            )}
            {field("Fim", rate.horarioFim, (v) => update({ horarioFim: v }))}
          </>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => setShowMore((s) => !s)}
          className="rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {showMore ? "Menos opções" : "Mais opções"}
        </button>
        <button
          onClick={() => {
            setSaved(true)
            onSave(rate)
          }}
          className={`ml-auto rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
            saved
              ? "bg-[var(--success)]/15 text-[var(--success)]"
              : "bg-secondary text-foreground hover:bg-muted"
          }`}
        >
          {saved ? "Salvo" : "Salvar ritmo"}
        </button>
      </div>
    </section>
  )
}
