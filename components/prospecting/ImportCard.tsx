"use client"

import { useRef, useState } from "react"
import { mockImportSummary } from "@/lib/mock-data"

interface ImportCardProps {
  leadsImportados: number
}

export function ImportCard({ leadsImportados }: ImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const pick = () => inputRef.current?.click()

  const handleFile = (file?: File) => {
    if (!file) return
    setFileName(file.name)
  }

  return (
    <section className="glass-card flex h-full flex-col rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Importar leads
        </p>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
          {leadsImportados} na base
        </span>
      </div>

      {/* Zona de upload */}
      <button
        type="button"
        onClick={pick}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        className={`mt-3 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
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
        <span className="text-sm font-semibold text-foreground">
          {fileName ?? "Arraste sua planilha ou clique"}
        </span>
        <span className="text-xs text-muted-foreground">
          Aceita arquivos .xlsx e .csv
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
      />

      {/* Resumo da última importação */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Lidos", value: mockImportSummary.lidos },
          { label: "Adicionados", value: mockImportSummary.adicionados },
          { label: "Ignorados", value: mockImportSummary.ignorados },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-secondary/60 px-2 py-2 text-center">
            <p className="text-lg font-bold leading-none text-foreground">{item.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
