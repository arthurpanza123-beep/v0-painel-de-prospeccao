"use client"

import type { CampaignStatus, WhatsAppStatus } from "@/lib/mock-data"

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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      {/* Título */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Prospecção WhatsApp
          </h1>
          {/* Status da conexão */}
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
              isConnected
                ? "bg-[oklch(0.60_0.18_148/0.10)] text-[oklch(0.60_0.18_148)] border-[oklch(0.60_0.18_148/0.18)]"
                : "bg-[oklch(0.56_0.22_24/0.10)] text-[oklch(0.56_0.22_24)] border-[oklch(0.56_0.22_24/0.18)]"
            }`}
          >
            <span
              className={`h-1 w-1 rounded-full ${
                isConnected ? "bg-[oklch(0.60_0.18_148)]" : "bg-[oklch(0.56_0.22_24)]"
              }`}
            />
            {isConnected ? "Conectado" : "Desconectado"}
          </span>
          {isRunning && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/18">
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              Rodando
            </span>
          )}
          {isPaused && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[oklch(0.72_0.17_56/0.10)] text-[oklch(0.72_0.17_56)] border border-[oklch(0.72_0.17_56/0.18)]">
              <span className="h-1 w-1 rounded-full bg-[oklch(0.72_0.17_56)]" />
              Pausada
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Envio humanizado e controlado para leads importados
        </p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onConfigureWhatsApp}
          className="inline-flex items-center gap-1.5 rounded border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted hover:border-border/80 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          WhatsApp
        </button>

        <button
          onClick={onNewCampaign}
          className="inline-flex items-center gap-1.5 rounded border border-border bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted hover:border-border/80 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova campanha
        </button>

        {campaignStatus === "parada" && (
          <button
            onClick={onStartCampaign}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M5 3l14 9-14 9V3z"/>
            </svg>
            Iniciar
          </button>
        )}

        {isRunning && (
          <>
            <button
              onClick={onPauseCampaign}
              className="inline-flex items-center gap-1.5 rounded bg-[oklch(0.72_0.17_56)] px-3 py-1.5 text-[11px] font-semibold text-[oklch(0.10_0_0)] hover:opacity-90 transition-opacity"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
              Pausar
            </button>
            <button
              onClick={onCancelCampaign}
              className="inline-flex items-center gap-1.5 rounded border border-destructive/30 px-2.5 py-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/8 transition-colors"
            >
              Cancelar
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={onResumeCampaign}
              className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3z"/>
              </svg>
              Retomar
            </button>
            <button
              onClick={onCancelCampaign}
              className="inline-flex items-center gap-1.5 rounded border border-destructive/30 px-2.5 py-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/8 transition-colors"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </header>
  )
}
