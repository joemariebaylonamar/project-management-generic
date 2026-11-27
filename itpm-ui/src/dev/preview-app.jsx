// DEV-ONLY: renders the app standalone (outside the Kissflow frame) with the
// preview SDK, so https://localhost:3002 shows real pages with real dev data.
// Mirrors KfApp's tree (SDK context → page-title context → MemoryRouter → layout)
// minus RouteSync, which needs the parent Kissflow window.
import { Suspense, useEffect, useMemo, useState } from "react";
import { MemoryRouter, useLocation, useNavigate, useRoutes } from "react-router-dom";
import { KfContext } from "/node_modules/@kissflow/app-core/dist/context.js";
import { PageTitleContext } from "/node_modules/@kissflow/app-core/dist/layout-context.js";

import schema from "../../lib/kf-schema.json";
import { createPreviewSdk, getPreviewRole, setPreviewRole } from "./preview-sdk.js";

const PREVIEW_ROLES = ["Project Manager", "Team Member", "Department Head", "Project Sponsor", "PSC Member", "Hub Administrator"];

function Routed({ routes }) {
  return useRoutes(routes);
}

// Keep the browser address bar in step with the in-memory route (so reload and
// deep links like /projects/abc?tab=gantt work in preview).
function UrlSync() {
  const loc = useLocation();
  const nav = useNavigate();
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    if (!booted) {
      const start = window.location.pathname + window.location.search;
      if (start !== "/" && start !== loc.pathname + loc.search) nav(start, { replace: true });
      setBooted(true);
      return;
    }
    const next = loc.pathname + loc.search;
    if (window.location.pathname + window.location.search !== next) window.history.replaceState(null, "", next);
  }, [loc, booted, nav]);
  return null;
}

function RoleSwitcher() {
  const [role, setRole] = useState(getPreviewRole());
  const roles = PREVIEW_ROLES.filter((r) => schema.roles?.some((x) => x.name === r));
  return (
    <div
      className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md"
      data-testid="preview-role-switcher"
    >
      <span className="rounded bg-primary px-1.5 py-0.5 font-semibold text-primary-foreground">Preview</span>
      <label className="text-muted-foreground" htmlFor="preview-role">
        Role
      </label>
      <select
        id="preview-role"
        className="rounded border border-input bg-background px-1.5 py-1 text-foreground"
        value={role}
        onChange={(e) => {
          setPreviewRole(e.target.value);
          setRole(e.target.value);
          window.location.reload();
        }}
      >
        {roles.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
    </div>
  );
}

function PreviewRoot({ routes, Layout }) {
  const [kf, setKf] = useState(null);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("");
  useEffect(() => {
    createPreviewSdk()
      .then((s) => {
        window.kf = s;
        setKf(s);
      })
      .catch((e) => setError(e));
  }, []);
  const kfValue = useMemo(() => ({ kf, ready: !!kf, error: !!error }), [kf, error]);
  const titleValue = useMemo(() => ({ title, setTitle }), [title]);

  if (error) return <div className="p-6 text-sm text-destructive">Preview could not reach Kissflow: {String(error.message)}</div>;
  if (!kf) return null;
  const content = (
    <Suspense fallback={null}>
      <Routed routes={routes} />
    </Suspense>
  );
  return (
    <KfContext.Provider value={kfValue}>
      <PageTitleContext.Provider value={titleValue}>
        <MemoryRouter>
          <UrlSync />
          {Layout ? <Layout>{content}</Layout> : content}
        </MemoryRouter>
        <RoleSwitcher />
      </PageTitleContext.Provider>
    </KfContext.Provider>
  );
}

export function renderPreview(root, routes, Layout) {
  root.render(<PreviewRoot routes={routes} Layout={Layout} />);
}
