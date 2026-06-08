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
  mockCampaignStats,
  mockSendingRate,
  type CampaignStatus,
  type WhatsAppStatus,
  type SendingRate,
  type Lead,
  type MessageTemplate,
} from "@/lib/mock-data"

type MobileTab = "whatsapp" | "importar" | "ritmo" | "mensagem" | "fila"

type ApiStatus = {
  stats?: {
    leadsImportados: number
    naFila: number
    enviadosHoje: number
    responderam: number
    optOut: number
    proximoEnvio: number | null
  }
  whatsapp?: {
    status?: string
    state?: string
    connectionStatus?: string | null
    instance?: string
    number?: string | null
    profileName?: string | null
  }
  activeCampaign?: { id: string; status: string } | null
  queue?: {
    current: ApiLead | null
    upcoming: ApiLead[]
    lastSent: ApiLead | null
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

const formatCountdown = (seconds?: number | null) => {
  if (seconds == null) return "--:--"
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
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
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus>("parada")
  const [sendingRate, setSendingRate] = useState(mockSendingRate)
  const [mobileTab, setMobileTab] = useState<MobileTab>("whatsapp")
  const [stats, setStats] = useState(mockCampaignStats)
  const [templates, setTemplates] = useState<MessageTemplate[]>(mockTemplates)
  const [queue, setQueue] = useState<{ current: Lead | null; upNext: Lead[]; lastSent: Lead | null }>({ current: null, upNext: [], lastSent: null })
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrUpdatedAt, setQrUpdatedAt] = useState<string | null>(null)
  const [qrRequestState, setQrRequestState] = useState<"idle" | "loading" | "done">("idle")
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [whatsappMeta, setWhatsappMeta] = useState<{ instance?: string; number?: string | null; profileName?: string | null }>({})

  const isRunning = campaignStatus === "rodando"
  const isPaused = campaignStatus === "pausada"

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
      proximoEnvio: formatCountdown(statusRes.stats?.proximoEnvio),
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
    setCampaignStatus(
      statusRes.activeCampaign?.status === "running"
        ? "rodando"
        : statusRes.activeCampaign?.status === "paused"
        ? "pausada"
        : statusRes.activeCampaign?.status === "completed"
        ? "concluida"
        : "parada",
    )
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
    if (activeCampaignId) return activeCampaignId
    const response = await fetch("/api/prospection/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Campanha de Prospecção" }) })
    const payload = await response.json()
    const id = payload.campaign?.id
    setActiveCampaignId(id)
    return id
  }

  const handleToggleCampaign = async () => {
    const id = await ensureCampaign()
    if (!id) return
    await fetch(`/api/prospection/campaigns/${id}/${isRunning ? "pause" : "start"}`, { method: "POST" })
    await refresh()
  }
  const handlePause = async () => {
    if (!activeCampaignId) return
    await fetch(`/api/prospection/campaigns/${activeCampaignId}/pause`, { method: "POST" })
    await refresh()
  }
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
  const handleConfirmImport = async (file: File) => {
    const form = new FormData()
    form.append("file", file)
    if (activeCampaignId) form.append("campaignId", activeCampaignId)
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
        <MetricsBar stats={stats} />

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
            <ImportMiniCard onConfirmImport={handleConfirmImport} />
            <RateMiniCard initialRate={sendingRate} onSave={handleSaveRate} />
          </div>
          <div className="grid grid-cols-2 gap-3 overflow-hidden">
            <MessagePreviewCard templates={templateList} onEdit={handleEditVariations} />
            <QueueMiniCard
              current={queue.current}
              upNext={queue.upNext}
              lastSent={queue.lastSent}
              isRunning={isRunning}
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
              <ImportMiniCard onConfirmImport={handleConfirmImport} />
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
