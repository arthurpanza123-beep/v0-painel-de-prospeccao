#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const intervalMs = Math.max(30000, Number(process.env.PROSPECTION_WORKER_INTERVAL_MS || 30000))
const baseUrl = String(process.env.PROSPECTION_API_BASE_URL || 'http://127.0.0.1:3003').replace(/\/+$/, '')
const lockPath = process.env.PROSPECTION_WORKER_LOCK_FILE || path.join(os.tmpdir(), 'centralplay-prospeccao-worker.lock')

let running = false
let lockHandle = null

function pidIsAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function acquireProcessLock() {
  try {
    lockHandle = fs.openSync(lockPath, 'wx')
    fs.writeFileSync(lockHandle, String(process.pid))
    return true
  } catch {
    const existingPid = Number(fs.readFileSync(lockPath, 'utf8').trim())
    if (pidIsAlive(existingPid)) {
      console.log(`[prospection-worker] ${new Date().toISOString()} WORKER_ALREADY_RUNNING pid=${existingPid}`)
      return false
    }
    fs.unlinkSync(lockPath)
    lockHandle = fs.openSync(lockPath, 'wx')
    fs.writeFileSync(lockHandle, String(process.pid))
    return true
  }
}

function releaseProcessLock() {
  if (lockHandle == null) return
  try {
    fs.closeSync(lockHandle)
  } catch {}
  try {
    if (fs.readFileSync(lockPath, 'utf8').trim() === String(process.pid)) fs.unlinkSync(lockPath)
  } catch {}
  lockHandle = null
}

async function tick() {
  if (running) return
  running = true
  try {
    console.log(`[prospection-worker] ${new Date().toISOString()} worker tick`)
    const response = await fetch(`${baseUrl}/api/prospection/send-next`, { method: 'POST' })
    const payload = await response.json().catch(() => ({}))
    if (payload?.ok) {
      const nextSend = payload?.result?.campaign?.next_send_after || payload?.result?.campaign?.nextSendAfter || ''
      console.log(`[prospection-worker] ${new Date().toISOString()} ${payload.code}${nextSend ? ` next send at ${nextSend}` : ''}`)
    } else if (['WAITING_NEXT_SEND', 'NO_DUE_LEAD', 'RATE_LIMITED', 'OUTSIDE_ALLOWED_WINDOW'].includes(String(payload?.code || ''))) {
      console.log(`[prospection-worker] ${new Date().toISOString()} skipped waiting interval code=${payload.code}${payload.waitSeconds ? ` waitSeconds=${payload.waitSeconds}` : ''}${payload.nextSendAt ? ` next send at ${payload.nextSendAt}` : ''}`)
    } else if (!['NO_RUNNING_CAMPAIGN', 'LEAD_OPT_OUT', 'QUEUE_EMPTY_COMPLETED', 'WORKER_LOCKED'].includes(String(payload?.code || ''))) {
      console.log(`[prospection-worker] ${new Date().toISOString()} ${payload?.code || response.status}`)
    }
  } catch (error) {
    console.log(`[prospection-worker] ${new Date().toISOString()} WORKER_REQUEST_FAILED`)
  } finally {
    running = false
  }
}

if (!acquireProcessLock()) process.exit(0)
process.once('exit', releaseProcessLock)
process.once('SIGINT', () => {
  releaseProcessLock()
  process.exit(0)
})
process.once('SIGTERM', () => {
  releaseProcessLock()
  process.exit(0)
})

console.log(`[prospection-worker] started baseUrl=${baseUrl} intervalMs=${intervalMs}`)
setInterval(tick, intervalMs)
void tick()
