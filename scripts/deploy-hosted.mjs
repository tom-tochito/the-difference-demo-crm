import { spawnSync } from "node:child_process";
import { verifiedLegacyIndexHeaders } from "./legacy-index-guard.mjs";
import { createHash } from "node:crypto";
import process from "node:process";
import { URL } from "node:url";

const branch = process.env.WORKERS_CI_BRANCH;
process.env.NEXT_PUBLIC_BUILD_COMMIT = process.env.WORKERS_CI_COMMIT_SHA ?? "local";
process.env.NEXT_PUBLIC_BUILD_ID = process.env.WORKERS_CI_BUILD_UUID ?? "local";
const siteUrl = branch && branch !== "main"
  ? previewOrigin(branch, "the-difference-demo-crm")
  : requireOrigin("SITE_URL", process.env.SITE_URL);
process.env.SITE_URL = siteUrl;

const publicUrl = requireConvexUrl(
  "NEXT_PUBLIC_CONVEX_URL",
  process.env.NEXT_PUBLIC_CONVEX_URL,
  ".convex.cloud",
);

if (!process.env.CONVEX_DEPLOY_KEY) {
  throw new Error("CONVEX_DEPLOY_KEY is required for every hosted build.");
}
assertDeployKeyMatchesUrl(process.env.CONVEX_DEPLOY_KEY, publicUrl);
run("pnpm", ["exec", "convex", "env", "set", "SITE_URL", siteUrl]);
runConvexDryRun();
run("pnpm", [
  "exec",
  "convex",
  "deploy",
  "--typecheck",
  "try",
  "--codegen",
  "enable",
]);

run("pnpm", ["exec", "convex", "run", "platform:initialize"]);
run("pnpm", ["run", "build:worker"]);

function requireConvexUrl(name, value, suffix) {
  if (!value) {
    throw new Error(`${name} is required for hosted builds.`);
  }

  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !url.hostname.endsWith(suffix)
  ) {
    throw new Error(
      `${name} must be a credential-free Convex HTTPS origin ending in ${suffix}.`,
    );
  }

  return url;
}

function requireOrigin(name, value) {
  if (!value) throw new Error(`${name} is required for production builds.`);
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an exact HTTPS origin.`);
  }
  return url.origin;
}

function previewOrigin(previewBranch, workerName) {
  const normalized = previewBranch.normalize("NFKD").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "preview";
  const maxAliasLength = 63 - workerName.length - 1;
  const alias = normalized.length <= maxAliasLength ? normalized : `${normalized.slice(0, maxAliasLength - 9).replace(/-$/, "")}-${createHash("sha256").update(previewBranch).digest("hex").slice(0, 8)}`;
  return `https://${alias}-${workerName}.tom-b75.workers.dev`;
}

function assertDeployKeyMatchesUrl(deployKey, url) {
  const separator = deployKey.indexOf("|");
  const deploymentReference = separator === -1 ? "" : deployKey.slice(0, separator);
  const separatorIndex = deploymentReference.indexOf(":");
  const deploymentName =
    separatorIndex === -1 ? "" : deploymentReference.slice(separatorIndex + 1);
  const [urlDeploymentName] = url.hostname.split(".");

  if (!deploymentName || deploymentName !== urlDeploymentName) {
    throw new Error(
      "CONVEX_DEPLOY_KEY and NEXT_PUBLIC_CONVEX_URL target different deployments.",
    );
  }
}

function runConvexDryRun() {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "convex",
      "deploy",
      "--dry-run",
      "--typecheck",
      "try",
      "--codegen",
      "disable",
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
    },
  );

  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "");
  const lines = output.split("\n");
  const verifiedIndexHeaders = verifiedLegacyIndexHeaders(lines);
  const dangerousLines = lines
    .filter((_, index) => !verifiedIndexHeaders.has(index))
    .filter((line) => !/\bno destructive\b/i.test(line))
    .filter((line) =>
      /\b(?:delete|drop|remove)(?:d|s|ing)?\b.*\b(?:table|field|document|data)\b|\bdata loss\b|\bdestructive change\b/i.test(
        line,
      ),
    );

  if (dangerousLines.length > 0) {
    throw new Error(
      "Convex dry run reported a potentially destructive schema or table change; deployment stopped.",
    );
  }
}


function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
