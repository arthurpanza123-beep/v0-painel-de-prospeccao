"use client"

import { useState } from "react"
import type { SendingRate } from "@/lib/mock-data"

interface SendingRateCardProps {
  initialRate: SendingRate
  onSave: (rate: SendingRate) => void
}

export function SendingRateCard({ initialRate, onSave }: SendingRateCardProps) {
  const [rate, setRate] = useState<SendingRate>(initialRate)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    onSave(rate)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Field = ({
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
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
        {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <h2 className="text-sm font-medium text-foreground">Ritmo de envio</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Limite por lote"
          value={rate.limitePorLote}
          type="number"
          onChange={(v) => setRate((r) => ({ ...r, limitePorLote: parseInt(v) || 15 }))}
          suffix="mensagens"
        />
        <Field
          label="Janela"
          value={rate.janelaMinutos}
          type="number"
          onChange={(v) => setRate((r) => ({ ...r, janelaMinutos: parseInt(v) || 50 }))}
          suffix="minutos"
        />
        <Field
          label="Intervalo mínimo"
          value={rate.intervaloMinMin}
          onChange={(v) => setRate((r) => ({ ...r, intervaloMinMin: v }))}
        />
        <Field
          label="Intervalo máximo"
          value={rate.intervaloMaxMin}
          onChange={(v) => setRate((r) => ({ ...r, intervaloMaxMin: v }))}
        />
        <Field
          label="Horário de início"
          value={rate.horarioInicio}
          type="time"
          onChange={(v) => setRate((r) => ({ ...r, horarioInicio: v }))}
        />
        <Field
          label="Horário de fim"
          value={rate.horarioFim}
          type="time"
          onChange={(v) => setRate((r) => ({ ...r, horarioFim: v }))}
        />
      </div>

      {/* Simulação */}
      <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Com essa configuração, o painel envia até{" "}
          <span className="text-primary font-semibold">{rate.limitePorLote} mensagens</span> a cada{" "}
          <span className="text-primary font-semibold">{rate.janelaMinutos} minutos</span>, com intervalos
          de <span className="text-primary font-semibold">{rate.intervaloMinMin}</span> a{" "}
          <span className="text-primary font-semibold">{rate.intervaloMaxMin}</span> entre envios.
        </p>
      </div>

      <button
        onClick={handleSave}
        className={`inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-all ${
          saved
            ? "bg-[oklch(0.62_0.17_145)] text-white"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {saved ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Ritmo salvo
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
