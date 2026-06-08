"use client"

import { useState } from "react"
import { MetricsBar } from "@/components/prospecting/MetricsBar"
import { WhatsAppMiniCard } from "@/components/prospecting/WhatsAppMiniCard"
import { ImportMiniCard } from "@/components/prospecting/ImportMiniCard"
import { RateMiniCard } from "@/components/prospecting/RateMiniCard"
import { MessagePreviewCard } from "@/components/prospecting/MessagePreviewCard"
import { QueueMiniCard } from "@/components/prospecting/QueueMiniCard"
import {
  mockLeads,
  mockTemplates,
  mockCampaignStats,
  mockSendingRate,
  type CampaignStatus,
  type WhatsAppStatus,
  type SendingRate,
} from "@/lib/mock-data"

type MobileTab = "whatsapp" | "importar" | "ritmo" | "mensagem" | "fila"

export default function ProspectingPage() {
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>("desconectado")
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>("parada")
  const [sendingRate, setSendingRate] = useState(mockSendingRate)
  const [mobileTab, setMobileTab] = useState<MobileTab>("whatsapp")

  const isRunning = campaignStatus === "rodando"
  const isPaused = campaignStatus === "pausada"

  const handleToggleCampaign = () =>
    setCampaignStatus(isRunning ? "pausada" : "rodando")
  const handlePause = () => setCampaignStatus("pausada")
  const handleConfigureWhatsApp = () => {
    setWhatsappStatus("conectando")
    setTimeout(() => setWhatsappStatus("conectado"), 2200)
  }
  const handleRefreshQR = () => {
    if (whatsappStatus === "desconectado") handleConfigureWhatsApp()
  }
  const handleConfirmImport = () => {}
  const handleSaveRate = (rate: SendingRate) => setSendingRate(rate)
  const handleEditVariations = () => {}
  const handleViewHistory = () => {}

  // Fila derivada
  const current = mockLeads.find((l) => l.status === "proximo") ?? mockLeads[1]
  const upNext = mockLeads.filter((l) => l.status === "aguardando")
  const lastSent = mockLeads.filter((l) => l.status === "enviado").at(-1) ?? null

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      {/* Header compacto */}
      <header className="shrink-0 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex h-12 max-w-screen-2xl items-center gap-2 sm:gap-3">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <div className="leading-none">
              <p className="text-[10px] font-bold uppercase tracking-wide text-foreground">
                Central Play Plus
              </p>
              <p className="text-[10px] text-muted-foreground">Prospecção</p>
            </div>
          </div>

          {/* Status WhatsApp */}
          <span
            className={`ml-1 hidden items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium sm:inline-flex ${
              whatsappStatus === "conectado"
                ? "bg-[var(--success)]/15 text-[var(--success)]"
                : whatsappStatus === "conectando"
                ? "bg-primary/15 text-primary"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                whatsappStatus === "conectado"
                  ? "bg-[var(--success)]"
                  : whatsappStatus === "conectando"
                  ? "bg-primary animate-pulse"
                  : "bg-destructive"
              }`}
            />
            {whatsappStatus === "conectado"
              ? "WhatsApp conectado"
              : whatsappStatus === "conectando"
              ? "Conectando..."
              : "WhatsApp desconectado"}
          </span>

          {/* Ações */}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={handleConfigureWhatsApp}
              className="hidden rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Configurar WhatsApp
            </button>
            {(isRunning || isPaused) && (
              <button
                onClick={handlePause}
                disabled={isPaused}
                className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                Pausar
              </button>
            )}
            <button
              onClick={handleToggleCampaign}
              className={`rounded-md px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                isRunning
                  ? "bg-secondary text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--primary)] shadow-primary/30 hover:bg-primary/90"
              }`}
            >
              {isRunning ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                  Em andamento
                </span>
              ) : isPaused ? (
                "Retomar"
              ) : (
                "Iniciar campanha"
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo — cabe na viewport */}
      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4">
        <MetricsBar stats={mockCampaignStats} />

        {/* DESKTOP: grid de blocos */}
        <div className="hidden flex-1 grid-rows-[minmax(0,0.78fr)_minmax(0,1fr)] gap-3 overflow-hidden lg:grid">
          <div className="grid grid-cols-3 gap-3 overflow-hidden">
            <WhatsAppMiniCard status={whatsappStatus} onRefreshQR={handleRefreshQR} />
            <ImportMiniCard onConfirmImport={handleConfirmImport} />
            <RateMiniCard initialRate={sendingRate} onSave={handleSaveRate} />
          </div>
          <div className="grid grid-cols-2 gap-3 overflow-hidden">
            <MessagePreviewCard templates={mockTemplates} onEdit={handleEditVariations} />
            <QueueMiniCard
              current={current}
              upNext={upNext}
              lastSent={lastSent}
              isRunning={isRunning}
              onViewHistory={handleViewHistory}
            />
          </div>
        </div>

        {/* MOBILE: abas */}
        <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
          <div className="flex-1 overflow-hidden">
            {mobileTab === "whatsapp" && (
              <WhatsAppMiniCard status={whatsappStatus} onRefreshQR={handleRefreshQR} />
            )}
            {mobileTab === "importar" && (
              <ImportMiniCard onConfirmImport={handleConfirmImport} />
            )}
            {mobileTab === "ritmo" && (
              <RateMiniCard initialRate={sendingRate} onSave={handleSaveRate} />
            )}
            {mobileTab === "mensagem" && (
              <MessagePreviewCard templates={mockTemplates} onEdit={handleEditVariations} />
            )}
            {mobileTab === "fila" && (
              <QueueMiniCard
                current={current}
                upNext={upNext}
                lastSent={lastSent}
                isRunning={isRunning}
                onViewHistory={handleViewHistory}
              />
            )}
          </div>

          {/* Abas inferiores */}
          <nav className="mt-3 grid shrink-0 grid-cols-5 gap-1 rounded-lg border border-border bg-card p-1">
            {[
              { id: "whatsapp" as const, label: "WhatsApp" },
              { id: "importar" as const, label: "Importar" },
              { id: "ritmo" as const, label: "Ritmo" },
              { id: "mensagem" as const, label: "Msg" },
              { id: "fila" as const, label: "Fila" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                aria-pressed={mobileTab === tab.id}
                className={`rounded-md py-2 text-[10px] font-medium transition-colors ${
                  mobileTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </main>
    </div>
  )
}
