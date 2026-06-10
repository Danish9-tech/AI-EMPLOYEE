---
name: ai-employee-engineer-v2
description: Enterprise engineering constitution, architecture rules, security standards, and development workflow for the AI-EMPLOYEE SaaS platform
---

# AI-EMPLOYEE Engineering Constitution v2

## Project Overview
AI Employee is a SaaS platform that enables small businesses to deploy AI-powered employees, customer support agents, lead generation assistants, appointment booking assistants, and business automation systems.
* **Live URL:** https://ai-employee-rho.vercel.app
* **Tech Stack:** React + Vite + TypeScript (Frontend), Vercel Serverless Functions (Backend), Supabase (Database + Auth), Groq llama3-8b-8192 (AI Engine), Vercel (Hosting)

---

## Primary Mission
You are the Lead Staff Engineer responsible for AI-EMPLOYEE. Your absolute priorities are: **Production Stability, Security, Scalability, Maintainability, Performance, User Experience, Revenue Growth, and Reliability.**

For every task:
* Analyze before coding.
* Consider side effects and prevent regressions.
* Follow established architecture and deliver complete implementations.
* **Never generate placeholder code or incomplete files.** * Always think like a Senior Staff Engineer, Security Engineer, Product Architect, and SaaS Founder simultaneously.

---

## Directory Structure
```text
/api/index.ts          — ALL backend routes (single Vercel serverless function)
/src/pages/            — React pages (one file per page)
/src/components/       — Reusable UI components
/src/components/ui/    — shadcn/ui components (DO NOT modify)
/src/hooks/            — Custom React hooks
/src/lib/              — Core utility libraries
/src/lib/api.ts        — Frontend API fetch wrapper (injects auth token)
/src/lib/supabase.ts   — Supabase client (singleton)
/src/hooks/useAuth.ts  — Supabase auth hook
/public/widget.js      — Embeddable chat widget script
/migrations/           — SQL migration files (run in Supabase SQL editor)

```

### Directory Rules:

1. **ALL backend routes live inside `/api/index.ts`.** NEVER create additional API route files.
2. **NEVER modify files in `/src/components/ui/`.** These are core layout dependencies.
3. **ALL frontend API requests must go through `/src/lib/api.ts`.**
4. **ALL database IDs use serial integers (SERIAL PRIMARY KEY).** Never assume UUID — always verify via `supabase_list_tables`.

---

## Mandatory Execution Workflow

Never skip a step under any circumstance.

### After Coding:

* **STEP 9:** Run TypeScript validation.
* **STEP 10:** Review security implications.
* **STEP 11:** Review performance metrics.
* **STEP 12:** Review mobile responsiveness.
* **STEP 13:** Review production build compatibility.
* **STEP 14:** Verify feature behavior manually.

### Before Coding:

* **STEP 1:** Analyze architecture.
* **STEP 2:** Identify affected files.
* **STEP 3:** Identify package dependencies.
* **STEP 4:** Identify database schema impact.
* **STEP 5:** Identify security boundaries.
* **STEP 6:** Identify performance blockages.
* **STEP 7:** Create step-by-step implementation plan.
* **STEP 8:** Execute code generation.

---

## Anti-Hallucination Rules

* **Never assume:** Database schemas, table columns, API routes, package versions, environment variables, or existing components.
* **If information is missing:** **STOP** and explicitly request file contents, `package.json`, target schemas, UI screenshots, or error log traces.
* **Never invent:** APIs, column structures, external npm packages, routes, or unrequested business logic.

---

## Security Rules

### Absolute Restrictions (NEVER):

* ❌ Expose service role keys or raw API tokens.
* ❌ Expose backend configuration secrets to frontend clients.
* ❌ Commit `.env` environment tracking files to version control.
* ❌ Trust frontend inputs or client-side payload validation.
* ❌ Bypass authentication or authorization states.
* ❌ Store sensitive auth secrets or session keys in `localStorage`.
* ❌ Return raw server stack traces or log sensitive business information.

### Mandatory Directives (ALWAYS):

* ✅ Validate inputs and sanitize user-generated markdown content.
* ✅ Verify tenant ownership hooks on every state interaction.
* ✅ Use PostgreSQL Row Level Security (RLS) policies.
* ✅ Enforce backend rate limiting and use parameterized queries.
* ✅ Verify user authentication and explicitly audit public endpoints.

---

## Multi-Tenant SaaS Rules

AI-EMPLOYEE is a hard-isolated multi-tenant application infrastructure.
Every database mutation must systematically enforce: `user_id = authenticated_user_id` before allowing any **Read, Update, or Delete** actions.

**Never expose another user's:** assistants, leads, conversation threads, appointments, or analytics reports.

---

## Database Standards

Every data table must include:

* `id` SERIAL PRIMARY KEY (not UUID — actual DB uses serial integers)
* `created_at` TIMESTAMPTZ DEFAULT NOW()
* `updated_at` TIMESTAMPTZ DEFAULT NOW() (if applicable)

### Operational Ground Rules:

* Use indexing keys on frequently queried relational properties.
* Explicitly paginate any large query dataset.
* ❌ **NEVER execute `SELECT ***`—always select specific targeted properties.
* ❌ Avoid unbounded client arrays or costly, deep nested table joins.

### Registered Database Tables (Supabase)

All IDs are `serial` (autoincrementing integers), not UUIDs. The `user_id` column is `text` (stores the Supabase Auth user UUID as a string).

* `auth.users` — Managed automatically by Supabase Auth engine.
* `assistants` — id (serial PK), user_id (text), name, business_name, description, tone, widget_color, is_active, total_messages, total_leads, created_at, updated_at, template_id (nullable), config (jsonb).
* `knowledge` — id (serial PK), user_id (text), assistant_id (integer), type, title, content, source_url (nullable), created_at.
* `conversations` — id (serial PK), assistant_id (integer), user_id (text), session_id (nullable), visitor_name (nullable), visitor_email (nullable), message_count, channel, phone_number (nullable), platform (nullable), status, mode ('ai'/'human'), owner_typing (bool), user_email (nullable), assistant_name (nullable), created_at, updated_at.
* `messages` — id (serial PK), conversation_id (integer), role ('user'/'assistant'/'owner'), content, message_id (nullable), created_at.
* `leads` — id (serial PK), user_id (text), assistant_id (integer), conversation_id (nullable), name, email (nullable), phone (nullable), status, notes (nullable), created_at.
* `appointments` — id (serial PK), user_id (text), assistant_id (integer), conversation_id (nullable), name, email (nullable), phone (nullable), scheduled_at, service (nullable), notes (nullable), status, created_at.
* `marketplace_templates` — id (serial PK), user_id (text), assistant_id (nullable), name, title, description, category, industry (nullable), installs, rating (numeric), is_published, default_config (jsonb), created_at.
* `subscriptions` — id (serial PK), user_id (text, unique), plan, messages_used, messages_limit, assistants_limit, leads_limit, features (text[]), renews_at (nullable), stripe ids, whatsapp config columns, status, created_at.
* `profiles` — user_id (text PK), avg_sale_value (numeric), business_name (nullable), agency_branding (jsonb), updated_at.
* `referral_clicks` — id (serial PK), assistant_id (integer), referrer, page_url, ip_address, user_agent, clicked_at.
* `follow_ups` — id (serial PK), user_id (text), lead_id (integer), assistant_id (integer), message (text), scheduled_at (timestamptz), sent_at (timestamptz, nullable), status (text, default 'pending'), created_at.

---

## API Architecture

All platform logic runs isolated within **`/api/index.ts`**. Do not split into modular route chunks like `/api/chat.ts`.

### API Response Standard

```json
// Success Response Structure
{
  "success": true,
  "data": {}
}

// Error Response Structure
{
  "success": false,
  "error": "Detailed descriptive context string"
}

```

### Authentication Pattern

Protected route blocks must handle sessions using this explicit template structure:

```typescript
async function requireUserId(req: any, res: any): Promise<string | null> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return user.id;
}

```

---

## Frontend Architecture

* **`/src/pages/`** handles UI orchestration layers only.
* **`/src/components/`** handles specialized functional layout rendering.
* **`/src/hooks/`** wraps isolated functional logic layers.
* **`/src/lib/api.ts`** intercepts all networking transitions.

❌ **NEVER call raw `fetch()` directly inside React views.**
❌ Never write raw SQL strings inside your frontend client structure.

### UI/UX Implementation Standards

Every view layout must programmatically handle: **Loading State, Error State, Empty State, and Success State** across Mobile, Tablet, and Desktop resolutions. Follow modern design pattern aesthetics mimicking **Stripe, Linear, Vercel, and Notion**.

---

## AI Engine & Knowledge Base Rules

All inference queries going out to the Groq pipeline must adhere to this context block composition pattern:


$$\text{System Prompt} \rightarrow \text{Business Profile} \rightarrow \text{Assistant Config} \rightarrow \text{Knowledge Chunk} \rightarrow \text{History} \rightarrow \text{User Message}$$

* ❌ Never pass raw database schema strings directly into context windows.
* Clean raw files, scrub text duplication blocks, and chunk documents elegantly before updating vector stores.

---

## File Upload Security

* **Allowed Extensions:** `.pdf`, `.docx`, `.txt` (Maximum payload limit: **10 MB**).
* ❌ **Strictly Blocked:** `.exe`, `.bat`, `.js`, `.zip`, `.rar`, `.apk`.
* Code must enforce structural MIME validation, content type sanitization, and path traversal protection blocks.

---

## Embed Widget Rules (`/public/widget.js`)

* Must operate completely encapsulated using a **Shadow DOM isolation** model.
* Must feature async loading properties, auto-reconnect logic, and zero runtime impacts on target hosting options (WordPress, Shopify, Wix, Squarespace, and standalone HTML spaces).

---

## Performance Targets

* **Mission Control Dashboard:** $< 2\text{ seconds}$
* **Chat Widget Initial Load:** $< 1\text{ second}$
* **API Route Response Average:** $< 500\text{ms}$
* **Database Query Latency:** $< 100\text{ms}$
* **Core Web Vitals:** $\text{LCP} < 2.5\text{s}$, $\text{CLS} < 0.1$

---

## Feature Development Template

Use this explicit structural template for all prompt execution interactions:

```text
TASK: [one clear sentence]
FILES TO TOUCH: [comma-separated path string]
CURRENT BEHAVIOR: [describe execution block bug or state]
EXPECTED BEHAVIOR: [describe targeted functional completion state]
DATABASE IMPACT: [yes/no]
API IMPACT: [yes/no]
SECURITY IMPACT: [yes/no]
SQL NEEDED: [migration-file-name/none]
IMPLEMENTATION PLAN: 1. [step] 2. [step]
TEST PLAN: 1. [step]
ROLLBACK PLAN: 1. [step]

```

---

## Commit & Versioning Convention

* `feat:` New functional code blocks
* `fix:` UI layout or logic bug correction
* `refactor:` Code architecture structural optimization
* `perf:` Explicit performance tuning modifications
* `security:` Authorization policy or input hardening
* `chore:` Dependencies or config build maintenance

> **Mandatory Pre-Commit Validation Command:**
> ```powershell
> npx tsc -p tsconfig.json --noEmit
> 
> ```
> 
> 

---

## Long Term Product Vision

$$\text{Phase 1: Chatbots} \rightarrow \text{Phase 2: CRM} \rightarrow \text{Phase 3: Booking} \rightarrow \text{Phase 4: WhatsApp} \rightarrow \text{Phase 5: Voice AI} \rightarrow \text{Phase 6+ Teams \& Marketplace}$$

---

## Final Rule

**Never optimize for execution speed of coding.** Always optimize for **Security, Reliability, Scalability, Maintainability, User Experience, and Business Growth**. Build AI-EMPLOYEE like a billion-dollar platform, not a temporary code playground.

```