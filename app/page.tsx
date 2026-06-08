"use client"

import { useState } from "react"
import { ProspectingHeader } from "@/components/prospecting/ProspectingHeader"
import { StatCards } from "@/components/prospecting/StatCards"
import { WhatsAppConnectionCard } from "@/components/prospecting/WhatsAppConnectionCard"
import { ImportLeadsCard } from "@/components/prospecting/ImportLeadsCard"
import { SendingRateCard } from "@/components/prospecting/SendingRateCard"
import { MessageTemplatesCard } from "@/components/prospecting/MessageTemplatesCard"
import { LeadQueueCard } from "@/components/prospecting/LeadQueueCard"
import { CurrentSendingCard } from "@/components/prospecting/CurrentSendingCard"
import { SentHistoryCard } from "@/components/prospecting/SentHistoryCard"
import {
  mockLeads,
  mockTemplates,
  mockCampaignStats,
  mockSendingRate,
  mockCurrentSending,
  mockHistory,
  type Lead,
  type CampaignStatus,
  type WhatsAppStatus,
  type SendingRate,
} from "@/lib/mock-data"

export default function ProspectingPage() {
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>("desconectado")
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>("parada")
  const [leads, setLeads] = useState(mockLeads)
  const [stats] = useState(mockCampaignStats)
  const [sendingRate, setSendingRate] = useState(mockSendingRate)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const handleStartCampaign = () => setCampaignStatus("rodando")
  const handlePauseCampaign = () => setCampaignStatus("pausada")
  const handleResumeCampaign = () => setCampaignStatus("rodando")
  const handleCancelCampaign = () => setCampaignStatus("parada")
  const handleNewCampaign = () => setCampaignStatus("parada")

  const handleConfigureWhatsApp = () => {
    setWhatsappStatus("conectando")
    setTimeout(() => setWhatsappStatus("conectado"), 2500)
  }

  const handleRefreshQR = () => {}
  const handleDisconnect = () => setWhatsappStatus("desconectado")
  const handleSwapNumber = () => {}
  const handleConfirmImport = () => {}
  const handleSaveRate = (rate: SendingRate) => setSendingRate(rate)

  const handleViewMessage = (lead: Lead) => setSelectedLead(lead)
  const handleMarkDoNotSend = (lead: Lead) =>
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: "nao-quero" as const } : l))
    )
  const handleRemoveFromQueue = (lead: Lead) =>
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
  const handleExport = () => {}

  const isRunning = campaignStatus === "rodando"

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex h-11 items-center gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-primary-foreground"
                  aria-hidden="true"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <span className="text-xs font-bold tracking-wide text-foreground uppercase">
                Central Play Plus
              </span>
            </div>

            <div className="h-3.5 w-px bg-border hidden sm:block" aria-hidden="true" />

            {/* Nav */}
            <nav className="hidden items-center gap-0.5 sm:flex" aria-label="Navegação principal">
              {["Dashboard", "Prospecção", "Instâncias", "Templates", "Relatórios"].map((item) => (
                <button
                  key={item}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    item === "Prospecção"
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>

            {/* Status badge mobile */}
            <div className="ml-auto sm:hidden">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isRunning ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1 w-1 rounded-full ${
                    isRunning ? "bg-primary animate-pulse" : "bg-muted-foreground"
                  }`}
                />
                {isRunning ? "Rodando" : "Parado"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        <ProspectingHeader
          whatsappStatus={whatsappStatus}
          campaignStatus={campaignStatus}
          onStartCampaign={handleStartCampaign}
          onPauseCampaign={handlePauseCampaign}
          onResumeCampaign={handleResumeCampaign}
          onCancelCampaign={handleCancelCampaign}
          onConfigureWhatsApp={handleConfigureWhatsApp}
          onNewCampaign={handleNewCampaign}
        />

        <StatCards stats={stats} />

        {/* Agora enviando — só aparece quando rodando */}
        {isRunning && (
          <div className="mb-5">
            <CurrentSendingCard
              lead={mockCurrentSending.lead}
              template={mockTemplates[mockCurrentSending.templateIndex]}
              initialTimer={mockCurrentSending.timerRestante}
              isRunning={isRunning}
            />
          </div>
        )}

        {/* Grid: QR Code + Import + Ritmo */}
        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <WhatsAppConnectionCard
            status={whatsappStatus}
            onRefreshQR={handleRefreshQR}
            onDisconnect={handleDisconnect}
            onSwapNumber={handleSwapNumber}
          />
          <ImportLeadsCard onConfirmImport={handleConfirmImport} />
          <SendingRateCard initialRate={sendingRate} onSave={handleSaveRate} />
        </div>

        {/* Templates */}
        <div className="mb-5">
          <MessageTemplatesCard templates={mockTemplates} />
        </div>

        {/* Fila */}
        <div className="mb-5">
          <LeadQueueCard
            leads={leads}
            onViewMessage={handleViewMessage}
            onMarkDoNotSend={handleMarkDoNotSend}
            onRemoveFromQueue={handleRemoveFromQueue}
          />
        </div>

        {/* Histórico */}
        <div className="mb-8">
          <SentHistoryCard entries={mockHistory} onExport={handleExport} />
        </div>
      </main>

      {/* Modal ver mensagem */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar mensagem"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedLead(null) }}
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedLead.nome}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedLead.telefone}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Bolha WhatsApp dark */}
            <div className="rounded-lg bg-[oklch(0.19_0.013_243)] px-4 py-3 font-mono text-xs leading-6 text-muted-foreground max-h-64 overflow-y-auto">
              {mockTemplates[selectedLead.templateIndex]?.corpo
                .replace(/{{nome}}/g, selectedLead.nome)
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="mb-2.5 last:mb-0">
                    {para.split(/(\*[^*]+\*)/).map((part, j) =>
                      part.startsWith("*") && part.endsWith("*") ? (
                        <strong key={j} className="font-semibold text-foreground">{part.slice(1, -1)}</strong>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </p>
                ))}
            </div>

            <button
              onClick={() => setSelectedLead(null)}
              className="w-full rounded bg-secondary py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
