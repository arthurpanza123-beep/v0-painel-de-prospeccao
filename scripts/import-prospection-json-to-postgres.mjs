#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { Pool } from 'pg'

const dbUrl = process.env.PROSPECTION_DATABASE_URL
if (!dbUrl) {
  console.error('PROSPECTION_DATABASE_URL ausente.')
  process.exit(1)
}

const sourceFile = process.argv[2] || path.join(process.cwd(), 'storage/prospection-db.json')
const raw = await fs.readFile(sourceFile, 'utf8')
const db = JSON.parse(raw)

const pool = new Pool({ connectionString: dbUrl, max: 2 })
const client = await pool.connect()

const upsert = async (sql, params) => client.query(sql, params)

try {
  await client.query('begin')

  for (const campaign of db.campaigns || []) {
    await upsert(
      `insert into prospection_campaigns
        (id, name, status, instance_name, rate_limit_count, rate_limit_window_minutes, min_delay_seconds, max_delay_seconds, allowed_start_time, allowed_end_time, next_send_after, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (id) do update set
         name = excluded.name,
         status = excluded.status,
         instance_name = excluded.instance_name,
         rate_limit_count = excluded.rate_limit_count,
         rate_limit_window_minutes = excluded.rate_limit_window_minutes,
         min_delay_seconds = excluded.min_delay_seconds,
         max_delay_seconds = excluded.max_delay_seconds,
         allowed_start_time = excluded.allowed_start_time,
         allowed_end_time = excluded.allowed_end_time,
         next_send_after = excluded.next_send_after,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      [
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.instance_name,
        campaign.rate_limit_count,
        campaign.rate_limit_window_minutes,
        campaign.min_delay_seconds,
        campaign.max_delay_seconds,
        campaign.allowed_start_time,
        campaign.allowed_end_time,
        campaign.next_send_after || null,
        campaign.created_at,
        campaign.updated_at,
      ],
    )
  }

  for (const template of db.templates || []) {
    await upsert(
      `insert into prospection_templates
        (id, name, body, active, weight, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (id) do update set
         name = excluded.name,
         body = excluded.body,
         active = excluded.active,
         weight = excluded.weight,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      [template.id, template.name, template.body, template.active, template.weight, template.created_at, template.updated_at],
    )
  }

  for (const lead of db.leads || []) {
    await upsert(
      `insert into prospection_leads
        (id, campaign_id, name, phone_raw, phone_e164, email, city, uf, source_file_name, status, template_id, message_preview, scheduled_at, sent_at, responded_at, last_response_text, send_attempts, error_message, metadata, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21)
       on conflict (id) do update set
         campaign_id = excluded.campaign_id,
         name = excluded.name,
         phone_raw = excluded.phone_raw,
         phone_e164 = excluded.phone_e164,
         email = excluded.email,
         city = excluded.city,
         uf = excluded.uf,
         source_file_name = excluded.source_file_name,
         status = excluded.status,
         template_id = excluded.template_id,
         message_preview = excluded.message_preview,
         scheduled_at = excluded.scheduled_at,
         sent_at = excluded.sent_at,
         responded_at = excluded.responded_at,
         last_response_text = excluded.last_response_text,
         send_attempts = excluded.send_attempts,
         error_message = excluded.error_message,
         metadata = excluded.metadata,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      [
        lead.id,
        lead.campaign_id,
        lead.name,
        lead.phone_raw,
        lead.phone_e164,
        lead.email || null,
        lead.city || null,
        lead.uf || null,
        lead.source_file_name || null,
        lead.status,
        lead.template_id || null,
        lead.message_preview || null,
        lead.scheduled_at || null,
        lead.sent_at || null,
        lead.responded_at || null,
        lead.last_response_text || null,
        lead.send_attempts || 0,
        lead.error_message || null,
        JSON.stringify(lead.metadata || {}),
        lead.created_at,
        lead.updated_at,
      ],
    )
  }

  for (const message of db.messages || []) {
    await upsert(
      `insert into prospection_messages
        (id, campaign_id, lead_id, direction, type, template_id, body, status, evolution_message_id, error_message, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (id) do update set
         campaign_id = excluded.campaign_id,
         lead_id = excluded.lead_id,
         direction = excluded.direction,
         type = excluded.type,
         template_id = excluded.template_id,
         body = excluded.body,
         status = excluded.status,
         evolution_message_id = excluded.evolution_message_id,
         error_message = excluded.error_message,
         created_at = excluded.created_at`,
      [
        message.id,
        message.campaign_id || null,
        message.lead_id || null,
        message.direction,
        message.type,
        message.template_id || null,
        message.body,
        message.status,
        message.evolution_message_id || null,
        message.error_message || null,
        message.created_at,
      ],
    )
  }

  for (const optout of db.optouts || []) {
    await upsert(
      `insert into prospection_optouts (id, phone_e164, reason, created_at)
       values ($1,$2,$3,$4)
       on conflict (phone_e164) do update set
         id = excluded.id,
         reason = excluded.reason,
         created_at = excluded.created_at`,
      [optout.id, optout.phone_e164, optout.reason, optout.created_at],
    )
  }

  for (const event of db.events || []) {
    await upsert(
      `insert into prospection_events (id, campaign_id, lead_id, event_type, message, metadata, created_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7)
       on conflict (id) do update set
         campaign_id = excluded.campaign_id,
         lead_id = excluded.lead_id,
         event_type = excluded.event_type,
         message = excluded.message,
         metadata = excluded.metadata,
         created_at = excluded.created_at`,
      [
        event.id,
        event.campaign_id || null,
        event.lead_id || null,
        event.event_type,
        event.message,
        JSON.stringify(event.metadata || {}),
        event.created_at,
      ],
    )
  }

  await client.query('commit')
  console.log(JSON.stringify({
    campaigns: (db.campaigns || []).length,
    leads: (db.leads || []).length,
    messages: (db.messages || []).length,
    optouts: (db.optouts || []).length,
    templates: (db.templates || []).length,
    events: (db.events || []).length,
  }))
} catch (error) {
  await client.query('rollback').catch(() => null)
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  client.release()
  await pool.end().catch(() => null)
}
