"use client"

import { useState } from "react"

interface ImportLeadsCardProps {
  onConfirmImport: () => void
}

const mockColumns = ["Nome", "Telefone 1", "Cidade", "E-mail"]

export function ImportLeadsCard({ onConfirmImport }: ImportLeadsCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [hasFile, setHasFile] = useState(false)
  const [fileName, setFileName] = useState("")

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) { setHasFile(true); setFileName(file.name) }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setHasFile(true); setFileName(file.name) }
  }

  const handleRemove = () => { setHasFile(false); setFileName("") }

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Importar leads</h2>
      </div>

      {/* Área de upload */}
      {!hasFile ? (
        <label
          className={`relative flex flex-col items-center justify-center gap-2.5 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-all ${
            isDragOver
              ? "border-primary/60 bg-primary/5"
              : "border-[oklch(1_0_0/10%)] hover:border-primary/30 hover:bg-[oklch(0.60_0.20_252/0.03)]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".xlsx,.csv"
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Selecionar arquivo Excel ou CSV"
          />
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary border border-border">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-xs font-medium text-foreground">
              Arraste o Excel ou{" "}
              <span className="text-primary">clique para selecionar</span>
            </span>
            <span className="text-[11px] text-muted-foreground">.xlsx e .csv aceitos</span>
          </div>
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-[oklch(0.60_0.18_148/0.18)] bg-[oklch(0.60_0.18_148/0.06)] px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[oklch(0.60_0.18_148/0.14)] shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="oklch(0.60 0.18 148)" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <span className="text-[11px] font-semibold text-foreground truncate">{fileName}</span>
            <span className="text-[11px] text-[oklch(0.60_0.18_148)]">142 leads encontrados</span>
          </div>
          <button onClick={handleRemove} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Remover arquivo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Colunas detectadas */}
      {hasFile && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Colunas detectadas</span>
          <div className="flex flex-wrap gap-1">
            {mockColumns.map((col) => (
              <span key={col} className="inline-flex items-center gap-1 rounded bg-secondary border border-border px-2 py-0.5 text-[11px] text-foreground">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="oklch(0.60 0.18 148)" strokeWidth="3" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {col}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onConfirmImport}
        disabled={!hasFile}
        className="inline-flex items-center justify-center gap-1.5 rounded bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Confirmar importação
      </button>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        O envio só começa após revisar a fila e iniciar a campanha.
      </p>
    </div>
  )
}
