import { spawnSync } from "node:child_process";
import process from "node:process";
// Only the named, already-emptied legacy indexes are eligible for retirement.
// This does not exempt table/field/data deletions or any freight index changes.
export function verifiedLegacyIndexHeaders(lines, verify = verifyRetirement) {
  const allowed = new Set([
    "activities.by_recordId_and_happenedAt",
    "activities.by_happenedAt",
    "records.search_text",
    "records.by_entityTypeKey_and_flagged",
    "records.by_entityTypeKey",
    "records.by_entityTypeKey_and_stage",
    "records.by_entityTypeKey_and_dueAt",
    "records.by_entityTypeKey_and_parentId",
    "entityTypes.by_key",
    "fieldDefs.by_entityTypeKey_and_key",
    "fieldDefs.by_entityTypeKey_and_order",
    "tasks.by_done_and_dueAt",
    "targets.by_financialYear",
  ]);
  const headers = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (!/(?:Deleted|Would delete) table indexes:/.test(lines[i])) continue;
    const names = [];
    for (let j = i + 1; j < lines.length; j++) {
      const match = lines[j].match(/^\s*\[-\]\s+([a-zA-Z0-9_.]+)/);
      if (!match) break;
      names.push(match[1]);
    }
    if (names.length && names.every((name) => allowed.has(name)))
      headers.add(i);
  }
  if (!headers.size) return headers;
  if (!verify())
    throw new Error(
      "Legacy index removal requires the completed backup-verified migration and empty legacy tables.",
    );
  return headers;
}

function verifyRetirement() {
  const query =
    'const m=await ctx.db.query("platformMigrations").withIndex("by_key",q=>q.eq("key","freight-only-v2")).unique(); if(!m)return false; for(const table of ["records","activities","tasks","targets","fieldDefs","entityTypes"]) {if(await ctx.db.query(table).first())return false;} return true;';
  const result = spawnSync(
    "pnpm",
    ["exec", "convex", "run", "--codegen", "disable", "--inline-query", query],
    { cwd: process.cwd(), env: process.env, encoding: "utf8" },
  );
  return result.status === 0 && result.stdout.trim() === "true";
}
