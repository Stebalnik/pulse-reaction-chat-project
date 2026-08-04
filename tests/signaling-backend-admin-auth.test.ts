import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { ModerationReportQueue, ModerationReportQueueItem } from "@pulse-reaction/shared-schemas";

test("admin API supports least-privilege summary and reviewer tokens", async () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-admin-auth-"));
  const port = 12_000 + Math.floor(Math.random() * 1_000);
  let server: ChildProcess | null = null;
  try {
    server = spawn(process.execPath, ["--import", "tsx", "apps/signaling-backend/src/server.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SIGNALING_PORT: String(port),
        SYNVIBE_DB_PATH: join(dir, "synvibe.sqlite"),
        SYNVIBE_ADMIN_TOKEN: "owner-secret",
        SYNVIBE_ADMIN_SUMMARY_TOKENS: "summary-secret",
        SYNVIBE_ADMIN_REVIEWER_TOKENS: "ops-alex:reviewer-secret,ops-riley:second-reviewer-secret"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    await waitForHealth(port, server);

    assert.equal(await status(port, "/api/admin/summary"), 401);
    assert.equal(await status(port, "/api/admin/summary", "summary-secret"), 200);
    assert.equal(await status(port, "/api/admin/summary", "reviewer-secret"), 403);
    assert.equal(await status(port, "/api/admin/moderation/reports", "summary-secret"), 403);
    assert.equal(await status(port, "/api/admin/moderation/reports", "reviewer-secret"), 200);
    assert.equal(await status(port, "/api/admin/moderation/reports", "owner-secret"), 200);

    await request(port, "/api/moderation/reports", {
      method: "POST",
      body: {
        localUserId: "SV-REPORT-000001",
        reportedLocalUserId: "SV-REPORT-000002",
        type: "report",
        reason: "spam"
      }
    });

    const queue = await request<ModerationReportQueue>(port, "/api/admin/moderation/reports", {
      adminToken: "reviewer-secret"
    });
    const reportId = queue.reports[0]?.id;
    assert.ok(reportId);

    assert.equal(
      await status(port, "/api/admin/moderation/reports/resolve", "reviewer-secret", {
        method: "POST",
        headers: { "x-synvibe-reviewer-id": "ops-riley" },
        body: { reportId, status: "resolved" }
      }),
      403
    );

    const resolved = await request<ModerationReportQueueItem>(port, "/api/admin/moderation/reports/resolve", {
      method: "POST",
      adminToken: "reviewer-secret",
      body: { reportId, status: "resolved", reviewerNotes: "Reviewed by scoped token" }
    });
    assert.equal(resolved.status, "resolved");
    assert.equal(resolved.reviewerId, "ops-alex");
    assert.equal(resolved.reviewerNotes, "Reviewed by scoped token");
  } finally {
    if (server) {
      server.kill("SIGTERM");
      await onceExit(server);
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test("profile API validates handles and returns conflicts without internal errors", async () => {
  const dir = mkdtempSync(join(tmpdir(), "synvibe-profile-api-"));
  const port = 13_000 + Math.floor(Math.random() * 1_000);
  let server: ChildProcess | null = null;
  try {
    server = spawn(process.execPath, ["--import", "tsx", "apps/signaling-backend/src/server.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SIGNALING_PORT: String(port),
        SYNVIBE_DB_PATH: join(dir, "synvibe.sqlite")
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    await waitForHealth(port, server);

    assert.equal(await status(port, "/api/profiles?localUserId=SV-PROFAPI-MISSING"), 204);

    assert.equal(
      await status(port, "/api/profiles", undefined, {
        method: "POST",
        body: { localUserId: "SV-PROFAPI-000001", displayName: "Jo", handle: "bad handle" }
      }),
      400
    );
    assert.equal(
      await status(port, "/api/profiles", undefined, {
        method: "POST",
        body: { localUserId: "SV-PROFAPI-000001", displayName: "Jo", handle: "jo_valid", languages: ["klingon"] }
      }),
      400
    );
    assert.equal(
      await status(port, "/api/profiles", undefined, {
        method: "POST",
        body: { localUserId: "SV-PROFAPI-000001", displayName: "Jo", handle: "@taken_name", languages: ["en"], matchIntent: "dating" }
      }),
      200
    );
    assert.equal(
      await status(port, "/api/profiles", undefined, {
        method: "POST",
        body: { localUserId: "SV-PROFAPI-000002", displayName: "Mo", handle: "taken_name" }
      }),
      409
    );
  } finally {
    if (server) {
      server.kill("SIGTERM");
      await onceExit(server);
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

async function waitForHealth(port: number, server: ChildProcess): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Server exited before health check with code ${server.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error("Timed out waiting for backend health");
}

async function status(
  port: number,
  path: string,
  adminToken?: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
): Promise<number> {
  const response = await rawRequest(port, path, {
    ...init,
    ...(adminToken ? { adminToken } : {})
  });
  return response.status;
}

async function request<T>(
  port: number,
  path: string,
  init: { method?: string; adminToken?: string; headers?: Record<string, string>; body?: unknown } = {}
): Promise<T> {
  const response = await rawRequest(port, path, init);
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return (await response.json()) as T;
}

async function rawRequest(
  port: number,
  path: string,
  init: { method?: string; adminToken?: string; headers?: Record<string, string>; body?: unknown }
): Promise<Response> {
  const requestInit: RequestInit = {
    method: init.method ?? "GET",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.adminToken ? { "x-synvibe-admin-token": init.adminToken } : {}),
      ...init.headers
    }
  };
  if (init.body) requestInit.body = JSON.stringify(init.body);
  return fetch(`http://127.0.0.1:${port}${path}`, requestInit);
}

async function onceExit(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  await new Promise<void>((resolve) => server.once("exit", () => resolve()));
}
