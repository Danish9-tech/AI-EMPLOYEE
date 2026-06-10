---
name: ai-employee-engineer
description: Rules, architectures, and guidelines for building the AI-EMPLOYEE SaaS platform
---

# AI-EMPLOYEE Project Skill

## Project Overview
AI Employee is a SaaS platform for small businesses to deploy AI chat assistants.
Live URL: https://ai-employee-rho.vercel.app
Stack: React + Vite + TypeScript (frontend), Vercel Serverless Functions (backend), Supabase (database + auth), Groq AI (llama3-8b-8192)

---

## Directory Structure

```

/api/index.ts          — ALL backend routes (single Vercel serverless function)
/src/pages/            — React pages (one file per page)
/src/components/       — Reusable UI components
/src/components/ui/    — shadcn/ui components (DO NOT modify)
/src/lib/supabase.ts   — Supabase client (singleton)
/src/lib/api.ts        — Frontend API fetch wrapper (injects auth token)
/src/hooks/useAuth.ts  — Supabase auth hook
/migrations/           — SQL migration files (run in Supabase SQL editor)
/public/widget.js      — Embeddable chat widget script

```

---

## Key Rules — ALWAYS Follow

1. ALL backend routes live in `/api/index.ts` — never create separate api files
2. Frontend fetches go through `/src/lib/api.ts` — never use raw fetch() in pages
3. Auth token injected automatically by `apiFetch()` in api.ts — never manually add headers in pages
4. Database IDs are UUIDs — never use integers as IDs
5. Never modify files in `/src/components/ui/` — these are shadcn components
6. Always run typecheck after changes: `npx tsc -p tsconfig.json --noEmit`
7. Never use `pnpm install` without `--no-frozen-lockfile` flag
8. Write COMPLETE files — never use "// existing code here" placeholders

---

## Database Tables (Supabase)
- `auth.users` — managed by Supabase Auth automatically
- `assistants` — user's AI assistants (id: uuid, user_id, name, business_name, description, tone, widget_color, is_active, google_review_url)
- `knowledge` — training data per assistant (id: uuid, user_id, assistant_id, title, content, type, url)
- `conversations` — chat sessions (id: uuid, assistant_id, session_id, visitor_name, visitor_email, mode: 'ai'|'human', status)
- `messages` — individual messages (id: uuid, conversation_id, role: 'user'|'assistant'|'owner', content)
- `leads` — captured leads (id: uuid, user_id, assistant_id, name, email, phone, status)
- `appointments` — bookings (id: uuid, user_id, assistant_id, visitor_name, visitor_email, scheduled_at, status)
- `marketplace_templates` — published assistant templates (id: uuid, user_id, assistant_id, title, category, installs)
- `referral_clicks` — viral badge clicks (id: uuid, assistant_id, clicked_at)
- `follow_ups` — scheduled follow-up messages (id: uuid, user_id, lead_id, message, scheduled_at, status)

---

## API Routes (all in /api/index.ts)

```

GET    /api/dashboard/stats        — dashboard metrics
GET    /api/roi                    — ROI calculator data
GET    /api/assistants             — list user's assistants
POST   /api/assistants             — create assistant
GET    /api/assistants/:id         — get single assistant (public)
PATCH  /api/assistants/:id         — update assistant
DELETE /api/assistants/:id         — delete assistant
GET    /api/knowledge               — list knowledge entries
POST   /api/knowledge               — create knowledge entry
POST   /api/knowledge/upload       — upload file (pdf/docx/txt)
POST   /api/knowledge/crawl        — crawl URL with cheerio
DELETE /api/knowledge/:id          — delete knowledge entry
POST   /api/chat                    — public chat endpoint (no auth)
GET    /api/conversations          — list conversations
PATCH  /api/conversations/:id/mode — switch ai/human mode
POST   /api/conversations/:id/reply — owner sends message
POST   /api/conversations/:id/request-review — trigger review request
GET    /api/leads                  — list leads
GET    /api/appointments           — list appointments
GET    /api/marketplace            — list templates (public)
POST   /api/marketplace            — publish template
POST   /api/marketplace/install    — install template
POST   /api/marketplace/seed       — seed starter templates
GET    /api/reports/weekly         — weekly intelligence report
GET    /api/profile                 — get user profile
PATCH  /api/profile                 — update profile (avgSaleValue, onboardingCompleted)
POST   /api/referral-clicks         — log viral badge click
GET    /api/referral-clicks/:id/stats — referral stats
GET    /api/follow-ups              — list follow-ups
POST   /api/follow-ups/schedule     — schedule follow-up sequence
GET    /api/healthz                 — health check

```

---

## Pages

```

/                    — Landing page (public)
/sign-in             — Supabase auth sign in
/sign-up             — Supabase auth sign up
/onboarding          — 4-step new user setup (no sidebar)
/dashboard           — Mission Control with stats
/assistants          — List all assistants
/assistants/:id      — Assistant detail (5 tabs: Overview, Knowledge, Conversations, Leads, Appointments, Embed Code, Settings)
/conversations       — Chat history with live takeover
/marketplace         — Template marketplace
/reports             — Weekly intelligence report
/leads               — CRM leads management
/appointments        — Appointments list
/channels            — WhatsApp + other channels
/subscription        — Pricing plans
/settings            — Account, branding, API keys
/chat/:id            — PUBLIC widget page (NO auth, NO sidebar)

```

---

## Auth Pattern
```typescript
// In api/index.ts — verify user in every protected route:
async function requireUserId(req, res): Promise<string | null> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return user.id;
}

// In frontend pages — get token automatically:
import { api } from '@/lib/api'; // already injects Bearer token

```

---

## Environment Variables

```
SUPABASE_URL                — server side
SUPABASE_SERVICE_ROLE_KEY   — server side (never expose to frontend)
SUPABASE_ANON_KEY           — server side
VITE_SUPABASE_URL           — frontend (Vite exposes VITE_ prefix)
VITE_SUPABASE_ANON_KEY      — frontend
GROQ_API_KEY                — Groq AI (llama3-8b-8192 model)

```

---

## Installed Packages

Frontend: react, react-dom, @supabase/supabase-js, @tanstack/react-query, wouter, framer-motion, lucide-react, recharts, shadcn/ui, tailwindcss, qrcode
Backend (api/): @supabase/supabase-js, @vercel/node, cheerio, pdf-parse, mammoth, groq-sdk

---

## Task Prompt Template (use this every time)

```
TASK: [one clear sentence]
FILES TO TOUCH: [list only relevant files]
CURRENT BEHAVIOR: [what happens now]
EXPECTED BEHAVIOR: [what should happen]
DO NOT: [guardrails]
SQL NEEDED: [any migration, or "none"]

```

---

## Commit Convention

feat: new feature
fix: bug fix

chore: cleanup/config
Always typecheck before committing.

```

```