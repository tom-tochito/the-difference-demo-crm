<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Deployment

- Cloudflare Workers is the production runtime and `wrangler.jsonc` is the authoritative deployment configuration.
- `main` deploys the production Convex backend before the production Worker. Non-`main` branches deploy the shared development Convex backend before uploading preview versions.
- Keep deployment-scoped `CONVEX_DEPLOY_KEY` values only in their matching Cloudflare build triggers; never add them as Worker runtime secrets.
- Keep `NEXT_PUBLIC_CONVEX_URL` aligned with the deployment selected by the build key.
- Preserve the `the-difference-demo-crm.tochito.co.uk` production route.
- Run lint, the Next.js build, the OpenNext build, and a Wrangler dry run before deployment.
