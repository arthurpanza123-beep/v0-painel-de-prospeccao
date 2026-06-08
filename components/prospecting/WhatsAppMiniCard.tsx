"use client"

import { useState } from "react"
import type { WhatsAppStatus } from "@/lib/mock-data"

interface Props {
  status: WhatsAppStatus
  qrCode?: string | null
  qrAgeSeconds?: number | null
  instanceName?: string
  connectedNumber?: string | null
  profileName?: string | null
  onRefreshQR: () => void
}

const statusLabel = {
  conectado: "Conectado",
  conectando: "Aguardando leitura",
  desconectado: "Desconectado",
} as const

const formatAge = (seconds?: number | null) => {
  if (seconds == null) return "QR ainda não gerado"
  if (seconds < 60) return `QR atualizado há ${seconds}s`
  return `QR atualizado há ${Math.floor(seconds / 60)}min`
}

function QrImage({ qrCode, sizeClass }: { qrCode?: string | null; sizeClass: string }) {
  return (
    <div className="grid place-items-center rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
      {qrCode ? (
        <img
          src={qrCode}
          alt="QR Code WhatsApp"
          className={`${sizeClass} block object-contain`}
          draggable={false}
        />
      ) : (
        <div className={`${sizeClass} grid grid-cols-8 gap-px bg-white p-2`} aria-hidden="true">
          {Array.from({ length: 64 }).map((_, i) => {
            const seed = (i * 7 + ((i % 5) * 13)) % 10
            return (
              <span
                key={i}
                className={seed > 4 ? "bg-black" : "bg-white"}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export function WhatsAppMiniCard({ status, qrCode, qrAgeSeconds, instanceName = "centralplay-leads", connectedNumber, profileName, onRefreshQR }: Props) {
  const [expanded, setExpanded] = useState(false)
  const connected = status === "conectado"
  const connecting = status === "conectando"
  const qrMayBeStale = typeof qrAgeSeconds === "number" && qrAgeSeconds > 45
  const refreshLabel = qrMayBeStale ? "Gerar novo QR" : "Atualizar QR Code"

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
          {statusLabel[status]}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {connected ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--success)]/15">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--success)]" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-foreground">{instanceName} conectada</p>
              <p className="text-[11px] text-muted-foreground">{profileName || connectedNumber || "Sessão ativa"}</p>
              {connectedNumber && <p className="text-[10px] text-muted-foreground">{connectedNumber}</p>}
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-2 text-center sm:flex-row sm:text-left">
            <QrImage qrCode={qrCode} sizeClass="h-[220px] w-[220px] lg:h-[180px] lg:w-[180px]" />
            <div className="min-w-0 space-y-1.5 sm:max-w-[160px]">
              <p className="text-[11px] leading-4 text-muted-foreground">
                Abra o WhatsApp no celular e escaneie este QR Code.
              </p>
              <p className="text-[10px] text-muted-foreground">{formatAge(qrAgeSeconds)}</p>
              <p className={`text-[10px] ${qrMayBeStale ? "text-chart-3" : "text-muted-foreground"}`}>
                {qrMayBeStale ? "QR pode estar expirado. Gere um novo." : connecting ? "Aguardando leitura" : "Gere ou atualize o QR se não escanear."}
              </p>
            </div>
          </div>
        )}
      </div>

      {!connected && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={onRefreshQR}
            className="rounded-md bg-secondary py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            {refreshLabel}
          </button>
          <button
            onClick={() => setExpanded(true)}
            className="rounded-md border border-border py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ampliar QR Code
          </button>
        </div>
      )}

      {expanded && !connected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="QR Code WhatsApp ampliado">
          <div className="w-full max-w-[430px] rounded-lg border border-border bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground">Conectar {instanceName}</p>
                <p className="text-[11px] text-muted-foreground">{statusLabel[status]}</p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Fechar
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <QrImage qrCode={qrCode} sizeClass="h-[340px] w-[340px] max-h-[calc(100vw-64px)] max-w-[calc(100vw-64px)]" />
              <p className="text-[12px] text-foreground">
                Abra o WhatsApp no celular e escaneie este QR Code.
              </p>
              <p className="text-[11px] text-muted-foreground">{formatAge(qrAgeSeconds)}</p>
              <button
                onClick={onRefreshQR}
                className="w-full rounded-md bg-primary py-2 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {refreshLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
