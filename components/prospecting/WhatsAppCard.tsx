"use client"

import type { WhatsAppStatus } from "@/lib/mock-data"

interface WhatsAppCardProps {
  status: WhatsAppStatus
  numero?: string
  conta?: string
  onTrocarNumero: () => void
}

export function WhatsAppCard({
  status,
  numero = "+55 11 98888-8888",
  conta = "centralplay-leads",
  onTrocarNumero,
}: WhatsAppCardProps) {
  const connected = status === "conectado"
  const connecting = status === "conectando"

  return (
    <section className="glass-card flex h-full flex-col rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          WhatsApp
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            connected
              ? "bg-[var(--success)]/12 text-[var(--success)]"
              : connecting
              ? "bg-primary/12 text-primary"
              : "bg-destructive/12 text-destructive"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? "bg-[var(--success)]" : connecting ? "bg-primary animate-pulse" : "bg-destructive"
            }`}
          />
          {connected ? "Conectado" : connecting ? "Conectando" : "Desconectado"}
        </span>
      </div>

      {/* Desconectado → QR code para escanear */}
      {!connected && !connecting ? (
        <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-2xl bg-white p-3 shadow-[0_1px_0_0_oklch(1_0_0)_inset,0_10px_24px_-14px_oklch(0.45_0.05_255_/_0.4)]">
            <QrCode />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Escaneie o QR Code</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              WhatsApp → Aparelhos conectados → Conectar aparelho
            </p>
          </div>
          <button
            onClick={onTrocarNumero}
            className="btn-glossy inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-primary-foreground"
          >
            Gerar novo código
          </button>
        </div>
      ) : connecting ? (
        <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin text-primary" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground">Conectando ao WhatsApp...</p>
        </div>
      ) : (
      <div className="mt-3 flex flex-1 items-center gap-4">
        {/* Ícone WhatsApp 3D verde */}
        <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full sm:h-28 sm:w-28">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 180deg, oklch(0.92 0.01 255), oklch(0.8 0.02 255), oklch(0.96 0.005 255), oklch(0.84 0.02 255), oklch(0.92 0.01 255))",
              boxShadow: "0 8px 22px -10px oklch(0.45 0.05 255 / 0.35), 0 1px 0 0 oklch(1 0 0) inset",
            }}
            aria-hidden="true"
          />
          <span
            className="absolute inset-[9px] rounded-full"
            style={{ background: "linear-gradient(180deg, oklch(0.98 0.004 255), oklch(0.9 0.01 255))" }}
            aria-hidden="true"
          />
          <span
            className="absolute inset-[18px] grid place-items-center rounded-full text-white"
            style={{
              background: "linear-gradient(180deg, oklch(0.7 0.16 150), oklch(0.55 0.16 150))",
              boxShadow: "0 1px 0 0 oklch(1 0 0 / 0.5) inset, 0 -2px 6px oklch(0.3 0.1 150 / 0.35) inset, 0 6px 14px -6px oklch(0.55 0.16 150 / 0.6)",
            }}
            aria-hidden="true"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.6.2-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
              <path d="M12 2a10 10 0 0 0-8.7 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.8.7.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
            </svg>
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-foreground">{conta}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Conectado · {numero}</p>
          <button
            onClick={onTrocarNumero}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-[0_1px_0_0_oklch(1_0_0)_inset,0_1px_2px_oklch(0.45_0.05_255_/_0.08)] transition-colors hover:bg-secondary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            Trocar número
          </button>
        </div>
      </div>
      )}

      {/* Rodapé status — só quando conectado */}
      {connected && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[var(--success)]/8 px-4 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)]">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-xs font-medium text-foreground">
            Conexão estável e ativa
            <span className="ml-1.5 font-normal text-muted-foreground">Monitorando em tempo real</span>
          </p>
        </div>
      )}
    </section>
  )
}

function QrCode() {
  // QR ilustrativo determinístico (não é um código real)
  const cells = 21
  const pattern: boolean[] = []
  for (let i = 0; i < cells * cells; i++) {
    const r = Math.floor(i / cells)
    const c = i % cells
    // Cantos finder (3 quadrados)
    const inFinder =
      (r < 7 && c < 7) || (r < 7 && c > cells - 8) || (r > cells - 8 && c < 7)
    if (inFinder) {
      const lr = r % (cells - 7 < r ? cells : 7)
      const lc = c % (cells - 7 < c ? cells : 7)
      const rr = r > cells - 8 ? r - (cells - 7) : r
      const cc = c > cells - 8 ? c - (cells - 7) : c
      const ring = rr === 0 || rr === 6 || cc === 0 || cc === 6
      const core = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4
      pattern.push(ring || core)
      continue
    }
    // pseudo-aleatório estável
    pattern.push(((r * 7 + c * 13 + r * c) % 5) % 2 === 0)
  }

  return (
    <div
      className="grid h-32 w-32"
      style={{ gridTemplateColumns: `repeat(${cells}, 1fr)` }}
      role="img"
      aria-label="QR Code para conectar o WhatsApp"
    >
      {pattern.map((on, i) => (
        <span key={i} className={on ? "bg-foreground" : "bg-transparent"} />
      ))}
    </div>
  )
}
