"use client"

import { useState } from "react"
import type { SendingRate } from "@/lib/mock-data"

interface SendingRateCardProps {
  initialRate: SendingRate
  onSave: (rate: SendingRate) => void
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  suffix,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-border bg-[oklch(0.11_0.012_243)] px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-0 transition-colors"
        />
        {suffix && (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{suffix}</span>
        )}
      </div>
    </div>
  )
}

export function SendingRateCard({ initialRate, onSave }: SendingRateCardProps) {
  const [rate, setRate] = useState<SendingRate>(initialRate)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    onSave(rate)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Ritmo de envio</h2>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Field
          label="Limite por lote"
          value={rate.limitePorLote}
          type="number"
          onChange={(v) => setRate((r) => ({ ...r, limitePorLote: parseInt(v) || 15 }))}
          suffix="msgs"
        />
        <Field
          label="Janela"
          value={rate.janelaMinutos}
          type="number"
          onChange={(v) => setRate((r) => ({ ...r, janelaMinutos: parseInt(v) || 50 }))}
          suffix="min"
        />
        <Field
          label="Intervalo mín"
          value={rate.intervaloMinMin}
          onChange={(v) => setRate((r) => ({ ...r, intervaloMinMin: v }))}
        />
        <Field
          label="Intervalo máx"
          value={rate.intervaloMaxMin}
          onChange={(v) => setRate((r) => ({ ...r, intervaloMaxMin: v }))}
        />
        <Field
          label="Início"
          value={rate.horarioInicio}
          type="time"
          onChange={(v) => setRate((r) => ({ ...r, horarioInicio: v }))}
        />
        <Field
          label="Fim"
          value={rate.horarioFim}
          type="time"
          onChange={(v) => setRate((r) => ({ ...r, horarioFim: v }))}
        />
      </div>

      {/* Resumo */}
      <div className="rounded border border-primary/12 bg-primary/5 px-3 py-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-primary font-semibold">{rate.limitePorLote} msgs</span> a cada{" "}
          <span className="text-primary font-semibold">{rate.janelaMinutos} min</span>, intervalo{" "}
          <span className="text-primary font-semibold">{rate.intervaloMinMin}</span>–
          <span className="text-primary font-semibold">{rate.intervaloMaxMin}</span>
        </p>
      </div>

      <button
        onClick={handleSave}
        className={`inline-flex items-center justify-center gap-1.5 rounded py-1.5 text-[11px] font-semibold transition-all ${
          saved
            ? "bg-[oklch(0.60_0.18_148)] text-white"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {saved ? (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Salvo
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Salvar ritmo
          </>
        )}
      </button>
    </div>
  )
}
