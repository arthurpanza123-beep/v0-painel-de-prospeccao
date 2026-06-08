"use client"

import type { WhatsAppStatus } from "@/lib/mock-data"

interface WhatsAppCardProps {
  status: WhatsAppStatus
  numero?: string
  onRefreshQR: () => void
  onConfigure: () => void
}

export function WhatsAppCard({
  status,
  numero = "+55 11 98888-8888",
  onRefreshQR,
  onConfigure,
}: WhatsAppCardProps) {
  const connected = status === "conectado"
  const connecting = status === "conectando"

  return (
    <section className="flex h-full flex-col rounded-xl bg-card p-4">
      <h2 className="mb-3 text-xs font-semibold text-muted-foreground">WhatsApp</h2>

      {connected ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success)]/15">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--success)]" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="mt-2.5 text-sm font-semibold text-foreground">centralplay-leads</p>
          <p className="text-xs text-muted-foreground">conectada · {numero}</p>
          <button
            onClick={onConfigure}
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Trocar número
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="relative grid place-items-center rounded-lg bg-foreground/95 p-2.5">
            <div className="grid grid-cols-10 gap-px" style={{ width: 116, height: 116 }} aria-label="QR Code do WhatsApp">
              {Array.from({ length: 100 }).map((_, i) => {
                const seed = (i * 7 + (i % 6) * 13 + Math.floor(i / 10) * 5) % 10
                return <span key={i} className={seed > 4 ? "bg-background" : "bg-transparent"} />
              })}
            </div>
            {connecting && (
              <div className="absolute inset-0 grid place-items-center rounded-lg bg-card/80">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            {connecting ? "Conectando sessão..." : "Escaneie o código com o WhatsApp"}
          </p>
          <button
            onClick={onRefreshQR}
            disabled={connecting}
            className="rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            Atualizar QR Code
          </button>
        </div>
      )}
    </section>
  )
}
