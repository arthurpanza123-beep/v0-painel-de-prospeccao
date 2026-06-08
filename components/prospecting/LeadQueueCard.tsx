"use client"

import type { Lead, LeadStatus } from "@/lib/mock-data"

interface LeadQueueCardProps {
  leads: Lead[]
  onViewMessage: (lead: Lead) => void
  onMarkDoNotSend: (lead: Lead) => void
  onRemoveFromQueue: (lead: Lead) => void
}

const statusConfig: Record<
  LeadStatus,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  aguardando: {
    label: "Aguardando",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-transparent",
    border: "border-border",
  },
  proximo: {
    label: "Próximo envio",
    dot: "bg-[oklch(0.72_0.17_56)] animate-pulse",
    text: "text-[oklch(0.72_0.17_56)]",
    bg: "bg-[oklch(0.72_0.17_56/0.08)]",
    border: "border-[oklch(0.72_0.17_56/0.20)]",
  },
  enviando: {
    label: "Enviando agora",
    dot: "bg-primary animate-pulse",
    text: "text-primary",
    bg: "bg-primary/8",
    border: "border-primary/20",
  },
  enviado: {
    label: "Enviado",
    dot: "bg-[oklch(0.60_0.18_148)]",
    text: "text-[oklch(0.60_0.18_148)]",
    bg: "bg-[oklch(0.60_0.18_148/0.07)]",
    border: "border-[oklch(0.60_0.18_148/0.18)]",
  },
  respondeu: {
    label: "Respondeu",
    dot: "bg-[oklch(0.60_0.18_148)]",
    text: "text-[oklch(0.60_0.18_148)]",
    bg: "bg-[oklch(0.60_0.18_148/0.10)]",
    border: "border-[oklch(0.60_0.18_148/0.25)]",
  },
  "nao-quero": {
    label: "Não quero",
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/8",
    border: "border-destructive/20",
  },
  erro: {
    label: "Erro",
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/8",
    border: "border-destructive/20",
  },
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`h-1 w-1 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export function LeadQueueCard({
  leads,
  onViewMessage,
  onMarkDoNotSend,
  onRemoveFromQueue,
}: LeadQueueCardProps) {
  const canEdit = (s: LeadStatus) => s === "aguardando" || s === "proximo"

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wide">Fila de leads</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{leads.length} contatos</span>
      </div>

      {/* Tabela desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 pr-4 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Nome</th>
              <th className="pb-2 pr-4 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Telefone</th>
              <th className="pb-2 pr-4 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Cidade/UF</th>
              <th className="pb-2 pr-4 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="pb-2 pr-4 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Agendado</th>
              <th className="pb-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-2.5 pr-4 font-medium text-foreground">{lead.nome}</td>
                <td className="py-2.5 pr-4 text-muted-foreground font-mono">{lead.telefone}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">{lead.cidade}, {lead.uf}</td>
                <td className="py-2.5 pr-4">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="py-2.5 pr-4 font-mono">
                  {lead.proximoEnvio ? (
                    <span className="text-[oklch(0.72_0.17_56)]">{lead.proximoEnvio}</span>
                  ) : lead.enviadoEm ? (
                    <span className="text-muted-foreground/50">{lead.enviadoEm}</span>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </td>
                <td className="py-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewMessage(lead)}
                      className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                    >
                      Ver msg
                    </button>
                    {canEdit(lead.status) && (
                      <>
                        <button
                          onClick={() => onMarkDoNotSend(lead)}
                          className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                        >
                          Não enviar
                        </button>
                        <button
                          onClick={() => onRemoveFromQueue(lead)}
                          className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="flex flex-col gap-2 md:hidden">
        {leads.map((lead) => (
          <div key={lead.id} className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-xs font-semibold text-foreground">{lead.nome}</p>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{lead.telefone}</p>
                <p className="text-[11px] text-muted-foreground">{lead.cidade}, {lead.uf}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={lead.status} />
                {lead.proximoEnvio && (
                  <span className="text-[10px] text-[oklch(0.72_0.17_56)] font-mono">{lead.proximoEnvio}</span>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onViewMessage(lead)}
                className="flex-1 rounded border border-border bg-card py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Ver mensagem
              </button>
              {canEdit(lead.status) && (
                <button
                  onClick={() => onRemoveFromQueue(lead)}
                  className="rounded border border-destructive/25 px-3 py-1.5 text-[11px] text-destructive hover:bg-destructive/8 transition-colors"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
