# AI Employee — Smart Business Assistant

## Overview

A production-ready SaaS platform for small businesses to create AI assistants, upload knowledge, deploy chat widgets, capture leads, book appointments, and simulate WhatsApp. Built as a pnpm monorepo.

**Design**: Tech-Noir dark theme — deep near-black background with neon cyan (#00d4ff) + gold (#ffd700) accents.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (port 24323, preview `/`)
- **Backend**: Express 5 (port 8080, preview `/api`)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (`@clerk/react` frontend, `@clerk/express` backend)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

```
artifacts/
  ai-employee/        # React + Vite frontend (port 24323)
  api-server/         # Express API server (port 8080)
  mockup-sandbox/     # Component preview server (Canvas)
lib/
  api-spec/           # OpenAPI spec + Orval config
  api-client-react/   # Generated React Query hooks (from Orval)
  api-zod/            # Generated Zod schemas (from Orval)
  db/                 # Drizzle schema + migration tooling
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Tables

- `assistants` — AI assistant configs (name, tone, widget color, etc.)
- `knowledge` — Knowledge base entries per assistant (text, URL, PDF)
- `conversations` — Chat sessions (widget or WhatsApp channel)
- `messages` — Individual messages per conversation
- `leads` — CRM leads captured by assistants
- `appointments` — Bookings made via AI assistant
- `subscriptions` — User subscription plans and usage limits

## App Pages

- `/` — Landing page (public)
- `/sign-in`, `/sign-up` — Clerk auth
- `/dashboard` — Mission Control stats (assistants, conversations, leads, conversion rate)
- `/assistants` — List of AI assistants
- `/assistants/new` — Create a new assistant
- `/assistants/:id` — Assistant detail, knowledge upload, embed code
- `/conversations` — Chat history viewer
- `/leads` — CRM lead management
- `/appointments` — Appointment scheduling view
- `/whatsapp` — WhatsApp chat simulation
- `/subscription` — Plan management
- `/settings` — User settings, embed code

## Environment Secrets

- `SESSION_SECRET` — Express session secret
- `CLERK_SECRET_KEY` — Clerk backend secret
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (backend)
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (frontend)
- `DATABASE_URL` — PostgreSQL connection string
- `OPENAI_API_KEY` — (optional) OpenAI GPT-4o-mini for AI chat; falls back to smart mock replies if not set

## Notes

- AI chat engine: `artifacts/api-server/src/lib/aiChat.ts` — uses OpenAI if key set, else mock
- Orval config: `lib/api-spec/orval.config.ts` — `mode: "single"` for zod to avoid duplicate export conflicts
- Demo data seeded for 3 assistants: Apex Digital Agency, CloudStore Pro, Luxe Spa & Wellness
