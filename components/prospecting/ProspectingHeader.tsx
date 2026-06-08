"use client"

import { useState } from "react"
import type { CampaignStatus, WhatsAppStatus } from "@/lib/mock-data"
import { mockCampaignStats } from "@/lib/mock-data"

interface ProspectingHeaderProps {
  whatsappStatus: WhatsAppStatus
  campaignStatus: CampaignStatus
  onStartCampaign: () => void
  onPauseCampaign: () => void
  onResumeCampaign: () => void
  onCancelCampaign: () => void
  onConfigureWhatsApp: () => void
  onNewCampaign: () => void
}

export function ProspectingHeader({
  whatsappStatus,
  campaignStatus,
  onStartCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onCancelCampaign,
  onConfigureWhatsApp,
  onNewCampaign,
}: ProspectingHeaderProps) {
  const isConnected = whatsappStatus === "conectado"
  const isRunning = campaignStatus === "rodando"
  const isPaused = campaignStatus === "pausada"

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
      {/* Título e subtítulo */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            Prospecção
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20.52 3.449C18.24 1.245 15.24 0 12 0C5.443 0 .101 5.34.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.714 1.444h.006c6.556 0 11.899-5.34 11.899-11.893 0-3.176-1.24-6.165-3.434-8.45z"
                fill="currentColor"
                opacity="0.6"
              />
            </svg>
            WhatsApp de prospecção
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isConnected
                ? "bg-[oklch(0.62_0.17_145/0.12)] text-[oklch(0.62_0.17_145)] border border-[oklch(0.62_0.17_145/0.2)]"
                : "bg-[oklch(0.58_0.22_25/0.12)] text-[oklch(0.58_0.22_25)] border border-[oklch(0.58_0.22_25/0.2)]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-[oklch(0.62_0.17_145)]" : "bg-[oklch(0.58_0.22_25)]"
              }`}
            />
            {isConnected ? "Conectado" : "Desconectado"}
          </span>
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Rodando
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground text-pretty">
          Envio controlado para leads com abordagem inicial humanizada
        </p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onConfigureWhatsApp}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Configurar WhatsApp
        </button>
        <button
          onClick={onNewCampaign}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          Nova campanha
        </button>

        {/* Botão principal de campanha */}
        {campaignStatus === "parada" && (
          <button
            onClick={onStartCampaign}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M5 3l14 9-14 9V3z"/>
            </svg>
            Iniciar campanha
          </button>
        )}
        {isRunning && (
          <>
            <button
              onClick={onPauseCampaign}
              className="inline-flex items-center gap-1.5 rounded-md bg-[oklch(0.72_0.16_55)] px-4 py-1.5 text-xs font-semibold text-[oklch(0.1_0_0)] hover:opacity-90 transition-opacity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
              Pausar campanha
            </button>
            <button
              onClick={onCancelCampaign}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              Cancelar
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button
              onClick={onResumeCampaign}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3z"/>
              </svg>
              Retomar
            </button>
            <button
              onClick={onCancelCampaign}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </header>
  )
}
