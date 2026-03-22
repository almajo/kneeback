#!/usr/bin/env node
/**
 * Idempotent patch for expo-sqlite 16.x WorkerChannel.ts (web sync path).
 *
 * Bug 1 – length truncation: Uint8Array.set(Uint32Array, 0) only writes the
 *   low 8 bits of the length, so any sync result > 255 bytes gets truncated
 *   and JSON.parse throws "Unterminated string".
 *
 * Bug 2 – error serialization: Error objects JSON.stringify to {}, so the
 *   real SQLite error message is lost and callers see "Error: [object Object]".
 *
 * Both fixes are string replacements that are no-ops if already applied,
 * making this script safe to run on a cached node_modules.
 */

const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-sqlite",
  "web",
  "WorkerChannel.ts"
);

if (!fs.existsSync(filePath)) {
  console.log("patch-expo-sqlite: WorkerChannel.ts not found, skipping");
  process.exit(0);
}

let content = fs.readFileSync(filePath, "utf8");
let changed = false;

function replace(from, to) {
  if (content.includes(from)) {
    content = content.replace(from, to);
    changed = true;
  }
}

// Fix 1: write all 4 bytes of the length into the result buffer
replace(
  "resultArray.set(new Uint32Array([length]), 0);",
  "resultArray.set(new Uint8Array(new Uint32Array([length]).buffer), 0);"
);

// Fix 2: serialize error as a string so callers get the real message
replace(
  "const resultJson = error != null ? serialize({ error }) : serialize({ result });",
  "const resultJson = error != null ? serialize({ error: error.message }) : serialize({ result });"
);

if (changed) {
  fs.writeFileSync(filePath, content);
  console.log("patch-expo-sqlite: applied fixes to WorkerChannel.ts");
} else {
  console.log("patch-expo-sqlite: already patched, nothing to do");
}
