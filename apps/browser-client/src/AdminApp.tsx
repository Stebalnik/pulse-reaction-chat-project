import { Activity, BarChart3, Bug, Database, Gauge, ShieldCheck, UsersRound } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import type { AdminSummary, ModerationReportQueueItem } from "@pulse-reaction/shared-schemas";
import { loadAdminSummary, loadModerationReports, resolveModerationReport } from "./api.js";
import { App as DebugApp } from "./prototype/App.js";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SynVibe";
const ADMIN_TOKEN_STORAGE_KEY = "synvibe.adminToken";

export function AdminApp(): JSX.Element {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [moderationReports, setModerationReports] = useState<ModerationReportQueueItem[]>([]);
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [activeAdminToken, setActiveAdminToken] = useState(() => window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "");
  const [adminTokenDraft, setAdminTokenDraft] = useState(() => window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? "");
  const [adminStatus, setAdminStatus] = useState<"loading" | "ready" | "auth_required" | "not_configured" | "offline">("loading");

  useEffect(() => {
    if (location.pathname.startsWith("/admin/debug")) return;
    void loadAdminSummary(activeAdminToken.trim() || null).then((result) => {
      if (result.status === "ok") {
        setSummary(result.summary);
        setAdminStatus("ready");
      } else {
        setSummary(null);
        setModerationReports([]);
        setAdminStatus(result.status);
      }
    });
    void loadModerationReports(activeAdminToken.trim() || null).then((result) => {
      if (result.status === "ok") setModerationReports(result.queue.reports);
    });
  }, [activeAdminToken]);

  if (location.pathname.startsWith("/admin/debug")) {
    return <DebugApp />;
  }

  const updateModerationStatus = async (reportId: string, status: "open" | "resolved" | "dismissed"): Promise<void> => {
    const updated = await resolveModerationReport(activeAdminToken.trim() || null, {
      reportId,
      status,
      ...(reviewerNotes[reportId]?.trim() ? { reviewerNotes: reviewerNotes[reportId]!.trim() } : {})
    });
    if (!updated) return;
    setModerationReports((current) => current.map((report) => (report.id === updated.id ? updated : report)));
  };

  return (
    <main className="adminShell">
      <header className="adminTopBar">
        <a className="publicBrand" href="/">
          <Activity aria-hidden="true" />
          <span>{APP_NAME} Admin</span>
        </a>
        <nav className="adminNav" aria-label="Admin navigation">
          <a href="/admin/debug">Debug console</a>
          <a href="/room">User room</a>
        </nav>
      </header>

      <section className="adminWorkspace">
        <div className="adminHero">
          <span className="productSignal">Internal operations</span>
          <h1>Platform control room</h1>
          <p>
            The live rPPG console is separated from the public user flow. This view reads privacy-safe operational metrics from
            the own-server backend when it is available.
          </p>
          <form
            className="adminTokenForm"
            onSubmit={(event) => {
              event.preventDefault();
              const nextToken = adminTokenDraft.trim();
              window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, nextToken);
              setActiveAdminToken(nextToken);
            }}
          >
            <label>
              Admin token
              <input
                value={adminTokenDraft}
                onChange={(event) => setAdminTokenDraft(event.target.value)}
                placeholder="Paste private token"
                type="password"
                autoComplete="off"
              />
            </label>
            <button className="primaryAction compact" type="submit">
              Unlock
            </button>
            <span>{adminStatusText(adminStatus)}</span>
          </form>
          <a className="primaryAction compact" href="/admin/debug">
            <Bug aria-hidden="true" />
            Open debug console
          </a>
        </div>

        <div className="adminGrid">
          <AdminCard icon={<UsersRound aria-hidden="true" />} label="Users" value={formatCount(summary?.registeredUsers)} detail={`${formatCount(summary?.guestUsers)} guests`} />
          <AdminCard
            icon={<Gauge aria-hidden="true" />}
            label="Experience"
            value={formatRate(summary?.cameraGrantRate)}
            detail={`${formatCount(summary?.roomStarts)} room starts`}
          />
          <AdminCard icon={<BarChart3 aria-hidden="true" />} label="Signals" value={formatNullableRate(summary?.sufficientSignalRatio)} detail={formatTopReasons(summary)} />
          <AdminCard
            icon={<Database aria-hidden="true" />}
            label="Safety"
            value={`${formatCount(summary?.reportCount)} / ${formatCount(summary?.blockCount)}`}
            detail={formatModerationReasons(summary)}
          />
          <AdminCard
            icon={<ShieldCheck aria-hidden="true" />}
            label="Matching"
            value={formatCount(summary?.activeMatches)}
            detail={`${formatCount(summary?.waitingUsers)} waiting; ${formatNullableRate(summary?.callSetupSuccessRate)} call setup`}
          />
          <AdminCard icon={<Bug aria-hidden="true" />} label="Events" value={formatCount(summary?.visits)} detail={`${formatCount(summary?.chatMessages)} chat messages`} />
        </div>

        <section className="moderationQueue" aria-label="Moderation queue">
          <div className="moderationQueueHeader">
            <span>Safety review</span>
            <strong>{formatCount(moderationReports.length)} recent</strong>
          </div>
          {moderationReports.length === 0 ? (
            <p>No report or block records yet.</p>
          ) : (
            <div className="moderationRows">
              {moderationReports.map((report) => (
                <article className="moderationRow" key={report.id}>
                  <div>
                    <span>
                      {report.type} / {report.status}
                    </span>
                    <strong>{report.reason}</strong>
                  </div>
                  <p>
                    {report.reporterLocalUserId} to {report.reportedLocalUserId ?? "unknown"}
                  </p>
                  <div className="moderationReviewControls">
                    <small>{report.notes || report.matchId || formatDateTime(report.createdAtIso)}</small>
                    {report.reviewerNotes && <small>Review: {report.reviewerNotes}</small>}
                    {report.resolvedAtIso && <small>{formatDateTime(report.resolvedAtIso)}</small>}
                    <textarea
                      value={reviewerNotes[report.id] ?? ""}
                      onChange={(event) => setReviewerNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                      placeholder="Reviewer note"
                      maxLength={500}
                    />
                    <div className="moderationReviewActions">
                      {report.status !== "resolved" && (
                        <button className="secondaryAction compact" type="button" onClick={() => void updateModerationStatus(report.id, "resolved")}>
                          Resolve
                        </button>
                      )}
                      {report.status !== "dismissed" && (
                        <button className="secondaryAction compact" type="button" onClick={() => void updateModerationStatus(report.id, "dismissed")}>
                          Dismiss
                        </button>
                      )}
                      {report.status !== "open" && (
                        <button className="secondaryAction compact" type="button" onClick={() => void updateModerationStatus(report.id, "open")}>
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function formatCount(value: number | undefined): string {
  return value === undefined ? "Pending" : new Intl.NumberFormat("en-US").format(value);
}

function formatRate(value: number | undefined): string {
  return value === undefined ? "Pending" : `${Math.round(value * 100)}%`;
}

function formatNullableRate(value: number | null | undefined): string {
  if (value === undefined) return "Pending";
  return value === null ? "No outputs" : `${Math.round(value * 100)}%`;
}

function formatTopReasons(summary: AdminSummary | null): string {
  const top = summary?.topRejectionReasons[0];
  return top ? `${top.reasonCode}: ${top.count}` : "No rejection reasons yet";
}

function formatModerationReasons(summary: AdminSummary | null): string {
  const top = summary?.topModerationReasons[0];
  return top ? `${top.reason}: ${top.count}` : "reports / blocks";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function adminStatusText(status: "loading" | "ready" | "auth_required" | "not_configured" | "offline"): string {
  if (status === "ready") return "Connected";
  if (status === "auth_required") return "Token required";
  if (status === "not_configured") return "Backend token not configured";
  if (status === "offline") return "Backend offline";
  return "Checking";
}

function AdminCard({ icon, label, value, detail }: { icon: JSX.Element; label: string; value: string; detail: string }): JSX.Element {
  return (
    <article className="adminCard">
      <div className="adminCardIcon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
