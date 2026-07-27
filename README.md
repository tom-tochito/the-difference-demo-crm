# The Difference — CRM Demo

A charity CRM demo built with **Next.js 16**, **Convex**, and **Convex Auth**, recreating the core screens of a design prototype. Its defining feature is a **CMS-style flexible schema**: every entity's fields are defined in the database by an admin, and forms, list columns, badges, detail panels, and search adapt instantly for every user.

**Live demo:** https://the-difference-demo-crm.vercel.app

| Demo account | Email | Password |
| --- | --- | --- |
| Admin (can edit schemas) | `admin@demo.thedifference.org` | `demo2026!` |
| User (standard access) | `user@demo.thedifference.org` | `demo2026!` |

The login page has one-click buttons for both. Public sign-up is disabled server-side.

---

## Features

### Authentication & roles
- **Convex Auth** (Password provider), client-side integration via `ConvexAuthProvider` — no middleware needed.
- Two roles stored on the `users` table: `admin` and `user`. Roles are derived **server-side** in every Convex function via `requireUser` / `requireAdmin` ([convex/lib/auth.ts](convex/lib/auth.ts)) — never trusted from the client.
- Sign-up flow is blocked in the Password provider's `profile()` callback except for the seeded demo accounts.

### Flexible, admin-editable schemas (the CMS)
- All five entity types — **contacts, organisations, gifts, pipeline prospects, deadlines** — live in a single generic `records` table with a JSON payload (`fields: v.record(v.string(), v.any())`).
- **Field definitions** (`fieldDefs` table) drive everything: input type, options, required/searchable flags, list badges, detail-panel grouping, and ordering.
- Supported field types: `text`, `textarea`, `number`, `currency`, `date`, `select`, `multiselect`, `relation` (links to another entity), `url`, `email`.
- **Promoted columns**: a field definition can map its value into an indexed column (`name`, `stage`, `status`, `amountMinor`, `dueAt`, `parentId`) via `systemMapping`, so flexible data stays queryable with real indexes.
- Single validated write path ([convex/lib/records.ts](convex/lib/records.ts)): unknown keys dropped, values type-checked against definitions, relations verified, search text rebuilt.
- **Admin → Entity fields** page: add/edit/delete/reorder fields per entity type; changes apply instantly to every user's forms and lists.

### Dashboard
- Stat cards (contacts, active pipeline, committed vs target, deadlines due).
- Cross-team flagged-contacts alert banner.
- Recent activity feed with team tags; pipeline-by-programme bars.
- **Open tasks** with a rich add dialog — title, due date, **team tag**, assignee, and a link to any record (contact/org/gift/prospect); overdue tasks highlighted; complete inline.

### Contacts & Organisations
- Master–detail with reactive **full-text search** (Convex search index).
- Contact detail: programme journey timeline, activity log (typed entries: note/call/email/meeting), relationship score, restricted badge, cross-team contact-check banner.
- One-click **flag** (cross-team check) and **restrict** toggles.
- Organisation detail: linked contacts, gifts from that funder, school data.
- Records are cross-linked via relation fields (contact ↔ organisation ↔ gift).

### Fundraising portal
- **Financial overview** — income by category vs target across six financial years, plus a Recharts committed-vs-target chart (target drawn as a dashed reference line).
- **Committed gifts** — full instalment table with stat cards and **CSV export**.
- **Pipeline** — 44 prospects, table and **kanban** views (columns derive from the stage field's options, so an admin can add a stage), CSV export.
- **Pipeline analysis** — prospects by stage, unweighted vs likelihood-weighted ask by stage (Recharts), RAG health breakdown, top open asks.
- **Deadlines** — overdue / 30-day / 90-day / completed buckets with type and lead filters.

### UX
- **⌘K / Ctrl+K global search** across all entity types (also a search button in the sidebar / mobile top bar).
- Fully responsive: drawer navigation and full-screen list⇄detail switching on mobile; horizontally scrollable tabs and tables.
- Skeleton loading states, staggered page-entrance animation (respects `prefers-reduced-motion`), toast feedback, colour-coded badge pills with stable per-value colours.

---

## Implementation

### Stack
- [Next.js 16](https://nextjs.org) (App Router, Turbopack, React 19 + React Compiler)
- [Convex](https://convex.dev) — database, functions, reactivity, full-text search
- [@convex-dev/auth](https://labs.convex.dev/auth) — Password provider
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) + [Recharts](https://recharts.org)

### Data model (`convex/schema.ts`)
| Table | Purpose |
| --- | --- |
| `users` | Convex Auth users + `role` (`admin`/`user`) and `team` |
| `entityTypes` | The five entity types (labels, system flag) |
| `fieldDefs` | Admin-managed field definitions per entity type |
| `records` | All domain records: JSON `fields` payload + promoted indexed columns + `searchText` search index |
| `activities` | Activity log / journey timeline entries, linked to records |
| `tasks` | Tasks with team tag, assignee, due date, optional record link |
| `targets` | Fundraising target per financial year |

Conventions: currency in **pence** (minor units), dates as ms epochs, `now` passed into queries as an argument (Convex queries don't read the clock).

### Backend (`convex/`)
- `records.ts` — generic CRUD engine: paginated `list`, search, `get` (resolves relations), `listChildren`, validated `create`/`update`, `setFlags`, admin-only `remove`.
- `entityFields.ts` — admin-only field-definition CRUD + reorder.
- `dashboard.ts` / `fundraising.ts` — aggregate queries (bounded reads; demo scale).
- `seed.ts` / `seedData.ts` — idempotent seeding: creates the demo accounts via `createAccount` and ~150 records mirroring the prototype. Run with:
  ```bash
  npx convex run seed:seedAll
  ```

### Frontend (feature-based)
```
src/
  app/                  # routes: login + (app)/{dashboard,contacts,organisations,fundraising,admin/fields}
  components/           # app shell (sidebar/drawer), ⌘K command palette, shadcn/ui
  features/
    records/            # the dynamic engine: FieldInput, FieldRenderer, RecordFormDialog,
                        # RecordListPanel, RecordDetailGroups, ActivityLog, badge pills
    dashboard/          # stat cards, task dialog
    contacts/ organisations/ fundraising/ admin-fields/
  lib/                  # formatting, CSV export
```
All app pages are client components behind a client auth guard; authorization is enforced in Convex functions regardless.

---

## Running locally

```bash
pnpm install
npx convex dev          # pushes schema/functions, writes .env.local
npx convex run seed:seedAll
pnpm dev
```

Requires the env vars `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` (created by `npx convex dev`). Convex Auth keys are set up with `npx @convex-dev/auth`.

## Deployment

Deployed on Vercel with a single env var, `NEXT_PUBLIC_CONVEX_URL`, pointing at the Convex deployment. Pushes to `main` auto-deploy. The demo intentionally runs against a **dev** Convex deployment; reset the data anytime with the seed command above.

> ⚠️ This is a demo: credentials are public and anyone with the URL can edit the data.
