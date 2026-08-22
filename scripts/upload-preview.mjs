import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import process from "node:process";

const [workerName, configPath] = process.argv.slice(2);
if (!workerName) throw new Error("Worker name is required.");
const branch = process.env.WORKERS_CI_BRANCH;
if (!branch || branch === "main") throw new Error("WORKERS_CI_BRANCH must identify a non-main branch.");
const normalized = branch.normalize("NFKD").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "preview";
const maxAliasLength = 63 - workerName.length - 1;
const hash = createHash("sha256").update(branch).digest("hex").slice(0, 8);
const alias = normalized.length <= maxAliasLength ? normalized : `${normalized.slice(0, maxAliasLength - hash.length - 1).replace(/-$/, "")}-${hash}`;
const args = ["exec", "wrangler", "versions", "upload", "--preview-alias", alias];
if (configPath) args.push("--config", configPath);
process.stdout.write(`Uploading preview alias ${alias}-${workerName}.\n`);
const result = spawnSync("pnpm", args, { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
