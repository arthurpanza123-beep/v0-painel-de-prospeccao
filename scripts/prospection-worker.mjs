#!/usr/bin/env node

const intervalMs = Math.max(30000, Number(process.env.PROSPECTION_WORKER_INTERVAL_MS || 30000))
const baseUrl = String(process.env.PROSPECTION_API_BASE_URL || 'http://127.0.0.1:3003').replace(/\/+$/, '')

let running = false

async function tick() {
  if (running) return
  running = true
  try {
    const response = await fetch(`${baseUrl}/api/prospection/send-next`, { method: 'POST' })
    const payload = await response.json().catch(() => ({}))
    if (payload?.ok) {
      console.log(`[prospection-worker] ${new Date().toISOString()} ${payload.code}`)
    } else if (!['NO_RUNNING_CAMPAIGN', 'NO_DUE_LEAD', 'OUTSIDE_ALLOWED_WINDOW', 'RATE_LIMITED', 'LEAD_OPT_OUT'].includes(String(payload?.code || ''))) {
      console.log(`[prospection-worker] ${new Date().toISOString()} ${payload?.code || response.status}`)
    }
  } catch (error) {
    console.log(`[prospection-worker] ${new Date().toISOString()} WORKER_REQUEST_FAILED`)
  } finally {
    running = false
  }
}

console.log(`[prospection-worker] started baseUrl=${baseUrl} intervalMs=${intervalMs}`)
setInterval(tick, intervalMs)
void tick()
