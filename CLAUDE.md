# Pre-Preg Material Tracker — Claude Code Guide

## What this app is

A web-based composite materials management system for a manufacturing/aerospace environment.
It tracks pre-preg (pre-impregnated composite) materials from freezer storage through production.

**Core entities:**
- **Materials** — material specs (part number, out-life, expiry rules, category)
- **Stock** — physical rolls/batches in inventory (location, expiry, quantity)
- **Kits** — assemblies of materials needed for a job (part number, status, cure date)
- **Transfers** — movement log for stock and kits between locations
- **Batches** — grouping of stock items by batch number
- **Locations** — storage locations (Freezer A/B/C, Clean Room, Layup Area, Cure Area)

**Pages:** Materials, Stock, Kits, Transfer

---

## Current state

This codebase was exported from Base44 (a no-code platform) and is being migrated to run standalone.

**What's already done:**
- All 95 source files extracted and placed in the correct structure
- `package.json` updated — `@base44/sdk` removed, `@supabase/supabase-js` added
- `vite.config.js` cleaned — Base44 vite plugin removed, path alias configured
- `src/api/base44Client.js` replaced with a Supabase compatibility layer
- `src/api/supabaseClient.js` — new Supabase client
- `supabase/migrations/001_initial_schema.sql` — full DB schema ready to run
- `.env.example` created

**What still needs doing (in priority order):**

### 1. Supabase project setup
- Create a free project at https://supabase.com
- Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Run the SQL in `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor

### 2. Install dependencies and verify the app runs
```bash
npm install
npm run dev
```
Fix any import errors. Most will be Base44-specific imports that need updating.

### 3. Fix `src/lib/app-params.js`
This file reads Base44-specific URL params and env vars. It can be replaced with a simple stub:
```js
export const appParams = {}
```
Or removed entirely if nothing meaningful uses it.

### 4. Fix auth flow
`src/lib/AuthContext.jsx` uses `base44.auth`. Replace with Supabase auth:
- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.getUser()`
- `supabase.auth.signOut()`
- `supabase.auth.onAuthStateChange()`

The `Layout.jsx` already calls `base44.auth.me()` — this now calls through to the compatibility layer but needs testing.

For the initial dev setup, you can set `requiresAuth: false` by commenting out the auth guards in `Layout.jsx` and `AuthContext.jsx`.

### 5. Fix the AI Notification Button
`src/components/common/AINotificationButton.jsx` calls `base44.functions.callFunction()` to invoke an LLM. Replace with a direct Anthropic API call or Supabase Edge Function. The component already has the prompt logic — just needs a new HTTP client.

Add to `.env`:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### 6. Remove unused Base44 imports
Search for any remaining `@base44/sdk` or `@/integrations` imports:
```bash
grep -r "base44" src/ --include="*.jsx" --include="*.js" --include="*.ts"
```

### 7. Test all CRUD operations
Each page (Materials, Stock, Kits, Transfer) uses `base44.entities.X.list/create/update/delete`.
These now route through the compatibility layer in `src/api/base44Client.js`.
Test each page and fix any field mapping issues — Supabase returns `id` (UUID) while Base44
used its own ID format. The `id` field should work transparently.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 6 |
| Styling | Tailwind CSS v3 + shadcn/ui |
| State | TanStack Query v5 |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Database | PostgreSQL (via Supabase) |

---

## File structure

```
prepreg-tracker/
├── src/
│   ├── api/
│   │   ├── base44Client.js      # Compatibility layer (Supabase-backed)
│   │   └── supabaseClient.js    # Raw Supabase client
│   ├── components/
│   │   ├── common/              # Shared components (DataTable, Sidebar, etc.)
│   │   ├── stock/               # Stock-specific components
│   │   └── ui/                  # shadcn/ui primitives
│   ├── lib/
│   │   ├── AuthContext.jsx      # Auth state — needs Supabase update
│   │   └── utils.js
│   ├── pages/
│   │   ├── Materials.jsx
│   │   ├── Stock.jsx
│   │   ├── Kits.jsx
│   │   └── Transfer.jsx
│   ├── Layout.jsx
│   └── App.jsx
├── entities/                    # Original Base44 entity schemas (reference only)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
└── CLAUDE.md                    # This file
```

---

## Optimisation ideas (phase 2)

Once the app is running correctly, these are worth tackling:

- **TypeScript** — convert .jsx files to .tsx, add proper types for all entities
- **Real-time** — use Supabase Realtime subscriptions so stock changes update live
- **Offline support** — TanStack Query already caches; add `staleTime` and `gcTime` config
- **Audit log** — replace the current client-side action log with a proper DB trigger that writes to an `audit_log` table
- **File attachments** — stock items have an `attachments` field; wire up to Supabase Storage
- **Auth** — add proper login screen, role-based access (admin vs. operator)
- **Out-life tracking** — the Transfer entity has `out_time_start`/`out_time_end`; build a proper out-life calculator that updates stock in real-time
- **Export** — add CSV/PDF export for stock reports and kit packing lists
- **Mobile** — the app already has mobile views; test and polish

---

## Common Supabase patterns to use

```js
// List all
const { data } = await supabase.from('materials').select('*')

// Filter
const { data } = await supabase.from('stocks').select('*').eq('archived', false)

// Create
const { data } = await supabase.from('materials').insert([{ part_number: 'HR1234' }]).select().single()

// Update
const { data } = await supabase.from('stocks').update({ location: 'Freezer B' }).eq('id', id).select().single()

// Delete
await supabase.from('stocks').delete().eq('id', id)

// Auth
const { data: { user } } = await supabase.auth.getUser()
```
