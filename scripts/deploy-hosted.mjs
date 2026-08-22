import { spawnSync } from "node:child_process";
import process from "node:process";
import { URL } from "node:url";

const publicUrl = requireConvexUrl(
  "NEXT_PUBLIC_CONVEX_URL",
  process.env.NEXT_PUBLIC_CONVEX_URL,
  ".convex.cloud",
);

if (process.env.CONVEX_DEPLOY_KEY) {
  assertDeployKeyMatchesUrl(process.env.CONVEX_DEPLOY_KEY, publicUrl);
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
} else {
  process.stdout.write(
    "CONVEX_DEPLOY_KEY is not available; building the Worker without deploying Convex.\n",
  );
}

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

  const dangerousLines = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    .split("\n")
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
