import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredPaths = [
  "AGENTS.md",
  "README.md",
  "docs/architecture/SYSTEM.md",
  "docs/architecture/TECH_STACK_DECISION.md",
  "docs/product/ROADMAP.md",
  "docs/product/REACTION_MODEL.md",
  "docs/safety/PRODUCT_GUARDRAILS.md",
  "docs/research/README.md",
  "knowledge/README.md",
  "knowledge/CLAIM_INDEX.md",
  "knowledge/METHOD_COMPARISON.md",
  "knowledge/EXPERIMENT_BACKLOG.md",
  "knowledge/claims/README.md",
  "knowledge/experiments/README.md",
  "knowledge/methods/README.md",
  "knowledge/papers/README.md",
  "schemas/hr-estimate.schema.json",
  "schemas/paper-record.schema.yaml",
  "docs/architecture/LOCAL_DEVELOPMENT.md",
  "docs/product/ONE_MONTH_LAUNCH_PLAN.md",
  "apps/desktop-client/package.json",
  "apps/browser-client/package.json",
  "apps/signaling-backend/package.json",
  "packages/shared-schemas/package.json",
  "packages/research-pipeline/package.json",
  ".env.example",
  ".github/ISSUES_PHASE_0_1.md",
  ".github/DRAFT_PR.md"
];

const forbiddenProductClaims = [
  /\b(reads?|detects?|recognizes?) emotions?\b/i,
  /\bdetects? attraction\b/i,
  /\bdetermines? attraction\b/i,
  /\btells? (?:if|whether) .*likes? you\b/i,
  /\btells? (?:if|whether) .*is lying\b/i,
  /\blie detector\b/i,
  /\bmind[- ]?reading\b/i,
  /\bmedical diagnosis\b/i
];

const guardrailSourceFiles = new Set([
  "AGENTS.md",
  "docs/safety/PRODUCT_GUARDRAILS.md"
]);

function fail(message) {
  console.error(`check-repo: ${message}`);
  process.exitCode = 1;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute);
    if ([".git", "node_modules", "dist", "build", "coverage", ".venv"].includes(entry.name)) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...await walk(absolute));
    } else if (/\.(md|json|ya?ml|mjs|ts)$/.test(entry.name)) {
      files.push(relative);
    }
  }
  return files;
}

for (const relativePath of requiredPaths) {
  if (!existsSync(path.join(root, relativePath))) {
    fail(`missing required path: ${relativePath}`);
  }
}

try {
  JSON.parse(await readFile(path.join(root, "schemas/hr-estimate.schema.json"), "utf8"));
  JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
} catch (error) {
  fail(`invalid JSON: ${error.message}`);
}

const paperSchema = await readFile(path.join(root, "schemas/paper-record.schema.yaml"), "utf8");
for (const token of ["schema_version:", "required_sections:", "evidence_labels:", "claim_status:"]) {
  if (!paperSchema.includes(token)) {
    fail(`paper-record schema missing token: ${token}`);
  }
}

const files = await walk(root);
for (const file of files) {
  const fullPath = path.join(root, file);
  const { size } = await stat(fullPath);
  if (size === 0 && !file.endsWith(".gitkeep")) {
    fail(`empty index/config file: ${file}`);
    continue;
  }
  if (guardrailSourceFiles.has(file)) {
    continue;
  }
  const text = await readFile(fullPath, "utf8");
  for (const pattern of forbiddenProductClaims) {
    if (pattern.test(text)) {
      fail(`unsupported product claim pattern ${pattern} found in ${file}`);
    }
  }
}

if (!process.exitCode) {
  console.log("check-repo: structure, schemas, and product-claim guardrails passed");
}
