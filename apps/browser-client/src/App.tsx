import type { JSX } from "react";
import { AdminApp } from "./AdminApp.js";
import { PublicApp } from "./PublicApp.js";

export function App(): JSX.Element {
  return location.pathname.startsWith("/admin") ? <AdminApp /> : <PublicApp />;
}
