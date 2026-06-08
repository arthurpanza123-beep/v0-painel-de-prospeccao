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
  { label: string; className: string; dotColor: string }
> = {
  aguardando: {
    label: "Aguardando",
    className: "bg-muted/60 text-muted-foreground border-border",
    dotColor: "bg-muted-foreground",
  },
  proximo: {
    label: "Próximo",
    className: "bg-[oklch(0.72_0.16_55/0.12)] text-[oklch(0.72_0.16_55)] border-[oklch(0.72_0.16_55/0.2)]",
    dotColor: "bg-[oklch(0.72_0.16_55)] animate-pulse",
  },
  enviando: {
    label: "Enviando",
    className: "bg-primary/10 text-primary border-primary/20",
    dotColor: "bg-primary animate-pulse",
  },
  enviado: {
    label: "Enviado",
    className: "bg-[oklch(0.62_0.17_145/0.1)] text-[oklch(0.62_0.17_145)] border-[oklch(0.62_0.17_145/0.2)]",
    dotColor: "bg-[oklch(0.62_0.17_145)]",
  },
  respondeu: {
    label: "Respondeu",
    className: "bg-[oklch(0.62_0.17_145/0.15)] text-[oklch(0.62_0.17_145)] border-[oklch(0.62_0.17_145/0.3)]",
    dotColor: "bg-[oklch(0.62_0.17_145)]",
  },
  "nao-quero": {
    label: "Não quero",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dotColor: "bg-destructive",
  },
  erro: {
    label: "Erro",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dotColor: "bg-destructive",
  },
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
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
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <h2 className="text-sm font-medium text-foreground">Fila de leads</h2>
        </div>
        <span className="text-xs text-muted-foreground">{leads.length} contatos</span>
      </div>

      {/* Tabela desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Nome</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Telefone</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Cidade/UF</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
              <th className="pb-2 pr-4 font-medium text-muted-foreground">Próximo envio</th>
              <th className="pb-2 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-4 font-medium text-foreground">{lead.nome}</td>
                <td className="py-2.5 pr-4 text-muted-foreground font-mono">{lead.telefone}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">
                  {lead.cidade}, {lead.uf}
                </td>
                <td className="py-2.5 pr-4">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground font-mono">
                  {lead.proximoEnvio ? (
                    <span className="text-primary">{lead.proximoEnvio}</span>
                  ) : lead.enviadoEm ? (
                    <span className="text-muted-foreground/60">{lead.enviadoEm}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="py-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewMessage(lead)}
                      className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Ver mensagem"
                    >
                      Ver msg
                    </button>
                    {(lead.status === "aguardando" || lead.status === "proximo") && (
                      <>
                        <button
                          onClick={() => onMarkDoNotSend(lead)}
                          className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Não enviar"
                        >
                          Não enviar
                        </button>
                        <button
                          onClick={() => onRemoveFromQueue(lead)}
                          className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remover da fila"
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
          <div
            key={lead.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-secondary p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{lead.nome}</span>
                <span className="text-xs text-muted-foreground font-mono">{lead.telefone}</span>
                <span className="text-xs text-muted-foreground">
                  {lead.cidade}, {lead.uf}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={lead.status} />
                {lead.proximoEnvio && (
                  <span className="text-xs text-primary font-mono">{lead.proximoEnvio}</span>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onViewMessage(lead)}
                className="flex-1 rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Ver mensagem
              </button>
              {(lead.status === "aguardando" || lead.status === "proximo") && (
                <button
                  onClick={() => onRemoveFromQueue(lead)}
                  className="rounded border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
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
