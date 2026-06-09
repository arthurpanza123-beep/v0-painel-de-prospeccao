"use client"

import { useEffect, useRef, useState } from "react"

export interface MenuAction {
  label: string
  onSelect: () => void
  tone?: "default" | "danger"
}

export function ActionMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [open])

  if (!actions.length) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mais opções"
        className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-[0_1px_0_0_oklch(1_0_0)_inset] transition-colors hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              role="menuitem"
              onClick={() => {
                setOpen(false)
                action.onSelect()
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-secondary ${
                action.tone === "danger" ? "text-destructive" : "text-foreground"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
