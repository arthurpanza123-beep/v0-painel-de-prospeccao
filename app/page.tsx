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

  // Handlers — sem backend, apenas estado visual
  const handleStartCampaign = () => {
    console.log("[v0] Iniciar campanha")
    setCampaignStatus("rodando")
  }

  const handlePauseCampaign = () => {
    console.log("[v0] Pausar campanha")
    setCampaignStatus("pausada")
  }

  const handleResumeCampaign = () => {
    console.log("[v0] Retomar campanha")
    setCampaignStatus("rodando")
  }

  const handleCancelCampaign = () => {
    console.log("[v0] Cancelar campanha")
    setCampaignStatus("parada")
  }

  const handleConfigureWhatsApp = () => {
    console.log("[v0] Configurar WhatsApp")
    setWhatsappStatus("conectando")
    setTimeout(() => setWhatsappStatus("conectado"), 2500)
  }

  const handleNewCampaign = () => {
    console.log("[v0] Nova campanha")
    setCampaignStatus("parada")
  }

  const handleRefreshQR = () => {
    console.log("[v0] Atualizar QR Code")
  }

  const handleDisconnect = () => {
    console.log("[v0] Desconectar WhatsApp")
    setWhatsappStatus("desconectado")
  }

  const handleSwapNumber = () => {
    console.log("[v0] Trocar número")
  }

  const handleConfirmImport = () => {
    console.log("[v0] Confirmar importação de leads")
  }

  const handleSaveRate = (rate: SendingRate) => {
    console.log("[v0] Salvar ritmo", rate)
    setSendingRate(rate)
  }

  const handleViewMessage = (lead: Lead) => {
    console.log("[v0] Ver mensagem para", lead.nome)
    setSelectedLead(lead)
  }

  const handleMarkDoNotSend = (lead: Lead) => {
    console.log("[v0] Marcar não enviar", lead.nome)
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: "nao-quero" as const } : l))
    )
  }

  const handleRemoveFromQueue = (lead: Lead) => {
    console.log("[v0] Remover da fila", lead.nome)
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
  }

  const handleExport = () => {
    console.log("[v0] Exportar resultados")
  }

  const isRunning = campaignStatus === "rodando"

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar da marca */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-primary-foreground"
                  aria-hidden="true"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground">Central Play Plus</span>
            </div>
            <span className="text-border hidden sm:block">|</span>
            <nav
              className="hidden items-center gap-1 sm:flex"
              aria-label="Navegação principal"
            >
              {["Dashboard", "Prospecção", "Instâncias", "Templates", "Relatórios"].map(
                (item) => (
                  <button
                    key={item}
                    className={`rounded-md px-3 py-1 text-xs transition-colors ${
                      item === "Prospecção"
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </nav>
            {/* Status indicador mobile */}
            <div className="ml-auto flex items-center gap-2 sm:hidden">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  isRunning
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
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
      <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
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

        {/* Cards de estatísticas */}
        <StatCards stats={stats} />

        {/* Card "Agora enviando" — só aparece quando rodando */}
        {isRunning && (
          <div className="mb-6">
            <CurrentSendingCard
              lead={mockCurrentSending.lead}
              template={mockTemplates[mockCurrentSending.templateIndex]}
              initialTimer={mockCurrentSending.timerRestante}
              isRunning={isRunning}
            />
          </div>
        )}

        {/* Grid de 3 colunas: QR Code + Import + Configuração */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <WhatsAppConnectionCard
            status={whatsappStatus}
            onRefreshQR={handleRefreshQR}
            onDisconnect={handleDisconnect}
            onSwapNumber={handleSwapNumber}
          />
          <ImportLeadsCard onConfirmImport={handleConfirmImport} />
          <SendingRateCard initialRate={sendingRate} onSave={handleSaveRate} />
        </div>

        {/* Templates de mensagem */}
        <div className="mb-6">
          <MessageTemplatesCard templates={mockTemplates} />
        </div>

        {/* Fila de leads */}
        <div className="mb-6">
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

      {/* Modal de visualização de mensagem */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar mensagem"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLead(null)
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-semibold text-foreground">
                  Mensagem para {selectedLead.nome}
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedLead.telefone}
                </span>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
                aria-label="Fechar modal"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="rounded-lg border border-border bg-secondary p-4 font-mono text-xs text-muted-foreground leading-relaxed max-h-72 overflow-y-auto">
              {mockTemplates[selectedLead.templateIndex]?.corpo
                .replace(/{{nome}}/g, selectedLead.nome)
                .split("\n\n")
                .map((para, i) => (
                  <p key={i} className="leading-6 mb-3 last:mb-0">
                    {para.split(/(\*[^*]+\*)/).map((part, j) =>
                      part.startsWith("*") && part.endsWith("*") ? (
                        <strong key={j} className="font-semibold text-foreground">
                          {part.slice(1, -1)}
                        </strong>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </p>
                ))}
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              className="w-full rounded-md bg-secondary border border-border py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
