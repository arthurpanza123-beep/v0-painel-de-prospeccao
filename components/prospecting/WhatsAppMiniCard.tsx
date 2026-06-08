"use client"

import type { WhatsAppStatus } from "@/lib/mock-data"

interface Props {
  status: WhatsAppStatus
  onRefreshQR: () => void
}

export function WhatsAppMiniCard({ status, onRefreshQR }: Props) {
  const connected = status === "conectado"
  const connecting = status === "conectando"

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          WhatsApp
        </h2>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            connected
              ? "bg-[var(--success)]/15 text-[var(--success)]"
              : connecting
              ? "bg-primary/15 text-primary"
              : "bg-destructive/15 text-destructive"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected
                ? "bg-[var(--success)]"
                : connecting
                ? "bg-primary animate-pulse"
                : "bg-destructive"
            }`}
          />
          {connected ? "Conectado" : connecting ? "Conectando" : "Desconectado"}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {connected ? (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--success)]/15">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--success)]" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-[11px] text-muted-foreground">Sessão ativa</p>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div
              className="relative grid shrink-0 place-items-center rounded-md border border-border bg-foreground/95 p-1.5"
              aria-label="QR Code do WhatsApp"
            >
              <div
                className="grid grid-cols-8 gap-px"
                style={{ width: 72, height: 72 }}
                aria-hidden="true"
              >
                {Array.from({ length: 64 }).map((_, i) => {
                  const seed = (i * 7 + ((i % 5) * 13)) % 10
                  return (
                    <span
                      key={i}
                      className={seed > 4 ? "bg-background" : "bg-transparent"}
                    />
                  )
                })}
              </div>
              {connecting && (
                <div className="absolute inset-0 grid place-items-center rounded-md bg-card/80">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            <p className="text-[11px] leading-4 text-muted-foreground">
              Abra o WhatsApp e escaneie o código para conectar a sessão.
            </p>
          </div>
        )}
      </div>

      {!connected && (
        <button
          onClick={onRefreshQR}
          className="mt-2 w-full rounded-md bg-secondary py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Atualizar QR Code
        </button>
      )}
    </section>
  )
}
