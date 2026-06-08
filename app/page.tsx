"use client"

import { useState } from "react"
import { MetricsBar } from "@/components/prospecting/MetricsBar"
import { OperationsCard } from "@/components/prospecting/OperationsCard"
import { WhatsAppCard } from "@/components/prospecting/WhatsAppCard"
import { QueueStepper } from "@/components/prospecting/QueueStepper"
import { ActionMenu, type MenuAction } from "@/components/prospecting/ActionMenu"
import { ConfirmModal } from "@/components/prospecting/ConfirmModal"
import {
  mockLeads,
  mockCampaignStats,
  mockSendingRate,
  type SimStatus,
  type WhatsAppStatus,
} from "@/lib/mock-data"

type ModalKind = null | "iniciar" | "pausar" | "retomar" | "cancelar" | "nova" | "resetar"

const PRIMARY_LABEL: Record<SimStatus, string> = {
  "sem-campanha": "Nova campanha",
  pronta: "Iniciar simulação",
  simulando: "Pausar simulação",
  pausada: "Retomar simulação",
  finalizada: "Nova campanha",
}

export default function ProspectingPage() {
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>("conectado")
  const [sim, setSim] = useState<SimStatus>("pronta")
  const [modal, setModal] = useState<ModalKind>(null)

  const isRunning = sim === "simulando"

  // ── Derivações de fila (mock) ────────────────────────────────────────────
  const current = mockLeads.find((l) => l.status === "proximo") ?? mockLeads[1]
  const upNext = mockLeads.filter((l) => l.status === "aguardando")
  const lastSent = mockLeads.filter((l) => l.status === "enviado").at(-1) ?? null

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  const handleTrocarNumero = () => {
    setWhatsappStatus("conectando")
    setTimeout(() => setWhatsappStatus("conectado"), 2200)
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
    actions.push({ label: "Configurar WhatsApp", onSelect: handleTrocarNumero })
    return actions
  })()

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
          onConfirm: () => setSim("pronta"),
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
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="mx-auto flex min-w-0 w-full max-w-5xl flex-1 flex-col overflow-hidden px-3 sm:px-5 lg:px-6">
        {/* ── TOPO ──────────────────────────────────────────────────────────── */}
        <header className="flex shrink-0 items-center gap-3 py-4 sm:py-5">
          {/* Logo + título */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl btn-glossy">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground" aria-hidden="true">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">Central Play Plus</h1>
              <p className="text-xs text-muted-foreground">Prospecção</p>
            </div>
          </div>

          {/* Status WhatsApp */}
          <span
            className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex ${
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
            {whatsappStatus === "conectado"
              ? "WhatsApp conectado"
              : whatsappStatus === "conectando"
              ? "Conectando..."
              : "WhatsApp desconectado"}
          </span>

          {/* Botão principal único + menu */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handlePrimary}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm ${
                isRunning
                  ? "bg-secondary text-foreground hover:bg-muted"
                  : "btn-glossy text-primary-foreground"
              }`}
            >
              {!isRunning && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              )}
              {PRIMARY_LABEL[sim]}
            </button>
            <ActionMenu actions={secondaryActions} />
          </div>
        </header>

        {/* ── CONTEÚDO ───────────────────────────────────────────────────────── */}
        <main className="flex flex-1 flex-col gap-3 overflow-y-auto pb-5 sm:gap-4">
          <MetricsBar stats={mockCampaignStats} />

          {/* Operações + WhatsApp */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <OperationsCard
                status={sim}
                rate={mockSendingRate}
                nextLead={current}
                timer={mockCampaignStats.proximoEnvio}
                onPrimary={handlePrimary}
              />
            </div>
            <WhatsAppCard status={whatsappStatus} onTrocarNumero={handleTrocarNumero} />
          </div>

          {/* Fila */}
          <QueueStepper
            upNext={upNext}
            lastSent={lastSent}
            totalNaFila={mockCampaignStats.naFila}
            isRunning={isRunning}
            onViewHistory={() => {}}
          />
        </main>
      </div>

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
