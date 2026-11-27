import { createRoot } from "react-dom/client";
import { KfApp } from "@kissflow/app-core";
import routes from "~react-pages";

import { AppShell } from "./components/app-shell.jsx";
import "./index.css";
// Loaded AFTER index.css so the accent presets win by source order.
import "./themes.css";
// App identity (BPI prototype) — loaded last so it wins.
import "./app-theme.css";

import { applyTheme, getTheme } from "./themes.js";

// Restore the chosen accent before first paint (default in themes.js).
applyTheme(getTheme());

const root = createRoot(document.getElementById("root"));
const framed = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

if (import.meta.env.DEV && !framed) {
  // Opened directly (not inside Kissflow): dev-only standalone preview with live dev data.
  import("./dev/preview-app.jsx").then(({ renderPreview }) => renderPreview(root, routes, AppShell));
} else {
  // AppShell is the persistent root layout (like Next's app/layout.tsx).
  root.render(<KfApp routes={routes} layout={AppShell} />);
}
