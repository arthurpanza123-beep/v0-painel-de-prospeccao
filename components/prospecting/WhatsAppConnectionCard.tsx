"use client"

import type { WhatsAppStatus } from "@/lib/mock-data"

interface WhatsAppConnectionCardProps {
  status: WhatsAppStatus
  onRefreshQR: () => void
  onDisconnect: () => void
  onSwapNumber: () => void
}

// QR Code mockado visual — padrão dark com azul
function QRCodeMock() {
  return (
    <svg
      width="152"
      height="152"
      viewBox="0 0 152 152"
      aria-label="QR Code de conexão"
      role="img"
      className="block"
    >
      <rect width="152" height="152" fill="oklch(0.16 0.013 243)" rx="6" />
      {/* Cantos */}
      <rect x="10" y="10" width="42" height="42" rx="3" fill="none" stroke="oklch(0.60 0.20 252)" strokeWidth="3.5" />
      <rect x="17" y="17" width="28" height="28" rx="1.5" fill="oklch(0.60 0.20 252)" />
      <rect x="100" y="10" width="42" height="42" rx="3" fill="none" stroke="oklch(0.60 0.20 252)" strokeWidth="3.5" />
      <rect x="107" y="17" width="28" height="28" rx="1.5" fill="oklch(0.60 0.20 252)" />
      <rect x="10" y="100" width="42" height="42" rx="3" fill="none" stroke="oklch(0.60 0.20 252)" strokeWidth="3.5" />
      <rect x="17" y="107" width="28" height="28" rx="1.5" fill="oklch(0.60 0.20 252)" />
      {/* Módulos de dados */}
      {[60,68,76,84].map(x => <rect key={`t${x}`} x={x} y="10" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,76,84].map(x => <rect key={`t2${x}`} x={x} y="18" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,68,84].map(x => <rect key={`t3${x}`} x={x} y="26" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,76].map(x => <rect key={`t4${x}`} x={x} y="34" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[10,18,26,34,60,68,76,84,92,100,116,132].map(x => <rect key={`m${x}`} x={x} y="60" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[10,26,34,42,60,76,92,108,124,132].map(x => <rect key={`m2${x}`} x={x} y="68" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[10,18,34,60,76,84,92,108].map(x => <rect key={`m3${x}`} x={x} y="76" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,68,76,92,100,116].map(x => <rect key={`m4${x}`} x={x} y="84" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,76,84,100,116,132].map(x => <rect key={`m5${x}`} x={x} y="92" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,68,84,100,108].map(x => <rect key={`m6${x}`} x={x} y="100" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,76,92,108,124].map(x => <rect key={`m7${x}`} x={x} y="108" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,68,84,100,116,132].map(x => <rect key={`m8${x}`} x={x} y="116" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,76,92,108,124,132].map(x => <rect key={`m9${x}`} x={x} y="124" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
      {[60,68,76,100,116].map(x => <rect key={`m10${x}`} x={x} y="132" width="5" height="5" rx="1" fill="oklch(0.60 0.20 252)" />)}
    </svg>
  )
}

export function WhatsAppConnectionCard({
  status,
  onRefreshQR,
  onDisconnect,
  onSwapNumber,
}: WhatsAppConnectionCardProps) {
  const isConnected = status === "conectado"
  const isConnecting = status === "conectando"

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
      {/* Header do card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20.52 3.449C18.24 1.245 15.24 0 12 0C5.443 0 .101 5.34.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.714 1.444h.006c6.556 0 11.899-5.34 11.899-11.893 0-3.176-1.24-6.165-3.434-8.45z"
              fill={isConnected ? "oklch(0.60 0.18 148)" : "currentColor"}
              className={isConnected ? "" : "text-muted-foreground"}
            />
          </svg>
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Conexão WhatsApp</h2>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
            isConnected
              ? "bg-[oklch(0.60_0.18_148/0.10)] text-[oklch(0.60_0.18_148)] border-[oklch(0.60_0.18_148/0.18)]"
              : isConnecting
              ? "bg-primary/10 text-primary border-primary/18"
              : "bg-destructive/10 text-destructive border-destructive/18"
          }`}
        >
          <span className={`h-1 w-1 rounded-full ${
            isConnected ? "bg-[oklch(0.60_0.18_148)]" : isConnecting ? "bg-primary animate-pulse" : "bg-destructive"
          }`} />
          {isConnected ? "Conectado" : isConnecting ? "Conectando..." : "Desconectado"}
        </span>
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center gap-3">
          {/* QR Code */}
          <div className="rounded-lg border border-border bg-[oklch(0.11_0.012_243)] p-3 flex items-center justify-center">
            {isConnecting ? (
              <div className="flex h-[152px] w-[152px] flex-col items-center justify-center gap-2">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-[11px] text-muted-foreground">Aguardando scan...</span>
              </div>
            ) : (
              <QRCodeMock />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-[200px]">
            Abra o WhatsApp no celular e escaneie o código para conectar o número de prospecção
          </p>
          <button
            onClick={onRefreshQR}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-border bg-secondary px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Atualizar QR Code
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Info do número conectado */}
          <div className="flex items-center gap-3 rounded-lg border border-[oklch(0.60_0.18_148/0.18)] bg-[oklch(0.60_0.18_148/0.06)] px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[oklch(0.60_0.18_148/0.15)] shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20.52 3.449C18.24 1.245 15.24 0 12 0C5.443 0 .101 5.34.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.714 1.444h.006c6.556 0 11.899-5.34 11.899-11.893 0-3.176-1.24-6.165-3.434-8.45z"
                  fill="oklch(0.60 0.18 148)"
                />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">centralplay-leads</span>
              <span className="text-[11px] text-muted-foreground font-mono">(11) 91234-5678</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Sincronizado há 2 minutos
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSwapNumber}
              className="flex-1 rounded border border-border bg-secondary px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              Trocar número
            </button>
            <button
              onClick={onDisconnect}
              className="flex-1 rounded border border-destructive/25 px-2 py-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/8 transition-colors"
            >
              Desconectar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
