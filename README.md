# The Difference — CRM Demo

A charity CRM demo built with **Next.js 16**, **Convex**, and **Convex Auth**, recreating the core screens of a design prototype. Its defining feature is a **CMS-style flexible schema**: every entity's fields are defined in the database by an admin, and forms, list columns, badges, detail panels, and search adapt instantly for every user.

**Live demo:** https://the-difference-demo-crm.tochito.co.uk

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

Cloudflare Workers Builds deploys `main` to the production Worker and every other branch to a branch preview version.

- Worker: `the-difference-demo-crm`
- Production: <https://the-difference-demo-crm.tochito.co.uk>
- Workers.dev: <https://the-difference-demo-crm.tom-b75.workers.dev>
- Hosted build: `pnpm run build:hosted`
- Production deploy: `pnpm exec wrangler deploy`
- Preview upload: `pnpm run upload:preview`

Production and preview use separate Convex deployments. Keep each deployment-scoped `CONVEX_DEPLOY_KEY` only in its matching Cloudflare build trigger and keep `NEXT_PUBLIC_CONVEX_URL` aligned with that deployment. The deploy key is never a Worker runtime secret. Reset demo data only in the intended backend with the seed command above.

> ⚠️ This is a demo: credentials are public and anyone with the URL can edit the data.

## Connected workspaces: Freight Operations

The app now has two equally prominent workspaces at `/workspaces`: **The Difference** (the original charity CRM) and **Freight Operations** (`/shipping`). The sidebar switcher remembers your choice on this device. Authentication is shared; operational records, search, tasks, activities and resets are separate. All existing charity routes and configurable fields remain available.

Freight Operations includes customer/contact management, enquiry and quotation pipelines, printable quotes, atomic acceptance and booking conversion, mode-specific shipment details, simulated tracking, export document checklists and attachments, tasks/exceptions, invoices/demo payments, reports, and an authenticated customer portal preview.

### Local setup

```bash
pnpm install --frozen-lockfile
pnpm exec convex dev --once
pnpm exec convex run shippingSeed:initialize
pnpm dev
```

Use the existing demo account buttons. `shippingSeed:initialize` is internal and idempotent: it populates a missing freight workspace and preserves edits on subsequent runs. The hosted build runs it after deploying Convex and before building the Worker. Do not run `seed:seedAll` to initialize freight: that command resets the **charity** demo.

The freight seed creates 16 fictional companies, 26 quotations and 40 shipments, plus connected contacts, enquiries, bookings, documents, tasks, exceptions, invoices and payments. Dates are relative to the time of initialization or reset. Administrators can reset freight from `/shipping/settings` by typing `RESET SHIPPING`; this removes freight edits and attachments, but preserves charity records and users.

### Five-minute walkthrough

1. **0:00–0:45 — Choose a workspace.** Sign in as Admin, choose Freight Operations, inspect dashboard counts and follow an attention card. Switch to The Difference to demonstrate that the charity CRM is still intact, then return.
2. **0:45–2:00 — Enquiry to shipment.** In Enquiries, search `ENQ-DEMO-START` for **Alder & Finch Exports**. Prepare a quote, edit its charge lines if desired, preview it, simulate sending, then **Accept & book**. Simulate booking confirmation and **Plan / open shipment**. Repeating conversion opens the same record.
3. **2:00–3:00 — Document and tracking operations.** Open `SHP-OCEAN-APPROVAL`, review the document warning and approve its draft bill of lading. Upload a sample PDF/image/text attachment if desired. Open `SHP-AIR-ARRIVAL`, inspect Tracking and simulate an update. Observe the shared status in the dashboard and customer profile.
4. **3:00–4:00 — Exceptions and finance.** Open `SHP-DELAY-FOLLOWUP`, complete the assigned follow-up task and resolve the exception with a note. Find `SHP-DELIVERED-DUE` and invoice `INV-00004`; record a partial demo payment and inspect the reduced balance.
5. **4:00–5:00 — Reports and customer view.** Compare GBP/EUR/USD reports separately. Open Customer preview, choose the relevant customer, look up a shipment and inspect its public updates. Internal notes, costs, margins and unshared documents are excluded from the portal query response.

### Demo behavior and limits

- Freight rates, carriers, tracking updates, invoice issue/send actions, booking confirmation and payments are simulations. No real emails, carrier requests, payments or customs filings occur.
- Currency amounts are integer minor units. Line totals round quantity × unit price to the nearest minor unit; invoice balances derive from payments. No FX conversion or tax determination is performed.
- Reports use the same records as the registers. Conversion = Won ÷ (Won + Lost). Revenue excludes draft invoices and uses issue month. Shipment volume uses departure month. On-time delivery compares actual delivery with the original planned delivery milestone.
- Quote acceptance freezes the quote and copies agreed charges into its booking. Repeated/concurrent enquiry, booking and shipment conversions return the existing result. Tracking requests include the expected current status, preventing retry-driven double advances. Demo payment request IDs prevent duplicate receipts.
- Requirements are configurable examples, not compliance advice. Generated documents are printable HTML with browser Save as PDF, always marked **DEMO — NOT VALID FOR SHIPPING**. Sample commercial invoices use recorded freight charges and are not valuations of goods. Seeded documents are demo records; uploaded files are real attachments stored in Convex (PDF, PNG, JPEG or plain text, up to 10 MB).
- The portal is an authenticated preview with a customer selector, not customer-specific access control or a public tracking service. Existing demo accounts can explore both workspaces.
- Saved shipment views are stored on the current device; all domain edits persist in Convex. The operations snapshot supports up to 2,000 records per domain table and fails explicitly rather than silently truncating financial totals. Activity shows the latest 200 entries; reset is restricted to a safe bounded demo size.

### Validation and release

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:worker
pnpm exec wrangler deploy --dry-run
```

Backend tests cover seed consistency/idempotency, concurrent conversion, tracking retries, payment validation and rounding, portal projection, document requirements, authentication and reset isolation. The test tooling requires Node 22.12+ (or a supported newer Node release).

Push `main` to use the existing Cloudflare production build. The hosted build deploys the matching production Convex backend first and initializes freight only if absent. Production remains `https://the-difference-demo-crm.tochito.co.uk`. `/api/build-info` exposes only the build UUID and commit SHA so the live release can be correlated with the GitHub Workers Builds check and its Worker version ID. Deployment keys remain in Cloudflare build triggers, never Worker runtime secrets.
