"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ActionMenu, type MenuAction } from "@/components/prospecting/ActionMenu"
import { ConfirmModal } from "@/components/prospecting/ConfirmModal"
import { ImportMiniCard } from "@/components/prospecting/ImportMiniCard"
import { MetricsBar } from "@/components/prospecting/MetricsBar"
import { QueueMiniCard } from "@/components/prospecting/QueueMiniCard"
import { WhatsAppMiniCard } from "@/components/prospecting/WhatsAppMiniCard"
import {
  type Lead,
  type MessageTemplate,
  type SendingRate,
  type WhatsAppStatus,
} from "@/lib/mock-data"

type MobileTab = "whatsapp" | "importar" | "fila"
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
}

const DEFAULT_SENDING_RATE: SendingRate = {
  limitePorLote: 15,
  janelaMinutos: 50,
  intervaloMinMin: "2min40s",
  intervaloMaxMin: "4min30s",
  horarioInicio: "09:00",
  horarioFim: "20:00",
}

const formatCountdown = (seconds?: number | null) => {
  if (seconds == null) return "--:--"
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

const formatHumanCountdown = (seconds?: number | null) => {
  if (seconds == null) return "Aguardando início"
  if (seconds <= 0) return "Pronto para enviar"
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
  const [sendingRate] = useState<SendingRate>(DEFAULT_SENDING_RATE)
  const [mobileTab, setMobileTab] = useState<MobileTab>("whatsapp")
  const [stats, setStats] = useState({ leadsImportados: 0, naFila: 0, enviadosHoje: 0, responderam: 0, optOut: 0, proximoEnvio: "--:--" })
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [queue, setQueue] = useState<{ current: Lead | null; upNext: Lead[]; lastSent: Lead | null }>({ current: null, upNext: [], lastSent: null })
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [activeCampaignName, setActiveCampaignName] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrUpdatedAt, setQrUpdatedAt] = useState<string | null>(null)
  const [qrRequestState, setQrRequestState] = useState<"idle" | "loading" | "done">("idle")
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [whatsappMeta, setWhatsappMeta] = useState<{ instance?: string; number?: string | null; profileName?: string | null }>({})
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
  const hasLeadsQueued = stats.naFila > 0 || Boolean(queue.current)
  const nextLead = queue.current || queue.upNext[0] || null
  const realBatchMode = Boolean(runtime.realSendingAllowed && !runtime.isDryRun)
  const canSendNow = Boolean(activeCampaignId && realBatchMode && hasLeadsQueued && nextLead)
  const campaignLabel = campaignStatus === "no_campaign"
    ? "Sem campanha"
    : campaignStatus === "ready"
    ? "Pronta"
    : campaignStatus === "running_dry_run"
    ? realBatchMode ? "Campanha ativa" : "Simulação ativa"
    : campaignStatus === "paused"
    ? "Pausada"
    : campaignStatus === "waiting_for_leads"
    ? "Aguardando leads"
    : campaignStatus === "completed"
    ? "Simulação finalizada"
    : campaignStatus === "cancelled"
    ? "Cancelada"
    : "Rascunho"

  const localServerNowMs = runtime.serverNowMs + (nowMs - runtime.receivedAtMs)
  const nextSendSeconds = runtime.nextSendAt && isRunning
    ? Math.max(0, Math.ceil((new Date(runtime.nextSendAt).getTime() - localServerNowMs) / 1000))
    : null
  const nextSendHeadline = isRunning
    ? queue.current
      ? "Enviando..."
      : nextSendSeconds == null
      ? "Calculando..."
      : nextSendSeconds === 0
      ? "Pronto"
      : formatCountdown(nextSendSeconds)
    : campaignStatus === "completed"
    ? "Finalizada"
    : runtime.nextSendDisplay
  const nextSendDetail = isRunning && nextLead?.nome
    ? `${nextLead.nome} · ${realBatchMode ? "envio real" : "simulação"}`
    : isPaused && nextLead?.nome
    ? `${nextLead.nome} · próximo ao retomar`
    : campaignStatus === "completed" && queue.lastSent?.nome
    ? `${queue.lastSent.nome} · finalizado`
    : realBatchMode
    ? "Envio real liberado para leads importados"
    : "Modo seguro"
  const nextSendQueueLabel = isRunning ? formatHumanCountdown(nextSendSeconds) : runtime.nextSendDisplay
  const qrAgeSeconds = qrUpdatedAt ? Math.max(0, Math.floor((nowMs - new Date(qrUpdatedAt).getTime()) / 1000)) : null

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
      fetch("/api/prospection/status", { cache: "no-store" }).then((response) => response.json() as Promise<ApiStatus>),
      fetch("/api/prospection/templates", { cache: "no-store" }).then((response) => response.json()),
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

  const createCampaign = async (name: string) => {
    const response = await fetch("/api/prospection/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const payload = await response.json()
    setActiveCampaignId(payload.campaign?.id || null)
    setActiveCampaignName(payload.campaign?.name || null)
    setCampaignStatus("draft")
    await refresh()
    return payload.campaign?.id || null
  }

  const ensureCampaign = async () => {
    if (activeCampaignId && !["completed", "cancelled", "no_campaign"].includes(campaignStatus)) return activeCampaignId
    return createCampaign("Campanha de prospecção")
  }

  const handleNewCampaign = async () => {
    if (!(await askConfirmation({
      title: "Criar campanha limpa?",
      text: "Uma nova campanha será criada sem apagar o histórico anterior. Importe a planilha antes de iniciar.",
      cancelLabel: "Voltar",
      confirmLabel: "Nova campanha",
    }))) return
    await createCampaign("Campanha de prospecção")
  }

  const handleStart = async () => {
    if (!hasLeadsQueued) {
      setMobileTab("importar")
      return
    }
    if (!(await askConfirmation({
      title: realBatchMode ? "Iniciar envio real?" : "Iniciar simulação?",
      text: realBatchMode
        ? `A campanha vai enviar mensagens reais pela centralplay-leads para ${stats.naFila} lead(s) importado(s) e validado(s).`
        : "A campanha será processada em modo seguro. Nenhuma mensagem real será enviada.",
      cancelLabel: "Cancelar",
      confirmLabel: realBatchMode ? "Iniciar envio real" : "Iniciar simulação",
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
      text: "A fila será interrompida até você retomar.",
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

  const handleSendNow = async () => {
    if (!activeCampaignId || !nextLead || !canSendNow) return
    if (!(await askConfirmation({
      title: `Enviar mensagem real para ${nextLead.nome}?`,
      text: `Destino: ${nextLead.telefone}. Este envio será feito agora pela centralplay-leads.`,
      cancelLabel: "Cancelar",
      confirmLabel: "Enviar agora",
    }))) return
    await fetch(`/api/prospection/send-next?force=true&campaignId=${encodeURIComponent(activeCampaignId)}`, { method: "POST" })
    await refresh()
  }

  const confirmTestReimport = useCallback(() => askConfirmation({
    title: "Reimportar número autorizado?",
    text: "Use apenas para 5522988473304 ou 5522988345946. Leads comuns duplicados continuam bloqueados.",
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

  const handleCleanupTest = async () => {
    if (!(await askConfirmation({
      title: "Limpar campanha de teste?",
      text: "Somente dados marcados como teste serão limpos.",
      cancelLabel: "Cancelar",
      confirmLabel: "Limpar teste",
      tone: "danger",
    }))) return
    await fetch("/api/prospection/admin/cleanup-test-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "LIMPAR_TESTES_DRY_RUN" }),
    })
    await refresh()
  }

  const handleDisconnectWhatsapp = async () => {
    if (!(await askConfirmation({
      title: "Desconectar WhatsApp?",
      text: "A instância centralplay-leads será desconectada.",
      cancelLabel: "Cancelar",
      confirmLabel: "Desconectar",
      tone: "danger",
    }))) return
    await fetch("/api/prospection/whatsapp/disconnect", { method: "POST" })
    await refresh()
  }

  const primaryLabel = isRunning
    ? "Pausar"
    : isPaused
    ? "Retomar"
    : ["no_campaign", "completed", "cancelled"].includes(campaignStatus)
    ? "Nova campanha"
    : realBatchMode
    ? "Iniciar envio real"
    : "Iniciar simulação"

  const handlePrimary = () => {
    if (isRunning) return void handlePause()
    if (isPaused) return void handleResume()
    if (["no_campaign", "completed", "cancelled"].includes(campaignStatus)) return void handleNewCampaign()
    return void handleStart()
  }

  const secondaryActions = useMemo(() => {
    const actions: MenuAction[] = []
    if (canSendNow) actions.push({ label: "Enviar agora", onSelect: () => void handleSendNow() })
    if (activeCampaignId && ["ready", "running_dry_run", "paused", "draft", "waiting_for_leads"].includes(campaignStatus)) {
      actions.push({ label: "Cancelar campanha", tone: "danger", onSelect: () => void handleCancel() })
    }
    actions.push({ label: "Resetar teste autorizado", onSelect: () => void handleCleanupTest() })
    actions.push({ label: "Limpar campanha de teste", tone: "danger", onSelect: () => void handleCleanupTest() })
    actions.push({ label: "Desconectar WhatsApp", tone: "danger", onSelect: () => void handleDisconnectWhatsapp() })
    return actions
  }, [activeCampaignId, campaignStatus, canSendNow])

  const templateCount = templates.length
  const nextLeadName = nextLead?.nome || "Importe leads para começar"
  const nextLeadLabel = isRunning
    ? `Enviando: ${nextLeadName}`
    : hasLeadsQueued
    ? `Próximo: ${nextLeadName}`
    : "Importe leads para começar"

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-hidden">
      <div className="mx-auto flex min-w-0 w-full max-w-6xl flex-1 flex-col px-3 sm:px-5 lg:px-6">
        <header className="flex shrink-0 items-center gap-3 py-4 sm:py-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="btn-glossy flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary-foreground" aria-hidden="true">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-lg font-bold text-foreground sm:text-xl">Central Play Plus</h1>
              <p className="text-xs text-muted-foreground">Prospecção</p>
            </div>
          </div>

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
                whatsappStatus === "conectado" ? "bg-[var(--success)]" : whatsappStatus === "conectando" ? "bg-primary animate-pulse" : "bg-destructive"
              }`}
            />
            {whatsappStatus === "conectado" ? "WhatsApp conectado" : whatsappStatus === "conectando" ? "Conectando..." : "WhatsApp desconectado"}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleConfigureWhatsApp}
              className="hidden rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary sm:inline-flex"
            >
              Configurar WhatsApp
            </button>
            <button
              onClick={handlePrimary}
              disabled={campaignStatus === "error"}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase transition-colors sm:text-sm ${
                isRunning
                  ? "bg-secondary text-foreground hover:bg-muted"
                  : "btn-glossy text-primary-foreground"
              } disabled:opacity-40`}
            >
              {!isRunning && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
              )}
              {primaryLabel}
            </button>
            <ActionMenu actions={secondaryActions} />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-3 pb-6 sm:gap-4">
          <MetricsBar
            stats={stats}
            nextSend={{
              value: nextSendHeadline,
              detail: nextSendDetail,
              tone: isPaused ? "text-[var(--warning)]" : isRunning ? "text-primary" : "text-[var(--warning)]",
            }}
          />

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            <section className="glass-card flex min-h-[260px] flex-col rounded-3xl p-5 lg:col-span-2">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Central de operações
              </p>
              <div className="mt-4 flex flex-1 items-center gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                    {isRunning ? <span className="font-mono tabular-nums">{nextSendHeadline}</span> : campaignLabel}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {nextLeadLabel}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                      {runtime.realSendingAllowed ? "Campanha ativa" : "Modo seguro"}
                    </span>
                    {!runtime.realSendingAllowed && (
                      <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        Envio real bloqueado
                      </span>
                    )}
                    <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      {templateCount} variações ativas
                    </span>
                  </div>
                </div>
                <button
                  onClick={handlePrimary}
                  aria-label={primaryLabel}
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-primary-foreground transition-transform duration-200 hover:scale-105 active:scale-95 sm:h-20 sm:w-20"
                  style={{
                    background: isRunning
                      ? "linear-gradient(180deg, oklch(0.7 0.04 255), oklch(0.55 0.04 255))"
                      : "linear-gradient(180deg, oklch(0.68 0.2 255), oklch(0.52 0.22 258))",
                    boxShadow:
                      "0 1px 0 0 oklch(1 0 0 / 0.5) inset, 0 -3px 8px oklch(0.3 0.1 258 / 0.4) inset, 0 8px 18px -6px oklch(0.52 0.22 258 / 0.6)",
                  }}
                >
                  {isRunning ? (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1" aria-hidden="true">
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-secondary/60 px-4 py-3">
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Lote</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">{sendingRate.limitePorLote}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Janela</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">{sendingRate.janelaMinutos}min</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Intervalo</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {sendingRate.intervaloMinMin} - {sendingRate.intervaloMaxMin}
                  </p>
                </div>
                {canSendNow && (
                  <button
                    onClick={() => void handleSendNow()}
                    className="ml-auto rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Enviar agora
                  </button>
                )}
              </div>
            </section>

            <WhatsAppMiniCard
              status={whatsappStatus}
              qrCode={qrCode}
              qrAgeSeconds={qrAgeSeconds}
              instanceName={whatsappMeta.instance || "centralplay-leads"}
              connectedNumber={whatsappMeta.number}
              profileName={whatsappMeta.profileName}
              onRefreshQR={handleConfigureWhatsApp}
            />
          </div>

          <div className="hidden grid-cols-3 gap-3 sm:gap-4 lg:grid">
            <ImportMiniCard
              leadsImportados={stats.leadsImportados}
              onConfirmImport={handleConfirmImport}
              onConfirmTestReimport={confirmTestReimport}
            />
            <div className="lg:col-span-2">
              <QueueMiniCard
                current={queue.current}
                upNext={queue.upNext}
                lastSent={queue.lastSent}
                campaignStatus={campaignStatus}
                nextSendLabel={nextSendQueueLabel}
                emptyLabel={campaignStatus === "paused" ? "Campanha pausada" : "Fila vazia"}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col lg:hidden">
            <div className="flex-1">
              {mobileTab === "whatsapp" && (
                <WhatsAppMiniCard
                  status={whatsappStatus}
                  qrCode={qrCode}
                  qrAgeSeconds={qrAgeSeconds}
                  instanceName={whatsappMeta.instance || "centralplay-leads"}
                  connectedNumber={whatsappMeta.number}
                  profileName={whatsappMeta.profileName}
                  onRefreshQR={handleConfigureWhatsApp}
                />
              )}
              {mobileTab === "importar" && (
                <ImportMiniCard
                  leadsImportados={stats.leadsImportados}
                  onConfirmImport={handleConfirmImport}
                  onConfirmTestReimport={confirmTestReimport}
                />
              )}
              {mobileTab === "fila" && (
                <QueueMiniCard
                  current={queue.current}
                  upNext={queue.upNext}
                  lastSent={queue.lastSent}
                  campaignStatus={campaignStatus}
                  nextSendLabel={nextSendQueueLabel}
                  emptyLabel={campaignStatus === "paused" ? "Campanha pausada" : "Fila vazia"}
                />
              )}
            </div>

            <nav className="mt-3 grid shrink-0 grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1">
              {[
                { id: "whatsapp" as const, label: "WhatsApp" },
                { id: "importar" as const, label: "Importar" },
                { id: "fila" as const, label: "Fila" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMobileTab(tab.id)}
                  aria-pressed={mobileTab === tab.id}
                  className={`rounded-xl py-2 text-xs font-medium transition-colors ${
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

      <ConfirmModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ""}
        description={confirmDialog?.text || ""}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmLabel={confirmDialog?.confirmLabel || "Confirmar"}
        tone={confirmDialog?.tone || "primary"}
        onClose={() => closeConfirmation(false)}
        onConfirm={() => closeConfirmation(true)}
      />
    </div>
  )
}
