import { Activity, BarChart3, Bug, Database, Gauge, ShieldCheck, UsersRound } from "lucide-react";
import type { JSX } from "react";
import { App as DebugApp } from "./prototype/App.js";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SynVibe";

export function AdminApp(): JSX.Element {
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
            The live rPPG console is now separated from the public user flow. Product analytics and server-side user/session
            storage will attach here as backend endpoints come online.
          </p>
          <a className="primaryAction compact" href="/admin/debug">
            <Bug aria-hidden="true" />
            Open debug console
          </a>
        </div>

        <div className="adminGrid">
          <AdminCard icon={<UsersRound aria-hidden="true" />} label="Users" value="Local ID MVP" detail="Server identity store pending" />
          <AdminCard icon={<Gauge aria-hidden="true" />} label="Experience" value="Room funnel" detail="Visits, starts, camera grants, exits" />
          <AdminCard icon={<BarChart3 aria-hidden="true" />} label="Signals" value="Quality analytics" detail="BPM validity, ROI, FPS, reason codes" />
          <AdminCard icon={<Database aria-hidden="true" />} label="Storage" value="Own server" detail="No external analytics database connected" />
          <AdminCard icon={<ShieldCheck aria-hidden="true" />} label="Privacy" value="Device-first" detail="Raw video and raw traces stay local by default" />
          <AdminCard icon={<Bug aria-hidden="true" />} label="Debug" value="Live console" detail="/admin/debug keeps current tools" />
        </div>
      </section>
    </main>
  );
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
