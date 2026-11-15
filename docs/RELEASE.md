# Release and recovery notes

## Freight-only migration

The existing production deployment was exported with file storage before the migration. Backup location (outside Git):

`/Users/tom/.codex/backups/freight-20261115/pre-freight-only.zip`

SHA-256: `708c8aee99ae23e8954b500fa0b5b59f1a379ae862997ab785fabe1bb34b4da0`

ZIP integrity was verified. The snapshot contains 168 legacy domain records, two previous users, 16 freight companies, 26 quotations and 40 shipments. There were no stored files in this production snapshot. Treat the export as private because it includes authentication data.

The compatibility release adds account membership and assignments while retaining the legacy table definitions temporarily. Freight ownership uses existing indexed customer IDs, preserving freight record IDs and edits. New accounts are provisioned idempotently before the legacy accounts are retired. The bounded internal retirement mutation requires the verified backup digest and records a completion marker; repeated execution is a no-op. It deletes only the six retired domain tables and retired accounts/session credentials. The final release removes those schema definitions and the one-time migration module.

Do not run the old application seed. Do not restore the full export into an active deployment to recover a few records. Test restore into a separate deployment, verify counts and references, then choose a controlled recovery procedure. Before any production rollback, check compatibility between the deployed frontend, backend role model and current data; a Worker-only rollback to the old shared-access frontend is not an appropriate recovery.

## Release gates

Run lint, TypeScript, backend tests, the Next build, OpenNext build and Wrangler dry run. Exercise all three roles across two client companies, including cross-client ID access attempts, assignment changes, document upload/review, quote approval and invoice balances. Check keyboard navigation, console errors, responsive layouts and printable outputs.

After pushing `main`, monitor the GitHub Workers Builds check for that exact commit. Record the build UUID and Worker version. Request `/api/build-info` from the production domain and confirm its commit and build match the successful check. Verify login and the core client/platform flow against production before reporting success.

Keep the production route and Worker identity unchanged. Convex deploy keys stay in their matching Cloudflare build triggers, never runtime secrets. The backend deploy and idempotent initializer run before the Worker build. Ordinary releases never reset freight data.
