"use client"

import { useRef, useState } from "react"

interface Props {
  onConfirmImport: (file: File, forceTestReimport?: boolean) => Promise<{
    imported: number
    valid: number
    queued: number
    duplicates: number
    invalid: number
    optOutIgnored: number
    alreadySent: number
    activeClientsBlocked: number
    errors: number
    testReimports: number
    details?: Array<{ name: string; phoneE164: string; reason: string; queued: boolean }>
  } | null>
}

export function ImportMiniCard({ onConfirmImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState<Awaited<ReturnType<Props["onConfirmImport"]>>>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forceLoading, setForceLoading] = useState(false)

  const blocked = Boolean(summary && summary.imported > 0 && summary.queued === 0)
  const firstReason = summary?.details?.find((detail) => !detail.queued)?.reason

  const handlePick = () => inputRef.current?.click()
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setSummary(null)
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
              {file?.name ?? "Selecionar planilha Excel"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {file ? "Toque para trocar" : ".xlsx, .xls ou .csv"}
            </span>
          </span>
          {summary && (
            <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
              {summary.queued} fila
            </span>
          )}
        </button>
        {summary && (
          <div className="space-y-1 text-[10px]">
            <div className="grid grid-cols-3 gap-1 text-center">
              <span className="rounded bg-secondary px-1 py-1 text-foreground">{summary.imported} lidos</span>
              <span className="rounded bg-secondary px-1 py-1 text-foreground">{summary.valid} validos</span>
              <span className="rounded bg-secondary px-1 py-1 text-[var(--success)]">{summary.queued} fila</span>
              <span className="rounded bg-secondary px-1 py-1 text-muted-foreground">{summary.duplicates} dup.</span>
              <span className="rounded bg-secondary px-1 py-1 text-destructive">{summary.invalid} inval.</span>
              <span className="rounded bg-secondary px-1 py-1 text-[var(--warning)]">{summary.optOutIgnored} opt-out</span>
              <span className="rounded bg-secondary px-1 py-1 text-muted-foreground">{summary.alreadySent} ja enviados</span>
              <span className="rounded bg-secondary px-1 py-1 text-muted-foreground">{summary.activeClientsBlocked} clientes</span>
              <span className="rounded bg-secondary px-1 py-1 text-destructive">{summary.errors} erros</span>
            </div>
            {firstReason && (
              <p className="rounded border border-border bg-[oklch(0.16_0.011_243)] px-2 py-1 text-muted-foreground">
                {summary.details?.[0]?.name || "Lead"}: {firstReason}
              </p>
            )}
            {summary.testReimports > 0 && (
              <p className="rounded bg-[var(--success)]/15 px-2 py-1 text-[var(--success)]">
                {summary.testReimports} reimportado como teste autorizado.
              </p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={async () => {
          if (!file) return
          setLoading(true)
          const result = await onConfirmImport(file)
          setSummary(result)
          setConfirmed(true)
          setLoading(false)
        }}
        disabled={!file || loading}
        className={`mt-2 w-full rounded-md py-1.5 text-[11px] font-medium transition-colors ${
          confirmed
            ? "bg-[var(--success)]/15 text-[var(--success)]"
            : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        }`}
      >
        {loading ? "Importando..." : confirmed ? "Importação confirmada" : "Confirmar importação"}
      </button>
      {blocked && (
        <button
          onClick={async () => {
            if (!file) return
            setForceLoading(true)
            const result = await onConfirmImport(file, true)
            setSummary(result)
            setConfirmed(true)
            setForceLoading(false)
          }}
          disabled={!file || forceLoading}
          className="mt-1 w-full rounded-md border border-border py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          {forceLoading ? "Reimportando..." : "Reimportar teste autorizado"}
        </button>
      )}
    </section>
  )
}
