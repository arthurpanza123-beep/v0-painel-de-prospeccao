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
    <div className="grid place-items-center rounded-2xl bg-white p-3 shadow-[0_1px_0_0_oklch(1_0_0)_inset,0_10px_24px_-14px_oklch(0.45_0.05_255_/_0.4)]">
      {qrCode ? (
        <img
          src={qrCode}
          alt="QR Code WhatsApp"
          className={`${sizeClass} block object-contain`}
          draggable={false}
        />
      ) : (
        <div className={`${sizeClass} grid place-items-center rounded-xl border border-dashed border-border bg-secondary text-center text-xs text-muted-foreground`}>
          Gere um QR Code
        </div>
      )}
    </div>
  )
}

export function WhatsAppMiniCard({
  status,
  qrCode,
  qrAgeSeconds,
  instanceName = "centralplay-leads",
  connectedNumber,
  profileName,
  onRefreshQR,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const connected = status === "conectado"
  const connecting = status === "conectando"
  const qrMayBeStale = typeof qrAgeSeconds === "number" && qrAgeSeconds > 45
  const refreshLabel = qrMayBeStale ? "Gerar novo QR" : "Atualizar QR"

  return (
    <section className="glass-card flex h-full flex-col rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">
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
          {statusLabel[status]}
        </span>
      </div>

      {connected ? (
        <div className="mt-4 flex flex-1 items-center gap-4">
          <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full sm:h-28 sm:w-28">
            <span className="absolute inset-0 rounded-full bg-secondary shadow-inner" aria-hidden="true" />
            <span className="absolute inset-[18px] grid place-items-center rounded-full bg-[var(--success)] text-white shadow-lg" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.6.2-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s1 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
                <path d="M12 2a10 10 0 0 0-8.7 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.8.7.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
              </svg>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-foreground">{profileName || instanceName}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{connectedNumber || "Sessão ativa"}</p>
            <p className="mt-3 inline-flex rounded-full bg-[var(--success)]/10 px-3 py-1 text-xs font-medium text-[var(--success)]">
              Conexão estável
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <QrImage qrCode={qrCode} sizeClass="h-44 w-44" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {qrCode ? "Escaneie o QR Code" : "WhatsApp desconectado"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              WhatsApp → Aparelhos conectados → Conectar aparelho
            </p>
            <p className={`mt-1 text-[11px] ${qrMayBeStale ? "text-[var(--warning)]" : "text-muted-foreground"}`}>
              {formatAge(qrAgeSeconds)}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <button
              onClick={onRefreshQR}
              className="btn-glossy rounded-xl px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              {refreshLabel}
            </button>
            <button
              onClick={() => setExpanded(true)}
              disabled={!qrCode}
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
            >
              Ampliar
            </button>
          </div>
        </div>
      )}

      {expanded && !connected && qrCode && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="QR Code WhatsApp ampliado">
          <div className="w-full max-w-[430px] rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Conectar {instanceName}</p>
                <p className="text-xs text-muted-foreground">{statusLabel[status]}</p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Fechar
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <QrImage qrCode={qrCode} sizeClass="h-[340px] w-[340px] max-h-[calc(100vw-64px)] max-w-[calc(100vw-64px)]" />
              <p className="text-xs text-muted-foreground">{formatAge(qrAgeSeconds)}</p>
              <button
                onClick={onRefreshQR}
                className="btn-glossy w-full rounded-xl py-2 text-xs font-semibold text-primary-foreground"
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
