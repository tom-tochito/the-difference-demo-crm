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

## Verified cutover

The first release is commit `58cae8c9322c7d87459423162d934c49d1a82fc5`, Cloudflare build `58edc740-58ba-424b-9d8f-3bc9da72dc22`, Worker version `ce3f0902-1933-4c34-a3fb-2236b1643339`. The live build identity matched and superadmin login succeeded before retirement.

A second production snapshot was taken after the new backend stopped exposing the retired application, immediately before data removal:

`/Users/tom/.codex/backups/freight-20261115/cutover-before-retirement.zip`

SHA-256: `c6d8225298e7820b968bdc7c78bfa222693c08191b34094ec03b61fb7096aae8`

ZIP integrity was verified; it contains the 168 retired records, all 40 freight shipments, 26 quotations, 16 companies and nine accounts (seven new, two retired). Retirement then removed the old domain and two old identities, preserving the seven new accounts and all freight records. The final schema cleanup removes only the retired table definitions and indexes.

The deployment guard permits only the explicitly enumerated legacy index removals, and only when a read-only deployment query verifies the completed backup-acknowledged retirement marker and empty retired tables. It still rejects other destructive changes, including freight index removal. Three focused guard tests cover this exception and its refusal cases.

Validation includes 17 Convex tests and three deployment-guard tests. Browser checks cover client request → platform quote → client approval → booking → shipment → upload/review → invoice → partial payment, assignment inheritance, live source repricing with frozen snapshots, and mobile/tablet layout. Accessibility scans of the client overview and savings screens report zero violations. Five pre-existing lint warnings remain in generated files and the auth configuration; there are no lint errors.
