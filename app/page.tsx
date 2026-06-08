"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { MetricsBar } from "@/components/prospecting/MetricsBar"
import { WhatsAppMiniCard } from "@/components/prospecting/WhatsAppMiniCard"
import { ImportMiniCard } from "@/components/prospecting/ImportMiniCard"
import { RateMiniCard } from "@/components/prospecting/RateMiniCard"
import { MessagePreviewCard } from "@/components/prospecting/MessagePreviewCard"
import { QueueMiniCard } from "@/components/prospecting/QueueMiniCard"
import {
  mockTemplates,
  mockSendingRate,
  type WhatsAppStatus,
  type SendingRate,
  type Lead,
  type MessageTemplate,
} from "@/lib/mock-data"

type MobileTab = "whatsapp" | "importar" | "ritmo" | "mensagem" | "fila"
type OperationalStatus = "no_campaign" | "draft" | "ready" | "running_dry_run" | "paused" | "waiting_for_leads" | "completed" | "cancelled" | "error"

type ConfirmDialog = {
  title: string
  text: string
  cancelLabel: string
  confirmLabel: string
  tone?: "primary" | "danger"
  resolve: (confirmed: boolean) => void
}

type ApiStatus = {
  stats?: {
    leadsImportados: number
    naFila: number
    enviadosHoje: number
    responderam: number
    optOut: number
    proximoEnvio: number | null
  }
  campaign_status?: OperationalStatus
  next_send_at?: string | null
  next_send_in_seconds?: number | null
  next_send_display?: string
  current_time_server?: string
  queue_count?: number
  is_paused?: boolean
  is_dry_run?: boolean
  real_sending_allowed?: boolean
  whatsapp?: {
    status?: string
    state?: string
    connectionStatus?: string | null
    instance?: string
    number?: string | null
    profileName?: string | null
  }
  activeCampaign?: { id: string; name?: string; status: string } | null
  queue?: {
    current: ApiLead | null
    upcoming: ApiLead[]
    lastSent: ApiLead | null
  }
  flags?: {
    dryRun: boolean
    enabled: boolean
    realSendingAllowed: boolean
  }
}

type ApiLead = {
  id: string
  name: string
  phone_e164: string
  email?: string | null
  city?: string | null
  uf?: string | null
  status: string
  template_id?: number | null
  scheduled_at?: string | null
  sent_at?: string | null
  created_at?: string | null
}

const formatCountdown = (seconds?: number | null) => {
  if (seconds == null) return "--:--"
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

const formatHumanCountdown = (seconds?: number | null) => {
  if (seconds == null) return "Calculando..."
  if (seconds <= 0) return "Aguardando worker..."
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes > 0 ? `${minutes}min ${String(rest).padStart(2, "0")}s` : `${rest}s`
}

const mapLead = (lead: ApiLead | null, fallbackStatus: Lead["status"]): Lead | null => {
  if (!lead) return null
  return {
    id: lead.id,
    nome: lead.name || "Sem nome",
    telefone: lead.phone_e164,
    email: lead.email || "",
    cidade: lead.city || "",
    uf: lead.uf || "",
    status: fallbackStatus,
    templateIndex: Math.max(0, (lead.template_id || 1) - 1),
    proximoEnvio: lead.scheduled_at ? new Date(lead.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : undefined,
    enviadoEm: lead.sent_at ? new Date(lead.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : undefined,
  }
}

export default function ProspectingPage() {
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>("desconectado")
  const [campaignStatus, setCampaignStatus] = useState<OperationalStatus>("no_campaign")
  const [sendingRate, setSendingRate] = useState(mockSendingRate)
  const [mobileTab, setMobileTab] = useState<MobileTab>("whatsapp")
  const [stats, setStats] = useState({ leadsImportados: 0, naFila: 0, enviadosHoje: 0, responderam: 0, optOut: 0, proximoEnvio: "--:--" })
  const [templates, setTemplates] = useState<MessageTemplate[]>(mockTemplates)
  const [queue, setQueue] = useState<{ current: Lead | null; upNext: Lead[]; lastSent: Lead | null }>({ current: null, upNext: [], lastSent: null })
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [activeCampaignName, setActiveCampaignName] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrUpdatedAt, setQrUpdatedAt] = useState<string | null>(null)
  const [qrRequestState, setQrRequestState] = useState<"idle" | "loading" | "done">("idle")
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [whatsappMeta, setWhatsappMeta] = useState<{ instance?: string; number?: string | null; profileName?: string | null }>({})
  const [safetyFlags, setSafetyFlags] = useState({ dryRun: true, enabled: false, realSendingAllowed: false })
  const [runtime, setRuntime] = useState({
    nextSendAt: null as string | null,
    serverNowMs: Date.now(),
    receivedAtMs: Date.now(),
    nextSendDisplay: "Sem campanha",
    queueCount: 0,
    isDryRun: true,
    realSendingAllowed: false,
  })
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null)

  const isRunning = campaignStatus === "running_dry_run"
  const isPaused = campaignStatus === "paused"
  const hasLeadsQueued = stats.naFila > 0
  const campaignLabel = campaignStatus === "no_campaign"
    ? "Sem campanha"
    : campaignStatus === "ready"
    ? "Pronta"
    : campaignStatus === "running_dry_run"
    ? "Simulação ativa"
    : campaignStatus === "paused"
    ? "Pausada"
    : campaignStatus === "waiting_for_leads"
    ? "Fila vazia"
    : campaignStatus === "completed"
    ? "Finalizada"
    : campaignStatus === "cancelled"
    ? "Cancelada"
    : "Rascunho"
  const queueEmptyLabel = campaignStatus === "paused" ? "Campanha pausada" : campaignStatus === "waiting_for_leads" ? "Nenhum lead na fila" : campaignStatus === "ready" ? "Aguardando início" : "Fila vazia"
  const nextLeadName = queue.current?.nome || queue.upNext[0]?.nome || ""
  const localServerNowMs = runtime.serverNowMs + (nowMs - runtime.receivedAtMs)
  const nextSendSeconds = runtime.nextSendAt && isRunning
    ? Math.max(0, Math.ceil((new Date(runtime.nextSendAt).getTime() - localServerNowMs) / 1000))
    : null
  const nextSendHeadline = isRunning
    ? queue.current
      ? "Processando..."
      : nextSendSeconds == null
      ? "Calculando..."
      : nextSendSeconds === 0
      ? "Aguardando worker..."
      : formatCountdown(nextSendSeconds)
    : runtime.nextSendDisplay
  const nextSendDetail = isRunning && nextLeadName
    ? `${nextLeadName} · simulação`
    : isPaused && nextLeadName
    ? `${nextLeadName} · próximo ao retomar`
    : campaignStatus === "ready" && nextLeadName
    ? `${nextLeadName} · pronta para simulação`
    : runtime.isDryRun
    ? "Modo seguro"
    : "Envio real"
  const nextSendQueueLabel = isRunning ? formatHumanCountdown(nextSendSeconds) : runtime.nextSendDisplay

  const askConfirmation = useCallback((config: Omit<ConfirmDialog, "resolve">) => (
    new Promise<boolean>((resolve) => {
      setConfirmDialog({ ...config, resolve })
    })
  ), [])

  const closeConfirmation = (confirmed: boolean) => {
    const dialog = confirmDialog
    setConfirmDialog(null)
    dialog?.resolve(confirmed)
  }

  const refresh = useCallback(async () => {
    const [statusRes, templatesRes] = await Promise.all([
      fetch("/api/prospection/status", { cache: "no-store" }).then((r) => r.json() as Promise<ApiStatus>),
      fetch("/api/prospection/templates", { cache: "no-store" }).then((r) => r.json()),
    ])
    setStats({
      leadsImportados: statusRes.stats?.leadsImportados || 0,
      naFila: statusRes.stats?.naFila || 0,
      enviadosHoje: statusRes.stats?.enviadosHoje || 0,
      responderam: statusRes.stats?.responderam || 0,
      optOut: statusRes.stats?.optOut || 0,
      proximoEnvio: statusRes.next_send_display || formatCountdown(statusRes.stats?.proximoEnvio),
    })
    const rawWhatsappStatus = String(statusRes.whatsapp?.status || "")
    const rawWhatsappState = String(statusRes.whatsapp?.state || statusRes.whatsapp?.connectionStatus || "")
    const nextWhatsappStatus =
      rawWhatsappStatus === "connected"
        ? "conectado"
        : rawWhatsappState === "connecting" || rawWhatsappStatus === "connecting"
        ? "conectando"
        : "desconectado"
    setWhatsappStatus(nextWhatsappStatus)
    setWhatsappMeta({
      instance: statusRes.whatsapp?.instance || "centralplay-leads",
      number: statusRes.whatsapp?.number || null,
      profileName: statusRes.whatsapp?.profileName || null,
    })
    if (nextWhatsappStatus === "conectado") {
      setQrCode(null)
      setQrUpdatedAt(null)
    }
    setActiveCampaignId(statusRes.activeCampaign?.id || null)
    setActiveCampaignName(statusRes.activeCampaign?.name || null)
    setCampaignStatus(statusRes.campaign_status || "no_campaign")
    setSafetyFlags(statusRes.flags || { dryRun: true, enabled: false, realSendingAllowed: false })
    setRuntime({
      nextSendAt: statusRes.next_send_at || null,
      serverNowMs: statusRes.current_time_server ? new Date(statusRes.current_time_server).getTime() : Date.now(),
      receivedAtMs: Date.now(),
      nextSendDisplay: statusRes.next_send_display || "Sem campanha",
      queueCount: statusRes.queue_count || 0,
      isDryRun: statusRes.is_dry_run ?? true,
      realSendingAllowed: statusRes.real_sending_allowed ?? false,
    })
    setQueue({
      current: mapLead(statusRes.queue?.current || null, "enviando"),
      upNext: (statusRes.queue?.upcoming || []).map((lead) => mapLead(lead, "aguardando")).filter(Boolean) as Lead[],
      lastSent: mapLead(statusRes.queue?.lastSent || null, "enviado"),
    })
    setTemplates((templatesRes.templates || []).map((template: { id: number; name: string; body: string }) => ({
      id: template.id,
      titulo: template.name,
      corpo: template.body,
    })))
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), whatsappStatus === "conectado" ? 10000 : 5000)
    return () => clearInterval(timer)
  }, [refresh, whatsappStatus])

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const qrAgeSeconds = qrUpdatedAt ? Math.max(0, Math.floor((nowMs - new Date(qrUpdatedAt).getTime()) / 1000)) : null

  const ensureCampaign = async () => {
    if (activeCampaignId && !["completed", "cancelled", "no_campaign"].includes(campaignStatus)) return activeCampaignId
    const response = await fetch("/api/prospection/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `Campanha ${new Date().toLocaleString("pt-BR")}` }) })
    const payload = await response.json()
    const id = payload.campaign?.id
    setActiveCampaignId(id)
    setActiveCampaignName(payload.campaign?.name || null)
    setCampaignStatus("draft")
    return id
  }

  const handleNewCampaign = async () => {
    if (!(await askConfirmation({
      title: "Criar nova campanha limpa?",
      text: "Isso não apaga histórico antigo, apenas inicia uma nova campanha separada.",
      cancelLabel: "Voltar",
      confirmLabel: "Criar nova",
    }))) return
    const response = await fetch("/api/prospection/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `Campanha ${new Date().toLocaleString("pt-BR")}` }) })
    const payload = await response.json()
    setActiveCampaignId(payload.campaign?.id || null)
    setActiveCampaignName(payload.campaign?.name || null)
    setCampaignStatus("draft")
    await refresh()
  }

  const handleStart = async () => {
    if (!(await askConfirmation({
      title: "Iniciar simulação?",
      text: "A campanha vai processar a fila em modo seguro. Nenhum WhatsApp real será enviado enquanto o envio real estiver bloqueado.",
      cancelLabel: "Cancelar",
      confirmLabel: "Iniciar simulação",
    }))) return
    const id = await ensureCampaign()
    if (!id) return
    await fetch(`/api/prospection/campaigns/${id}/start`, { method: "POST" })
    await refresh()
  }
  const handlePause = async () => {
    if (!activeCampaignId) return
    if (!(await askConfirmation({
      title: "Pausar campanha?",
      text: "Os envios serão interrompidos até você retomar.",
      cancelLabel: "Cancelar",
      confirmLabel: "Pausar",
    }))) return
    await fetch(`/api/prospection/campaigns/${activeCampaignId}/pause`, { method: "POST" })
    await refresh()
  }
  const handleResume = async () => {
    if (!activeCampaignId) return
    if (!(await askConfirmation({
      title: "Retomar campanha?",
      text: "A fila continuará a partir do próximo lead disponível.",
      cancelLabel: "Cancelar",
      confirmLabel: "Retomar",
    }))) return
    await fetch(`/api/prospection/campaigns/${activeCampaignId}/resume`, { method: "POST" })
    await refresh()
  }
  const handleCancel = async () => {
    if (!activeCampaignId) return
    if (!(await askConfirmation({
      title: "Cancelar campanha?",
      text: "A campanha será encerrada. Leads já processados continuarão no histórico.",
      cancelLabel: "Voltar",
      confirmLabel: "Cancelar campanha",
      tone: "danger",
    }))) return
    await fetch(`/api/prospection/campaigns/${activeCampaignId}/cancel`, { method: "POST" })
    await refresh()
  }
  const handleImportLeadsAction = () => {
    setMobileTab("importar")
  }
  const confirmTestReimport = useCallback(() => askConfirmation({
    title: "Reimportar número de operador?",
    text: "Use isso apenas para testar com número autorizado. Essa ação não deve ser usada para leads comuns.",
    cancelLabel: "Cancelar",
    confirmLabel: "Reimportar teste",
  }), [askConfirmation])
  const handleConfigureWhatsApp = useCallback(async () => {
    setQrRequestState("loading")
    setWhatsappStatus("conectando")
    try {
      const response = await fetch("/api/prospection/whatsapp/qr", { method: "POST" })
      const payload = await response.json()
      setQrCode(payload.qrCode || null)
      setQrUpdatedAt(payload.qrUpdatedAt || new Date().toISOString())
      setWhatsappStatus("conectando")
    } finally {
      setQrRequestState("done")
    }
  }, [])
  const handleRefreshQR = () => {
    void handleConfigureWhatsApp()
  }

  useEffect(() => {
    if (whatsappStatus !== "conectado" && !qrCode && qrRequestState === "idle") void handleConfigureWhatsApp()
  }, [handleConfigureWhatsApp, qrCode, qrRequestState, whatsappStatus])
  const handleConfirmImport = async (file: File, forceTestReimport = false) => {
    const campaignId = await ensureCampaign()
    const form = new FormData()
    form.append("file", file)
    if (campaignId) form.append("campaignId", campaignId)
    if (forceTestReimport) form.append("forceTestReimport", "true")
    const response = await fetch("/api/prospection/upload", { method: "POST", body: form })
    const payload = await response.json()
    await refresh()
    return payload.summary || null
  }
  const handleSaveRate = (rate: SendingRate) => setSendingRate(rate)
  const handleEditVariations = () => {}
  const handleViewHistory = () => {}

  const templateList = useMemo(() => templates.length ? templates : mockTemplates, [templates])

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
            <span title={activeCampaignName || campaignLabel} className="hidden max-w-[220px] truncate rounded-full bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground md:inline-flex">
              Campanha de teste · {campaignLabel}
            </span>
            {(runtime.isDryRun || !runtime.realSendingAllowed) && (
              <span title="Envio real bloqueado" className="hidden rounded-full bg-[var(--warning)]/15 px-2 py-1 text-[10px] font-semibold text-[var(--warning)] sm:inline-flex">
                Modo seguro
              </span>
            )}
            <button
              onClick={handleConfigureWhatsApp}
              className="hidden rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Configurar WhatsApp
            </button>
            <button
              onClick={handleNewCampaign}
              className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="hidden sm:inline">Nova campanha</span>
              <span className="sm:hidden">Nova</span>
            </button>
            {activeCampaignId && ["paused", "ready", "draft", "waiting_for_leads"].includes(campaignStatus) && (
              <button
                onClick={handleCancel}
                className="hidden rounded-md border border-destructive/30 px-2.5 py-1.5 text-[11px] font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive sm:inline-flex"
              >
                Cancelar
              </button>
            )}
            {isRunning && (
              <button
                onClick={handlePause}
                className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                Pausar
              </button>
            )}
            {!isRunning && (
              <button
                onClick={isPaused ? handleResume : ["no_campaign", "completed", "cancelled"].includes(campaignStatus) ? handleNewCampaign : ["draft", "waiting_for_leads"].includes(campaignStatus) ? handleImportLeadsAction : handleStart}
                disabled={campaignStatus === "error"}
                className="rounded-md bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-[0_0_0_1px_var(--primary)] shadow-primary/30 transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                {["no_campaign", "completed", "cancelled"].includes(campaignStatus)
                  ? (
                    <>
                      <span className="hidden sm:inline">Nova campanha</span>
                      <span className="sm:hidden">Nova</span>
                    </>
                  )
                  : isPaused
                  ? "Retomar"
                  : ["draft", "waiting_for_leads"].includes(campaignStatus)
                  ? (
                    <>
                      <span className="hidden sm:inline">Importar leads</span>
                      <span className="sm:hidden">Importar</span>
                    </>
                  )
                  : (
                    <>
                      <span className="hidden sm:inline">Iniciar simulação</span>
                      <span className="sm:hidden">Iniciar</span>
                    </>
                  )}
              </button>
            )}
            {isRunning && (
              <span className="hidden items-center gap-1.5 rounded-md bg-secondary px-3.5 py-1.5 text-[11px] font-semibold text-foreground sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                Simulação ativa
              </span>
              )}
          </div>
        </div>
      </header>

      {/* Conteúdo — cabe na viewport */}
      <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4">
        <MetricsBar
          stats={stats}
          nextSend={{
            value: nextSendHeadline,
            detail: nextSendDetail,
            tone: isPaused ? "text-[var(--warning)]" : isRunning ? "text-primary" : "text-[var(--warning)]",
          }}
        />

        {/* DESKTOP: grid de blocos */}
        <div className="hidden flex-1 grid-rows-[minmax(0,0.95fr)_minmax(0,0.85fr)] gap-3 overflow-hidden lg:grid">
          <div className="grid grid-cols-3 gap-3 overflow-hidden">
            <WhatsAppMiniCard
              status={whatsappStatus}
              qrCode={qrCode}
              qrAgeSeconds={qrAgeSeconds}
              instanceName={whatsappMeta.instance || "centralplay-leads"}
              connectedNumber={whatsappMeta.number}
              profileName={whatsappMeta.profileName}
              onRefreshQR={handleRefreshQR}
            />
            <ImportMiniCard onConfirmImport={handleConfirmImport} onConfirmTestReimport={confirmTestReimport} />
            <RateMiniCard initialRate={sendingRate} onSave={handleSaveRate} />
          </div>
          <div className="grid grid-cols-2 gap-3 overflow-hidden">
            <MessagePreviewCard templates={templateList} onEdit={handleEditVariations} />
            <QueueMiniCard
              current={queue.current}
              upNext={queue.upNext}
              lastSent={queue.lastSent}
              campaignStatus={campaignStatus}
              nextSendLabel={nextSendQueueLabel}
              emptyLabel={queueEmptyLabel}
              onViewHistory={handleViewHistory}
            />
          </div>
        </div>

        {/* MOBILE: abas */}
        <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
          <div className="flex-1 overflow-hidden">
            {mobileTab === "whatsapp" && (
              <WhatsAppMiniCard
                status={whatsappStatus}
                qrCode={qrCode}
                qrAgeSeconds={qrAgeSeconds}
                instanceName={whatsappMeta.instance || "centralplay-leads"}
                connectedNumber={whatsappMeta.number}
                profileName={whatsappMeta.profileName}
                onRefreshQR={handleRefreshQR}
              />
            )}
            {mobileTab === "importar" && (
              <ImportMiniCard onConfirmImport={handleConfirmImport} onConfirmTestReimport={confirmTestReimport} />
            )}
            {mobileTab === "ritmo" && (
              <RateMiniCard initialRate={sendingRate} onSave={handleSaveRate} />
            )}
            {mobileTab === "mensagem" && (
              <MessagePreviewCard templates={templateList} onEdit={handleEditVariations} />
            )}
            {mobileTab === "fila" && (
              <QueueMiniCard
                current={queue.current}
                upNext={queue.upNext}
                lastSent={queue.lastSent}
                campaignStatus={campaignStatus}
                nextSendLabel={nextSendQueueLabel}
                emptyLabel={queueEmptyLabel}
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
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-2xl">
            <h2 className="text-sm font-semibold text-foreground">{confirmDialog.title}</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{confirmDialog.text}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => closeConfirmation(false)}
                className="rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {confirmDialog.cancelLabel}
              </button>
              <button
                onClick={() => closeConfirmation(true)}
                className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  confirmDialog.tone === "danger"
                    ? "bg-destructive/15 text-destructive hover:bg-destructive/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
