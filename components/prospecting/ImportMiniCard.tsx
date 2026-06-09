"use client"

import { useRef, useState } from "react"

interface ImportSummary {
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
}

interface Props {
  leadsImportados?: number
  onConfirmImport: (file: File, forceTestReimport?: boolean) => Promise<ImportSummary | null>
  onConfirmTestReimport: () => Promise<boolean>
}

export function ImportMiniCard({ leadsImportados = 0, onConfirmImport, onConfirmTestReimport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forceLoading, setForceLoading] = useState(false)

  const blocked = Boolean(summary && summary.imported > 0 && summary.queued === 0)
  const firstReason = summary?.details?.find((detail) => !detail.queued)?.reason

  const handlePick = () => inputRef.current?.click()
  const setNextFile = (nextFile?: File) => {
    if (!nextFile) return
    setFile(nextFile)
    setSummary(null)
  }

  const importFile = async (forceTestReimport = false) => {
    if (!file) return
    if (forceTestReimport && !(await onConfirmTestReimport())) return
    if (forceTestReimport) setForceLoading(true)
    else setLoading(true)
    const result = await onConfirmImport(file, forceTestReimport)
    setSummary(result)
    setLoading(false)
    setForceLoading(false)
  }

  return (
    <section className="glass-card flex h-full flex-col rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">
          Importar leads
        </p>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
          {leadsImportados} na base
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="sr-only"
        onChange={(event) => setNextFile(event.target.files?.[0] || undefined)}
      />

      <button
        type="button"
        onClick={handlePick}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          setNextFile(event.dataTransfer.files?.[0] || undefined)
        }}
        className={`mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-secondary/40 hover:border-primary/50 hover:bg-secondary/70"
        }`}
      >
        <span className="metal-tile grid h-12 w-12 place-items-center rounded-2xl text-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </span>
        <span className="max-w-full truncate text-sm font-semibold text-foreground">
          {file?.name || "Arraste sua planilha ou clique"}
        </span>
        <span className="text-xs text-muted-foreground">
          Aceita arquivos .xlsx e .csv
        </span>
      </button>

      {summary && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["Lidos", summary.imported],
            ["Adicionados", summary.queued],
            ["Inválidos", summary.invalid],
            ["Duplicados", summary.duplicates + summary.alreadySent],
            ["Opt-out", summary.optOutIgnored],
            ["Clientes", summary.activeClientsBlocked],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-secondary/60 px-2 py-2">
              <p className="text-lg font-bold leading-none text-foreground">{value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${
          summary.queued > 0 ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-secondary/60 text-muted-foreground"
        }`}>
          {summary.queued > 0
            ? `${summary.queued} lead(s) validado(s) e prontos para a fila.`
            : "Nenhum lead novo entrou na fila. Revise a planilha ou os bloqueios."}
        </p>
      )}

      {firstReason && (
        <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          {summary?.details?.[0]?.name || "Lead"}: {firstReason}
        </p>
      )}

      {summary?.testReimports ? (
        <p className="mt-3 rounded-xl bg-[var(--success)]/10 px-3 py-2 text-xs font-medium text-[var(--success)]">
          {summary.testReimports} número autorizado reimportado para teste.
        </p>
      ) : null}

      <button
        onClick={() => void importFile(false)}
        disabled={!file || loading}
        className="btn-glossy mt-4 w-full rounded-xl py-2.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
      >
        {loading ? "Importando..." : "Confirmar importação"}
      </button>

      {blocked && (
        <button
          onClick={() => void importFile(true)}
          disabled={!file || forceLoading}
          className="mt-2 w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
        >
          {forceLoading ? "Reimportando..." : "Resetar teste autorizado"}
        </button>
      )}
    </section>
  )
}
