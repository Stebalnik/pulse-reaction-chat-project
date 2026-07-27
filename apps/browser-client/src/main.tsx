import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./prototype/App.js";
import "./prototype/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
