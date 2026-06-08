"use client"

import { useState } from "react"
import { MetricsBar } from "@/components/prospecting/MetricsBar"
import { WhatsAppCard } from "@/components/prospecting/WhatsAppCard"
import { ImportCard } from "@/components/prospecting/ImportCard"
import { ControlCard } from "@/components/prospecting/ControlCard"
import { MessagePreviewCard } from "@/components/prospecting/MessagePreviewCard"
import { QueueMiniCard } from "@/components/prospecting/QueueMiniCard"
import { ActionMenu, type MenuAction } from "@/components/prospecting/ActionMenu"
import { ConfirmModal } from "@/components/prospecting/ConfirmModal"
import {
  mockLeads,
  mockTemplates,
  mockCampaignStats,
  mockSendingRate,
  mockImportSummary,
  type SimStatus,
  type WhatsAppStatus,
  type ImportSummary,
} from "@/lib/mock-data"

type ModalKind =
  | null
  | "iniciar"
  | "pausar"
  | "retomar"
  | "cancelar"
  | "nova"
  | "resetar"

const PRIMARY_LABEL: Record<SimStatus, string> = {
  "sem-campanha": "Nova campanha",
  pronta: "Iniciar simulação",
  simulando: "Pausar",
  pausada: "Retomar",
  finalizada: "Nova campanha",
}

export default function ProspectingPage() {
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>("conectado")
  const [sim, setSim] = useState<SimStatus>("pronta")
  const [rate] = useState(mockSendingRate)
  const [rateChanged] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(mockImportSummary)
  const [modal, setModal] = useState<ModalKind>(null)

  const isRunning = sim === "simulando"

  // ── Derivações de fila (mock) ────────────────────────────────────────────
  const current = mockLeads.find((l) => l.status === "proximo") ?? mockLeads[1]
  const upNext = mockLeads.filter((l) => l.status === "aguardando")
  const lastSent = mockLeads.filter((l) => l.status === "enviado").at(-1) ?? null
  const simuladosCount = mockCampaignStats.enviadosHoje

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const handleConfigureWhatsApp = () => {
    setWhatsappStatus("conectando")
    setTimeout(() => setWhatsappStatus("conectado"), 2200)
  }
  const handleRefreshQR = () => {
    if (whatsappStatus !== "conectando") handleConfigureWhatsApp()
  }

  // ── Botão principal (um por estado) ─────────────────────────────────────────
  const handlePrimary = () => {
    switch (sim) {
      case "sem-campanha":
      case "finalizada":
        setModal("nova")
        break
      case "pronta":
        setModal("iniciar")
        break
      case "simulando":
        setModal("pausar")
        break
      case "pausada":
        setModal("retomar")
        break
    }
  }

  // ── Ações secundárias (menu "...") ──────────────────────────────────────────
  const secondaryActions: MenuAction[] = (() => {
    const actions: MenuAction[] = []
    if (sim === "simulando" || sim === "pausada") {
      actions.push({ label: "Cancelar campanha", tone: "danger", onSelect: () => setModal("cancelar") })
    }
    if (sim === "finalizada") {
      actions.push({ label: "Resetar teste autorizado", onSelect: () => setModal("resetar") })
    }
    actions.push({ label: "Configurar WhatsApp", onSelect: handleConfigureWhatsApp })
    return actions
  })()

  const handleConfirmImport = (fileName: string) => {
    setImportSummary({ ...mockImportSummary, arquivo: fileName })
  }

  // ── Conteúdo dos modais ─────────────────────────────────────────────────────
  const modalProps = (() => {
    switch (modal) {
      case "iniciar":
        return {
          title: "Iniciar simulação?",
          description: "A campanha será processada em modo seguro. Nenhum WhatsApp real será enviado.",
          confirmLabel: "Iniciar simulação",
          tone: "primary" as const,
          onConfirm: () => setSim("simulando"),
        }
      case "pausar":
        return {
          title: "Pausar simulação?",
          description: "A fila será pausada. Você pode retomar de onde parou a qualquer momento.",
          confirmLabel: "Pausar",
          tone: "primary" as const,
          onConfirm: () => setSim("pausada"),
        }
      case "retomar":
        return {
          title: "Retomar simulação?",
          description: "A fila continuará a ser processada em modo seguro.",
          confirmLabel: "Retomar",
          tone: "primary" as const,
          onConfirm: () => setSim("simulando"),
        }
      case "cancelar":
        return {
          title: "Cancelar campanha?",
          description: "A simulação atual será encerrada e a fila zerada. Esta ação não pode ser desfeita.",
          confirmLabel: "Cancelar campanha",
          tone: "danger" as const,
          onConfirm: () => setSim("finalizada"),
        }
      case "nova":
        return {
          title: "Nova campanha?",
          description: "Os dados da campanha anterior serão limpos para você começar do zero.",
          confirmLabel: "Nova campanha",
          tone: "primary" as const,
          onConfirm: () => {
            setImportSummary(null)
            setSim("sem-campanha")
          },
        }
      case "resetar":
        return {
          title: "Resetar teste autorizado?",
          description: "Os contadores da simulação serão reiniciados. Nenhum dado real é afetado.",
          confirmLabel: "Resetar teste",
          tone: "primary" as const,
          onConfirm: () => setSim("pronta"),
        }
      default:
        return null
    }
  })()

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      {/* ── TOPO LIMPO ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-3 sm:px-5">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-foreground">Central Play Plus</p>
              <p className="text-[10px] text-muted-foreground">Prospecção</p>
            </div>
          </div>

          {/* Status WhatsApp */}
          <span
            className={`ml-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              whatsappStatus === "conectado"
                ? "bg-[var(--success)]/12 text-[var(--success)]"
                : whatsappStatus === "conectando"
                ? "bg-primary/12 text-primary"
                : "bg-destructive/12 text-destructive"
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
            <span className="hidden sm:inline">
              {whatsappStatus === "conectado"
                ? "WhatsApp conectado"
                : whatsappStatus === "conectando"
                ? "Conectando..."
                : "WhatsApp desconectado"}
            </span>
          </span>

          {/* Botão principal único + menu */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handlePrimary}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                isRunning
                  ? "bg-secondary text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {PRIMARY_LABEL[sim]}
            </button>
            <ActionMenu actions={secondaryActions} />
          </div>
        </div>
      </header>

      {/* ── CONTEÚDO ───────────────────────────────────────────────────────────── */}
      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 sm:gap-4 sm:overflow-hidden sm:px-5 sm:pb-5">
        <MetricsBar stats={mockCampaignStats} />

        {/* DESKTOP */}
        <div className="hidden flex-1 grid-rows-[minmax(0,0.82fr)_minmax(0,1fr)] gap-4 overflow-hidden lg:grid">
          <div className="grid grid-cols-3 gap-4 overflow-hidden">
            <WhatsAppCard
              status={whatsappStatus}
              onRefreshQR={handleRefreshQR}
              onConfigure={handleConfigureWhatsApp}
            />
            <ImportCard summary={importSummary} onConfirmImport={handleConfirmImport} />
            <ControlCard
              status={sim}
              rate={rate}
              rateChanged={rateChanged}
              nextLead={current}
              timer={mockCampaignStats.proximoEnvio}
              simuladosCount={simuladosCount}
              onSaveRate={() => {}}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 overflow-hidden">
            <MessagePreviewCard templates={mockTemplates} onEdit={() => {}} />
            <QueueMiniCard
              current={current}
              upNext={upNext}
              lastSent={lastSent}
              isRunning={isRunning}
              onViewHistory={() => {}}
            />
          </div>
        </div>

        {/* MOBILE — ordem do prompt */}
        <div className="flex flex-col gap-3 lg:hidden">
          <ControlCard
            status={sim}
            rate={rate}
            rateChanged={rateChanged}
            nextLead={current}
            timer={mockCampaignStats.proximoEnvio}
            simuladosCount={simuladosCount}
            onSaveRate={() => {}}
          />
          <WhatsAppCard
            status={whatsappStatus}
            onRefreshQR={handleRefreshQR}
            onConfigure={handleConfigureWhatsApp}
          />
          <ImportCard summary={importSummary} onConfirmImport={handleConfirmImport} />
          <MessagePreviewCard templates={mockTemplates} onEdit={() => {}} />
          <QueueMiniCard
            current={current}
            upNext={upNext}
            lastSent={lastSent}
            isRunning={isRunning}
            onViewHistory={() => {}}
          />
        </div>
      </main>

      {/* ── MODAIS ─────────────────────────────────────────────────────────────── */}
      {modalProps && (
        <ConfirmModal
          open={modal !== null}
          title={modalProps.title}
          description={modalProps.description}
          confirmLabel={modalProps.confirmLabel}
          tone={modalProps.tone}
          onConfirm={modalProps.onConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
