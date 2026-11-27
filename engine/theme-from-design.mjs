// theme-from-design.mjs — emit the runtime app's CSS theme from the SAME design slice the prototype
// was built from.
//
//   node theme-from-design.mjs <experience-spec.json> --out src/app-theme.css
//
// WHY: the starter ships a set of theme anchors and defaults to one of them. That default carries a
// decorative look the app never asked for — a four-colour aurora wash on the body, translucent
// blurred surfaces — and a hue from whichever anchor happened to be default. So a violet, flat,
// comfortable-density HR app rendered as a green glassy one, and the reviewer's reaction was the
// correct one: "this is different to the prototype screen ... there are unnecessary theme".
//
// The design slice (palette, radius, density, shell archetype) is already decided per app and is
// what the prototype rendered with. This turns it into a `:root` override loaded last, so the app's
// own identity wins over the anchor default. Nothing here invents design — it transcribes it.
//
// Emitted as plain CSS custom properties, because that is exactly how the starter is themed: every
// surface reads `var(--kf-body)`, `var(--kf-nav-bg)`, `hsl(var(--primary))` … with the decorative
// default only as a FALLBACK. Setting the variable removes the decoration by construction.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { emitHead } from "./design-language.mjs";
import { dirname } from "node:path";

/** `"265 70% 52%"` → usable as `hsl(var(--x))`; pass through anything already a colour. */
const isHslTriplet = (v) => /^\s*[\d.]+\s+[\d.]+%\s+[\d.]+%\s*$/.test(String(v || ""));

/**
 * The prototype's OWN `:root` token block, lifted from the same emitter that built the prototype
 * head. Transcribing a few colours by hand left the runtime subtly different — different canvas,
 * different border, different muted text — because the prototype derives a full 26-token palette
 * from the identity colours and the hand-copied version only carried five of them. Taking the block
 * itself means the two artifacts cannot drift: one function, one palette, both surfaces.
 */
// `@apply` de-sugaring. The prototype's blocks are `<style type="text/tailwindcss">`, processed by
// the browser Tailwind runtime, where `@apply bg-background` resolves. The app's app-theme.css is a
// STANDALONE file compiled by @tailwindcss/vite with no theme context, where the same line is a hard
// build error ("Cannot apply unknown utility class `bg-background`"). Scraping the blocks verbatim
// therefore emitted a stylesheet that could never build — the app's own theme file broke `npm run
// build`, which is why nothing downstream had ever consumed one. Expressed as plain CSS instead: it
// needs no Tailwind context and no `@reference` ordering, so it works in either host.
const APPLY_CSS = {
  "bg-background": "background-color: hsl(var(--background));",
  "text-foreground": "color: hsl(var(--foreground));",
  "font-sans": "font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);",
  antialiased: "-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;",
};

export function desugarApply(css) {
  const out = css.replace(/@apply\s+([^;}]+);/g, (m, utils) => {
    const parts = String(utils).trim().split(/\s+/);
    const unknown = parts.filter((u) => !(u in APPLY_CSS));
    // Loud, not lenient. A silently-passed-through `@apply` is a build break in the consuming app,
    // and the whole point of this file is that the reviewed prototype and the shipped app agree.
    if (unknown.length) {
      throw new Error(
        `theme-from-design: cannot de-sugar "@apply ${utils.trim()}" for a standalone stylesheet — ` +
        `no plain-CSS equivalent registered for: ${unknown.join(", ")}. ` +
        `Add it to APPLY_CSS in engine/theme-from-design.mjs (or stop emitting @apply from ` +
        `design-language.mjs), otherwise the generated app-theme.css will fail the app's build.`);
    }
    return parts.map((u) => APPLY_CSS[u]).join(" ");
  });
  if (/@apply\b/.test(out)) throw new Error("theme-from-design: @apply survived de-sugaring");
  return out;
}

export function prototypeTokens(design = {}) {
  const head = emitHead(design);
  // EVERY style block, not just the first `:root`. The emitter splits its output — identity tokens
  // in one block, the chart/category ramps and surface treatment in others — so taking a single
  // block silently dropped the chart palette and left `var(--chart-3)` undefined in the runtime
  // while the prototype rendered it fine. There is no "custom-UI theme": this IS the theme.
  const blocks = [...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1].trim()).join("\n\n");
  return blocks ? desugarApply(blocks) : null;
}

export function themeCss(design = {}) {
  const p = design.palette || {};
  const hue = p.neutralHue ?? (isHslTriplet(p.primary) ? parseFloat(String(p.primary)) : 220);
  const radius = design.shape?.radius || "12px";
  const density = design.density || "comfortable";
  // Density maps to the card padding the anchors already parameterise.
  const pad = density === "compact" ? "12px" : density === "cozy" ? "14px" : "18px";

  const lines = [
    "/* GENERATED by engine/theme-from-design.mjs — the app's own design language, not an anchor default.",
    "   Loaded last so it overrides the theme preset. Regenerate rather than hand-editing. */",
  ];

  // The complete token set the prototype renders with — same emitter, so the two are identical.
  const tokens = prototypeTokens(design);
  if (tokens) lines.push(tokens, "");

  lines.push(":root {");
  lines.push(`  --radius: ${radius};`);
  lines.push("");
  lines.push("  /* Surfaces, expressed in the SAME tokens the prototype paints with — not values");
  lines.push("     invented here. The starter's own defaults (an aurora wash, blurred glass) sit");
  lines.push("     behind these variables, so assigning them removes the decoration by construction. */");
  lines.push("  --kf-body: hsl(var(--background));");
  lines.push("  --kf-nav-bg: hsl(var(--sidebar));");
  lines.push("  --kf-nav-blur: none;");
  lines.push("  --kf-nav-border: hsl(var(--sidebar-border));");
  lines.push("  --kf-card-bg: hsl(var(--card));");
  lines.push("  --kf-card-border: hsl(var(--border));");
  lines.push("  --kf-card-shadow: var(--shadow-sm);");
  lines.push(`  --kf-card-radius: ${radius};`);
  lines.push(`  --kf-card-pad: ${pad};`);
  lines.push("}");
  lines.push("");
  // The body rule sets `background:` directly with the gradient as a fallback list, so a variable
  // alone cannot always win — restate it at the element the decoration is painted on.
  lines.push("body { background: var(--kf-body); background-attachment: fixed; }");
  lines.push(".sidebar { backdrop-filter: none; -webkit-backdrop-filter: none; }");

  // ── Parity with the prototype's own component conventions ──────────────────────────────────────
  // The primitives are shared by every generated app, so these are expressed as CSS here rather
  // than forked into the components. Each one is a place where the starter's house style differed
  // from the design the reviewer approved.
  lines.push(`
/* KPI: label above the number, as the prototype sets it. The component emits value-then-label, so
   flex order re-sequences it without touching markup every other app also renders. */
.kf-metric { justify-content: flex-start; }
.kf-metric-label { order: 1; font-size: 12.5px; font-weight: 500; color: hsl(var(--muted-foreground)); }
.kf-metric-value { order: 2; font-size: var(--text-kpi, 1.75rem); }
.kf-metric-sub { order: 3; }

/* Status pills: solid fill with white text. The starter's default is a tinted chip with a leading
   dot — a different visual language from the approved screen. */
.kf-pill { background: var(--kf-tone); color: #fff; }
.kf-pill::before { display: none; }

/* Panel: the title belongs INSIDE the card. The component renders the heading as a sibling above
   it, so promote the section to the card and let the inner panel go flat. */
.kf-panel-sec { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: var(--kf-card-pad, 18px); }
/* The inner panel must also drop its radius and clipping. With padding zeroed, content sits flush
   against the rounded corners and the top and bottom rows get shaved by the corner curve — which
   showed up as "Applied"/"Rejected" missing their first letter and their counts. */
.kf-panel-sec > .kf-panel { background: none; border: none; box-shadow: none; padding: 0; border-radius: 0; overflow: visible; }

/* Active nav item: the prototype fills it with the SIDEBAR's accent (bg-sidebar-accent), not the raw
   brand primary. On the default "light" sidebar tone the two happen to be equal (no visual change),
   but on a "brand" tone rail the sidebar itself IS the primary color, so filling the active item with
   --primary would make it disappear into its own background — same bug, same fix as design-language.mjs's
   NAV_ON, kept in parity here since this file re-derives the prototype's own component conventions. */
.nav-item.active { background: hsl(var(--sidebar-accent)); color: hsl(var(--primary-foreground)); }
.nav-item.active .nav-icon { color: hsl(var(--primary-foreground)); }`);
  return lines.join("\n") + "\n";
}

if (process.argv[1] && process.argv[1].endsWith("theme-from-design.mjs")) {
  const args = process.argv.slice(2);
  const specPath = args.find((a) => !a.startsWith("--"));
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  if (!specPath) { console.error("usage: theme-from-design.mjs <experience-spec.json> --out src/app-theme.css"); process.exit(2); }
  if (!existsSync(specPath)) { console.error(`no such file: ${specPath}`); process.exit(2); }

  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const design = spec.design || spec;
  if (!design.palette) {
    console.error("  ⚠ no design.palette in the spec — the app will fall back to the anchor default");
  }
  const out = flag("--out") || "src/app-theme.css";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, themeCss(design));
  console.log(`✓ ${design.name || "app"} theme (${design.palette?.primary || "no primary"}, r=${design.shape?.radius || "—"}, ${design.density || "—"}) → ${out}`);
}
