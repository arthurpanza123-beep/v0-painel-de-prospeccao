"use client"

import type { WhatsAppStatus } from "@/lib/mock-data"

interface WhatsAppConnectionCardProps {
  status: WhatsAppStatus
  onRefreshQR: () => void
  onDisconnect: () => void
  onSwapNumber: () => void
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
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20.52 3.449C18.24 1.245 15.24 0 12 0C5.443 0 .101 5.34.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.714 1.444h.006c6.556 0 11.899-5.34 11.899-11.893 0-3.176-1.24-6.165-3.434-8.45z"
              fill={isConnected ? "oklch(0.62 0.17 145)" : "currentColor"}
              className={isConnected ? "" : "text-muted-foreground"}
            />
          </svg>
          <h2 className="text-sm font-medium text-foreground">Conexão WhatsApp</h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
            isConnected
              ? "bg-[oklch(0.62_0.17_145/0.12)] text-[oklch(0.62_0.17_145)] border border-[oklch(0.62_0.17_145/0.2)]"
              : isConnecting
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected
                ? "bg-[oklch(0.62_0.17_145)]"
                : isConnecting
                ? "bg-primary animate-pulse"
                : "bg-destructive"
            }`}
          />
          {isConnected ? "Conectado" : isConnecting ? "Conectando..." : "Desconectado"}
        </span>
      </div>

      {!isConnected ? (
        /* Estado desconectado */
        <div className="flex flex-col items-center gap-4">
          {/* QR Code placeholder */}
          <div className="relative w-40 h-40 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
            {isConnecting ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Aguardando...</span>
              </div>
            ) : (
              /* QR Code mockado com padrão visual */
              <svg width="128" height="128" viewBox="0 0 128 128" aria-label="QR Code de exemplo">
                <rect width="128" height="128" fill="oklch(0.18 0.012 240)" rx="4"/>
                {/* Corner marks */}
                <rect x="8" y="8" width="36" height="36" rx="2" fill="none" stroke="oklch(0.62 0.18 250)" strokeWidth="3"/>
                <rect x="14" y="14" width="24" height="24" rx="1" fill="oklch(0.62 0.18 250)"/>
                <rect x="84" y="8" width="36" height="36" rx="2" fill="none" stroke="oklch(0.62 0.18 250)" strokeWidth="3"/>
                <rect x="90" y="14" width="24" height="24" rx="1" fill="oklch(0.62 0.18 250)"/>
                <rect x="8" y="84" width="36" height="36" rx="2" fill="none" stroke="oklch(0.62 0.18 250)" strokeWidth="3"/>
                <rect x="14" y="90" width="24" height="24" rx="1" fill="oklch(0.62 0.18 250)"/>
                {/* Data modules */}
                <rect x="52" y="8" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="60" y="8" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="68" y="8" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="52" y="16" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="68" y="16" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="52" y="24" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="60" y="24" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="8" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="16" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="24" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="36" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="52" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="60" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="68" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="76" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="84" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="100" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="116" y="52" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="8" y="60" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="24" y="60" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="36" y="60" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="44" y="60" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="60" y="60" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="76" y="60" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="92" y="60" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="108" y="60" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="116" y="60" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="8" y="68" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="16" y="68" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="36" y="68" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="52" y="68" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="68" y="68" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="76" y="68" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="84" y="68" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="100" y="68" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="52" y="76" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="68" y="76" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="84" y="76" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="108" y="76" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="52" y="84" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="60" y="84" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="76" y="84" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="92" y="84" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="100" y="84" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="116" y="84" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="52" y="100" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="68" y="100" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="84" y="100" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="100" y="100" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="52" y="108" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="60" y="108" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="76" y="108" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="116" y="108" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="52" y="116" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="68" y="116" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="92" y="116" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
                <rect x="108" y="116" width="4" height="4" fill="oklch(0.62 0.18 250)"/>
              </svg>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center text-pretty max-w-[180px]">
            Escaneie o QR Code para conectar o número de prospecção
          </p>
          <button
            onClick={onRefreshQR}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors w-full justify-center"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Atualizar QR Code
          </button>
        </div>
      ) : (
        /* Estado conectado */
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-md border border-[oklch(0.62_0.17_145/0.2)] bg-[oklch(0.62_0.17_145/0.06)] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[oklch(0.62_0.17_145/0.15)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20.52 3.449C18.24 1.245 15.24 0 12 0C5.443 0 .101 5.34.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.714 1.444h.006c6.556 0 11.899-5.34 11.899-11.893 0-3.176-1.24-6.165-3.434-8.45z"
                  fill="oklch(0.62 0.17 145)"
                />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">centralplay-leads</span>
              <span className="text-xs text-muted-foreground">(11) 91234-5678</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Última sincronização: há 2 minutos
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSwapNumber}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Trocar número
            </button>
            <button
              onClick={onDisconnect}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              Desconectar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
