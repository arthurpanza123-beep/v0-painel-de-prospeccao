"use client"

import { useRef, useState } from "react"
import type { ImportSummary } from "@/lib/mock-data"

interface ImportCardProps {
  summary: ImportSummary | null
  onConfirmImport: (fileName: string) => void
}

export function ImportCard({ summary, onConfirmImport }: ImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<string | null>(null)

  const confirmed = summary !== null

  const handlePick = () => inputRef.current?.click()
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setPendingFile(f.name)
  }

  return (
    <section className="flex h-full flex-col rounded-xl bg-card p-4">
      <h2 className="mb-3 text-xs font-semibold text-muted-foreground">Leads</h2>

      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleChange} className="hidden" />

      {confirmed ? (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 rounded-lg bg-[oklch(0.16_0.011_243)] px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--success)]/15">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--success)]" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{summary.arquivo}</p>
              <p className="text-[10px] text-muted-foreground">Importação confirmada</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { l: "Lidos", v: summary.lidos, t: "text-foreground" },
              { l: "Na fila", v: summary.adicionados, t: "text-primary" },
              { l: "Ignorados", v: summary.ignorados, t: "text-muted-foreground" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg bg-[oklch(0.16_0.011_243)] py-2">
                <p className={`text-lg font-bold tabular-nums ${s.t}`}>{s.v}</p>
                <p className="text-[10px] text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handlePick}
            className="mt-auto pt-3 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Importar outra planilha
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          {pendingFile ? (
            <>
              <p className="max-w-full truncate text-xs font-medium text-foreground">{pendingFile}</p>
              <p className="text-[11px] text-muted-foreground">Pronto para confirmar</p>
              <button
                onClick={() => {
                  onConfirmImport(pendingFile)
                  setPendingFile(null)
                }}
                className="mt-1 rounded-md bg-primary px-4 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Confirmar importação
              </button>
            </>
          ) : (
            <button
              onClick={handlePick}
              className="flex w-full flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 transition-colors hover:border-primary/50"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted-foreground" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-xs font-medium text-foreground">Importe sua planilha</span>
              <span className="text-[10px] text-muted-foreground">.xlsx, .xls ou .csv</span>
            </button>
          )}
        </div>
      )}
    </section>
  )
}
