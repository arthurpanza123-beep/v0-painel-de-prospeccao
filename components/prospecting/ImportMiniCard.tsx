"use client"

import { useRef, useState } from "react"

interface Props {
  onConfirmImport: () => void
}

export function ImportMiniCard({ onConfirmImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>("leads-novembro.xlsx")
  const [count] = useState(142)
  const [confirmed, setConfirmed] = useState(false)

  const handlePick = () => inputRef.current?.click()
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFileName(f.name)
      setConfirmed(false)
    }
  }

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-card p-3">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Importação
      </h2>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />

      <button
        onClick={handlePick}
        className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-[oklch(0.16_0.011_243)] px-2 py-3 text-center transition-colors hover:border-primary/50"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted-foreground" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {fileName ? (
          <span className="max-w-full truncate text-[11px] font-medium text-foreground">
            {fileName}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Enviar planilha Excel</span>
        )}
      </button>

      {fileName && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{count}</span> leads detectados
        </p>
      )}

      <button
        onClick={() => {
          setConfirmed(true)
          onConfirmImport()
        }}
        disabled={!fileName}
        className={`mt-2 w-full rounded-md py-1.5 text-[11px] font-medium transition-colors ${
          confirmed
            ? "bg-[var(--success)]/15 text-[var(--success)]"
            : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        }`}
      >
        {confirmed ? "Importação confirmada" : "Confirmar importação"}
      </button>
    </section>
  )
}
