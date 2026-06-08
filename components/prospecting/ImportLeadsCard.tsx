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
    if (file) {
      setHasFile(true)
      setFileName(file.name)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setHasFile(true)
      setFileName(file.name)
    }
  }

  const handleRemove = () => {
    setHasFile(false)
    setFileName("")
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <h2 className="text-sm font-medium text-foreground">Importar leads</h2>
      </div>

      {/* Drag and drop area */}
      {!hasFile ? (
        <label
          className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/50"
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-sm font-medium text-foreground">
              Arraste seu Excel aqui ou{" "}
              <span className="text-primary">clique para selecionar</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Aceita .xlsx e .csv
            </span>
          </div>
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-[oklch(0.62_0.17_145/0.2)] bg-[oklch(0.62_0.17_145/0.06)] p-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-[oklch(0.62_0.17_145/0.15)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(0.62 0.17 145)" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <span className="text-xs font-medium text-foreground truncate">{fileName}</span>
            <span className="text-xs text-[oklch(0.62_0.17_145)]">Arquivo detectado — 142 leads encontrados</span>
          </div>
          <button
            onClick={handleRemove}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remover arquivo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Colunas detectadas */}
      {hasFile && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Colunas detectadas</span>
          <div className="flex flex-wrap gap-1.5">
            {mockColumns.map((col) => (
              <span
                key={col}
                className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border px-2 py-0.5 text-xs text-foreground"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="oklch(0.62 0.17 145)" strokeWidth="3" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {col}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Botão de confirmar */}
      <button
        onClick={onConfirmImport}
        disabled={!hasFile}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Confirmar importação
      </button>

      {/* Aviso */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        O envio só começa após revisar a fila e iniciar a campanha.
      </p>
    </div>
  )
}
