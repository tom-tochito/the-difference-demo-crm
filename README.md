# Freight Operations

Next.js, Convex and Cloudflare Workers. Production: https://the-difference-demo-crm.tochito.co.uk

## Local development

Use Node 22.12+ and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm exec convex dev --once
pnpm exec convex run platform:initialize
pnpm dev
```

Convex supplies the development settings in `.env.local`; the deployment must have authentication configured. Initialization is idempotent and preserves existing edits. Use fictional data with the public demo accounts.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm build:worker
pnpm exec wrangler deploy --dry-run
```

## Deployment

Push `main` to trigger Cloudflare production deployment. The hosted script deploys Convex, initializes missing demo data, then builds the Worker. Other branches target the shared development backend and preview versions.

`wrangler.jsonc` owns the existing production route. Keep `CONVEX_DEPLOY_KEY` in its matching Cloudflare build trigger, never in Worker runtime secrets. `NEXT_PUBLIC_CONVEX_URL` must match that deployment; `SITE_URL` must match the production origin.

Verify the successful Workers Builds check for the exact commit and compare its commit/build identity with `/api/build-info`. Ordinary deployment must never reset data.
