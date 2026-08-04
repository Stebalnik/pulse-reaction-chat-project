import { Activity, BarChart3, Bug, Database, Gauge, ShieldCheck, UsersRound } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import type { AdminSummary } from "@pulse-reaction/shared-schemas";
import { loadAdminSummary } from "./api.js";
import { App as DebugApp } from "./prototype/App.js";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SynVibe";

export function AdminApp(): JSX.Element {
  const [summary, setSummary] = useState<AdminSummary | null>(null);

  useEffect(() => {
    if (location.pathname.startsWith("/admin/debug")) return;
    void loadAdminSummary().then(setSummary);
  }, []);

  if (location.pathname.startsWith("/admin/debug")) {
    return <DebugApp />;
  }

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
          <AdminCard icon={<Database aria-hidden="true" />} label="Storage" value="Own server" detail="No external analytics database connected" />
          <AdminCard
            icon={<ShieldCheck aria-hidden="true" />}
            label="Matching"
            value={formatCount(summary?.activeMatches)}
            detail={`${formatCount(summary?.waitingUsers)} waiting`}
          />
          <AdminCard icon={<Bug aria-hidden="true" />} label="Events" value={formatCount(summary?.visits)} detail={`${formatCount(summary?.activeSessions)} active sessions`} />
        </div>
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
