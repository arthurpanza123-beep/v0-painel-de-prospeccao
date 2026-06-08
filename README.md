# v0-painel-de-prospeccao

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_omO92CmmKzh6LIKuuknjFLtjCLJT)

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Prospecção

Backend real isolado para o Painel de Prospecção da Central Play Plus.

Variáveis seguras obrigatórias:

```bash
PROSPECTION_DRY_RUN=true
PROSPECTION_ENABLED=false
EVOLUTION_PROSPECTION_INSTANCE=centralplay-leads
```

Endpoints principais:

- `GET /api/prospection/status`
- `POST /api/prospection/upload`
- `GET /api/prospection/leads`
- `GET /api/prospection/queue`
- `POST /api/prospection/campaigns`
- `POST /api/prospection/campaigns/:id/start`
- `POST /api/prospection/campaigns/:id/pause`
- `GET /api/prospection/templates`
- `GET /api/prospection/whatsapp/status`
- `POST /api/prospection/whatsapp/qr`
- `POST /api/prospection/send-next`
- `POST /api/prospection/webhook`

Worker:

```bash
node scripts/prospection-worker.mjs
```

Migração SQL das tabelas novas:

```bash
supabase/migrations/20260608_001_create_prospection_tables.sql
```

Sem credencial SQL/Postgres direta, o app usa `storage/prospection-db.json` como store local de validação dry-run. Esse arquivo é ignorado no git.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
