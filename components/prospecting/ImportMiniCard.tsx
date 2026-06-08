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

      <div className="flex flex-1 flex-col justify-center gap-2">
        {/* Linha do arquivo */}
        <button
          onClick={handlePick}
          className="flex w-full items-center gap-2.5 rounded-md border border-border bg-[oklch(0.16_0.011_243)] px-2.5 py-2 text-left transition-colors hover:border-primary/50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--success)]/15">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--success)]" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-foreground">
              {fileName ?? "Selecionar planilha Excel"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {fileName ? "Toque para trocar" : ".xlsx, .xls ou .csv"}
            </span>
          </span>
          {fileName && (
            <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
              {count} leads
            </span>
          )}
        </button>
      </div>

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
