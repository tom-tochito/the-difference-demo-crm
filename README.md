# Freight Operations

A freight intelligence and importer self-service demonstration built with Next.js, Convex and Cloudflare Workers. It connects cost comparisons, customer relationships and shipment operations while keeping client accounts isolated.

**Live:** https://the-difference-demo-crm.tochito.co.uk

The hostname and Cloudflare service name are retained infrastructure identifiers. The application is freight-only.

## Start locally

```bash
pnpm install --frozen-lockfile
pnpm exec convex dev --once
pnpm exec convex run platform:initialize
pnpm dev
```

Use Node 22.12+ and the locked pnpm dependencies. Convex writes the development deployment settings to `.env.local`; authentication keys must already be configured in that deployment. `platform:initialize` creates missing demo identities, assignments and savings fixtures without resetting existing freight edits.

## Explore the demo

Read [the ten-minute demo and product roadmap](docs/DEMO_GUIDE.md). The same guide is available inside the application at `/shipping/guide`.

| Account | Role | Workspace |
| --- | --- | --- |
| `superadmin@freight.example` | Superadmin | Entire platform |
| `admin@alder.example` | Admin | Alder & Finch |
| `logistics@alder.example` | User | Assigned Alder & Finch work |
| `documents@alder.example` | User | Assigned Alder & Finch work |
| `admin@northstar.example` | Admin | Northstar Ceramics |
| `logistics@northstar.example` | User | Assigned Northstar work |
| `documents@northstar.example` | User | Assigned Northstar work |

All demonstration accounts use `demo2026!`. Login shortcuts and a credential form are available. Public signup is disabled. Admin-created accounts must use fictional `.example` addresses; invitations send no email.

## Permissions and data

- Superadmins run platform operations, quotations, supplier economics, milestones, finance simulations, source refreshes and global reset.
- Client admins see their company's records, accept issued quotes, manage ordinary users and assign work.
- Users see assigned linked jobs, submit enquiries, upload files and complete tasks. Assigning an enquiry, quote or shipment grants visibility along that connected journey, not unrelated company records.
- Authorisation runs in Convex on every request. Client snapshots use explicit projections and exclude supplier costs, margins, internal activities and unshared attachments. Search uses the same company and job boundaries.
- Company IDs are the tenant keys. Existing indexed customer relationships define ownership; child documents and payments inherit it through their parent records. Assignments and user membership are indexed. There is no UI-controlled tenant override for client accounts.
- Sources are public fictional reference fixtures. Opportunities are company-specific. Comparisons retain their original source revision, baseline, currency and requested selling price. Accepted quotes remain locked and booking conversion is atomic/idempotent.
- Money uses integer minor units with GBP, EUR and USD kept separate. Gross margin is selling price less supplier costs, before overheads. Fees are already included in selling price. Customer logistics comparisons exclude goods, duties, taxes and insurance on both sides.
- Operational invoice revenue excludes drafts; receipts represent payments rather than extra revenue. Quote conversion is Won / (Won + Lost). On-time delivery compares actual delivery with the planned delivery target.

## Validation and deployment

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:worker
pnpm exec wrangler deploy --dry-run
```

Push `main` to trigger the existing Cloudflare production build. `scripts/deploy-hosted.mjs` deploys the production Convex backend, runs the idempotent platform initializer, then builds the Worker. Other branches use the shared development backend and preview versions. `wrangler.jsonc` is authoritative.

Keep each `CONVEX_DEPLOY_KEY` only in its matching build trigger, aligned with `NEXT_PUBLIC_CONVEX_URL`. Never add deployment keys to Worker runtime secrets. `/api/build-info` exposes the deployed commit SHA and build UUID for comparison with the GitHub Workers Builds check and reported Worker version.

## Boundaries

The demo contains 16 companies, 26 seeded quotations and 40 seeded shipments, plus any records created during use. It supports real persisted edits and uploads; rates, tracking events, booking confirmations, invoice sending and payment receipts are simulations. Generated documents carry **DEMO — NOT VALID FOR SHIPPING**.

Saved register views live on the device. Attachments accept PDF, PNG, JPEG or text up to 10 MB. Operations and client snapshots are bounded for demo scale (up to 2,000 domain records); a production service needs paginated, purpose-specific queries and managed file delivery. Storage URLs are bearer links, so do not share them outside their intended audience. All advertised demo credentials are public: use fictional information only.

Global reset requires superadmin access and typing `RESET SHIPPING`. It resets freight records, uploads, scenarios and source events, rebinds retained user identities to the seeded company records and restores initial work assignments. It never runs during ordinary deployment.

See [release and recovery notes](docs/RELEASE.md) for the migration backup and production verification procedure.
