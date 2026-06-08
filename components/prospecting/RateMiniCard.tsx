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
    suffix?: string,
  ) => (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center rounded-md border border-input bg-[oklch(0.16_0.011_243)] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-2.5 py-1.5 text-xs font-medium text-foreground outline-none"
        />
        {suffix && (
          <span className="pr-2.5 text-[10px] text-muted-foreground">{suffix}</span>
        )}
      </div>
    </label>
  )

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-card p-3">
      <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Ritmo de envio
      </h2>

      <div className="grid flex-1 grid-cols-2 gap-2.5 content-start">
        {field("Lote", rate.limitePorLote, (v) =>
          update({ limitePorLote: Number(v) || 0 }), "msgs",
        )}
        {field("Janela", rate.janelaMinutos, (v) =>
          update({ janelaMinutos: Number(v) || 0 }), "min",
        )}
        {field("Intervalo mín", rate.intervaloMinMin, (v) =>
          update({ intervaloMinMin: v }), "s",
        )}
        {field("Intervalo máx", rate.intervaloMaxMin, (v) =>
          update({ intervaloMaxMin: v }), "s",
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

      <div className="mt-2.5 flex items-center gap-2">
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
          className={`ml-auto rounded-md px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
            saved
              ? "bg-[var(--success)]/15 text-[var(--success)]"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {saved ? "Ritmo salvo" : "Salvar ritmo"}
        </button>
      </div>
    </section>
  )
}
