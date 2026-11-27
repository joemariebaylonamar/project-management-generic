// theme-anchors.mjs — the 21 full-personality registry presets (reference/ui-themes.json, a FULL
// dump of rapp-ui-registry packages/themes/src/presets/*.ts — 70 tokens per light/dark mode, not the
// trimmed ~37-key agent/themes/*.md contract this file used to mirror) as DESIGN ANCHORS for
// kf-design-director. Each preset is a complete, vetted identity: light+dark oklch palettes,
// semantic colors, an 8-hue chart/category ramp, a heading/body font pairing, a 7-tier shadow scale,
// a spacing unit, a full type scale + weight/tracking/leading ladders, motion timing, a mono font,
// and border/ring widths. The director picks the best-fit ANCHOR for the app's domain, then varies
// it within the preset's grammar (accent hue, density, shell archetype) — the font pairing and
// radius character stay fixed, they ARE the personality. This supersedes saas-palettes.json (hex
// ramps only — no fonts, no dark mode, no chart ramps) as the design source.
//
// 2026-07-30: re-sourced from the full TS preset objects (via `bun`) after a spot-check found the
// old .md-mirror pipeline was silently dropping ~38 tokens per theme (shadow scale, spacing, full
// type/weight/tracking/leading scales, motion timing, mono font) and using the WRONG rung of the
// radius ladder (`rounded.md` instead of the preset's single `radius`, which the registry's own
// ThemeProvider maps to `--radius-lg`). See design-language.mjs for how these are now wired into CSS.
//
// CLI (agent-friendly — prints JSON):
//   node theme-anchors.mjs list                                   → id · fit one-liner per anchor
//   node theme-anchors.mjs pick "<use-case words>" [--exclude a,b] → best anchor + runners-up
//   node theme-anchors.mjs design <id> [--hue-shift N] [--density compact|comfortable|airy]
//        [--archetype rail-left|rail-dark|top-bar|rail-right] [--sidebar-tone light|brand|dark]
//        [--app-id slug] [--app-name name]                    → a complete `design` slice for
//                                                                  design-language.mjs#buildShell

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadAnchors() {
  return JSON.parse(readFileSync(join(HERE, "..", "reference", "ui-themes.json"), "utf8"));
}

// ── oklch → HSL (design-language.mjs consumes "H S% L%" triplets) ────────────────────────────────
function oklchToRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  let r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  const clamp = (c) => Math.min(1, Math.max(0, c));
  return [clamp(gamma(r)), clamp(gamma(g)), clamp(gamma(bl))];
}

export function oklchToHslParts(str) {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(str || "");
  if (!m) return null;
  const [r, g, b] = oklchToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60); if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}
const T = (p) => `${p.h} ${p.s}% ${p.l}%`;
const shiftHue = (p, deg) => ({ ...p, h: ((p.h + deg) % 360 + 360) % 360 });
// per-anchor sidebar-tone defaults — the anchor's OWN opinion of its rail, applied only when the
// caller doesn't pass an explicit sidebarTone (an explicit choice always wins). Enterprise's "calm,
// trustworthy admin/dashboard look" reads as a brand-colored rail by default (blue bg, white text);
// every other anchor keeps the "light" default until it earns its own entry here.
const DEFAULT_SIDEBAR_TONE = { enterprise: "brand" };
// Per-anchor shell archetype defaults — same override rule as sidebar tone (an explicit --archetype
// always wins). Checkpoint's identity IS its container (the floating rounded canvas + gradient hero
// band), so it defaults to the archetype built for it rather than the generic ops rail.
const DEFAULT_ARCHETYPE = { checkpoint: "hero-band" };
// raw oklch L (0–1), read straight off the source string — NOT the HSL-converted lightness. HSL's L
// is hue-dependent (the Helmholtz–Kohlrausch-adjacent distortion of max/min-channel averaging), so the
// SAME perceptual lightness lands anywhere from ~28 to ~68 on the 0–100 HSL scale depending on hue —
// oklch's L is the whole point of that color space: perceptually uniform across hues.
function oklchL(str) {
  const m = /oklch\(\s*([\d.]+)/.exec(str || "");
  return m ? parseFloat(m[1]) : null;
}

// ── preset → DesignLanguage slice ────────────────────────────────────────────────────────────────
// derive surface/density HINTS from the preset's own description — used only as a fallback for the
// two qualities the source doesn't encode as a literal token (surface treatment, density band).
// Shadow, motion and border/ring width now come from the preset's OWN authored values (below), not
// a guess — the previous version guessed all four from prose and silently ignored the real numbers.
function hints(desc = "") {
  const d = desc.toLowerCase();
  return {
    surface: d.includes("glass") ? "glass" : d.includes("floating") ? "elevated" : d.includes("flat") ? "flat" : "solid",
    density: /breathable|airy|spacious/.test(d) ? "airy" : /dense|compact|tight/.test(d) ? "compact" : "comfortable",
  };
}

// `default` is the one preset without the extended token set (spot-checked 2026-07-30 — it predates
// the shadow/spacing/type-scale/motion/mono fields other presets carry). Fall back to values that
// match this module's PRE-fix behaviour so it doesn't regress relative to before this change.
const EXT_FALLBACK = {
  "shadow-2xs": "0 1px 2px 0px rgb(0 0 0 / 0.05)", "shadow-xs": "0 1px 2px 0px rgb(0 0 0 / 0.05)",
  "shadow-sm": "0 1px 2px 0px rgb(0 0 0 / 0.04), 0 10px 26px -18px rgb(0 0 0 / 0.14)",
  "shadow-md": "0 2px 5px 0px rgb(0 0 0 / 0.06), 0 16px 32px -16px rgb(0 0 0 / 0.16)",
  "shadow-lg": "0 8px 24px -12px rgb(0 0 0 / 0.18)", "shadow-xl": "0 16px 40px -16px rgb(0 0 0 / 0.2)",
  "shadow-2xl": "0 24px 56px -20px rgb(0 0 0 / 0.24)",
  "border-width-medium": "1px", "ring-width": "2px", spacing: "0.25rem",
  "text-xs": "0.75rem", "text-sm": "0.875rem", "text-base": "1rem", "text-lg": "1.125rem",
  "text-xl": "1.25rem", "text-2xl": "1.5rem", "text-display": "2.5rem", "text-kpi": "1.75rem",
  "font-weight-normal": "400", "font-weight-medium": "500", "font-weight-semibold": "600",
  "font-weight-bold": "700", "font-weight-black": "800",
  "tracking-tighter": "-0.03em", "tracking-tight": "-0.015em", "tracking-normal": "0em",
  "tracking-wide": "0.02em", "tracking-wider": "0.04em", "tracking-widest": "0.08em",
  "leading-tight": "1.25", "leading-snug": "1.375", "leading-normal": "1.5",
  "leading-relaxed": "1.625", "leading-loose": "2",
  "default-transition-duration": "150ms", "default-transition-timing-function": "ease", "transition-duration-move": "200ms",
  "font-mono-var": '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

export function toDesignLanguage(preset, { hueShift = 0, density, archetype, sidebarTone, appId, appName } = {}) {
  // NEW schema (2026-07-30): preset.light / preset.dark are full self-contained palettes (colors +
  // shadow-* + spacing + text-* + font-weight-* + tracking-* + leading-* + transition-* + font-mono-var).
  // OLD schema (preset.colors, flat with "dark-" prefixed keys) is no longer produced by loadAnchors(),
  // but tolerate it here in case a caller passes a hand-built preset object.
  const L = preset.light || preset.colors || {};
  const D = preset.dark || {};
  const g = (k, fb) => (L[k] !== undefined ? L[k] : fb !== undefined ? fb : EXT_FALLBACK[k]);
  const o = (k) => oklchToHslParts(L[k]);
  const bg = o("background"), ink = o("foreground-ink"), surface = o("surface"), muted = o("muted");
  let primary = o("primary");
  if (hueShift) primary = shiftHue(primary, hueShift);
  // legibility guard, gated on the SOURCE's oklch L (not the HSL-converted `primary.l` — see oklchL
  // above). Every anchor in this catalog is coordinate-derived at oklch L≈0.56–0.623 specifically so
  // white text always works, by design — a THRESHOLD ON HSL LIGHTNESS broke that invariant for exactly
  // the hues where HSL's hue-dependent lightness reads highest (civic/console/enterprise/sentinel all
  // measured HSL L 59–68 off the identical oklch L=0.623 every other anchor also uses — user-reported,
  // 2026-07-30). 0.8 sits comfortably above the whole catalog's ceiling; this is a safety net for a
  // hypothetical future pale anchor, not a rule this catalog is expected to ever trip.
  const srcL = oklchL(L.primary);
  const primaryFg = srcL !== null && srcL > 0.8 ? `${primary.h} 30% 12%` : T(o("foreground-inverse") || { h: 0, s: 0, l: 100 });
  const mutedFg = { h: ink.h, s: Math.round(ink.s * 0.7), l: Math.round(ink.l + 0.3 * (surface.l - ink.l)) };
  const border = { h: bg.h, s: Math.min(bg.s, 15), l: Math.max(78, Math.min(92, bg.l - 7)) };
  const darkBg = D.background ? oklchToHslParts(D.background) : null;
  const h = hints(preset.description);

  // 8-hue chart/category ramp — pass through verbatim (as HSL) rather than deriving from primary;
  // NOT hue-shifted — the ramp's whole point is a fixed, mutually-distinguishable spread across the
  // wheel, so rotating it with the accent would undo that spread.
  const chart = {}, category = {};
  for (let i = 1; i <= 8; i++) {
    const c = o(`chart-${i}`), cat = o(`category-${i}`);
    if (c) chart[i] = T(c);
    if (cat) category[i] = T(cat);
  }

  // real weight numbers → the Google-Fonts query + Tailwind fontWeight scale (replaces the old
  // hardcoded [500,600,700]/[400,500,600,700] guess with the theme's OWN authored weights).
  const weightNums = {
    normal: parseInt(g("font-weight-normal"), 10) || 400, medium: parseInt(g("font-weight-medium"), 10) || 500,
    semibold: parseInt(g("font-weight-semibold"), 10) || 600, bold: parseInt(g("font-weight-bold"), 10) || 700,
    black: parseInt(g("font-weight-black"), 10) || 800,
  };
  const weightList = [...new Set(Object.values(weightNums))].sort((a, b) => a - b);

  // sidebar tone — ORTHOGONAL to shell.archetype (container shape); any archetype's aside reads these
  // same tokens. "light" (default, unchanged): white/surface rail, dark ink text — zero regression for
  // every existing caller. "brand": the rail itself is primary-colored (e.g. Enterprise's blue) with
  // primaryFg text, which is what "blue bg, white foreground" means for an anchor whose primary already
  // reads as blue. "dark": a neutral-dark rail with white text — the look `rail-dark`'s shell markup used
  // to hardcode via a raw --sidebar-dark inline style; now derivable for ANY archetype, not just that one.
  // An explicit sidebarTone always wins; otherwise fall back to the anchor's own default (DEFAULT_SIDEBAR_TONE),
  // then "light". fgIsLight tracks which branch of the primaryFg legibility guard fired above, so the
  // muted/border/accent sub-tokens tint toward white or toward black to match whichever foreground picked.
  const requestedTone = sidebarTone || DEFAULT_SIDEBAR_TONE[preset.id] || "light";
  const tone = requestedTone === "brand" || requestedTone === "dark" ? requestedTone : "light";
  const fgIsLight = primaryFg !== `${primary.h} 30% 12%`;
  // Deltas below are tuned (not guessed) against a WCAG relative-luminance contrast check run across
  // all 21 anchors' actual primary hues — HSL's hue-dependent luminance means a fixed lightness offset
  // that reads fine on one hue can be muddy or invisible on another, so these were picked as the
  // smallest deltas that clear real targets catalog-wide, not just for Enterprise's blue:
  //   sidebar-muted (secondary nav text) vs sidebar bg  → ≥ ~2.8:1 for all 21 (was 1.8–2.8 uncorrected)
  //   sidebar-accent (active-item chip) vs white text   → ≥ 5.3:1 for all 21 (was 1.9–3.3 uncorrected)
  // The accent chip goes DARKER than the rail (not lighter, as an earlier version had it) — for a white-
  // text chip that's the direction that improves BOTH the chip-vs-rail distinctness AND the label's own
  // legibility at once; lightening it does the opposite to the label. See fgIsLight:false below — the
  // dark-text (pale-anchor safety-net) branch mirrors the OLD, unverified direction: nothing in this
  // 21-anchor catalog trips it today (every anchor lands on white sidebar-foreground), so it's left
  // as-is rather than "fixed" without a real case to check it against.
  const sb = tone === "brand" ? {
    sidebar: T(primary), "sidebar-foreground": primaryFg,
    "sidebar-muted": fgIsLight
      ? T({ h: primary.h, s: Math.max(primary.s - 58, 10), l: Math.min(primary.l + 58, 91) })
      : T({ h: primary.h, s: Math.max(primary.s - 25, 10), l: Math.max(primary.l - 25, 8) }),
    "sidebar-border": T({ h: primary.h, s: primary.s, l: fgIsLight ? Math.min(primary.l + 10, 92) : Math.max(primary.l - 10, 6) }),
    "sidebar-accent": T({ h: primary.h, s: Math.min(primary.s + 5, 100), l: fgIsLight ? Math.max(primary.l - 14, 8) : Math.max(primary.l - 12, 20) }),
  } : tone === "dark" ? {
    sidebar: darkBg ? T(darkBg) : T({ h: ink.h, s: Math.min(ink.s, 20), l: 14 }),
    "sidebar-foreground": "0 0% 100%",
    "sidebar-muted": `${ink.h} 10% 68%`, "sidebar-border": `${ink.h} 15% 26%`,
    "sidebar-accent": T(primary),
  } : {
    // A preset may AUTHOR its sidebar colors (checkpoint: putty #f1efeb + #e6e4de hairline, straight
    // from its source design) — honored here; the derived surface/border pair stays the default for
    // the 21 anchors that don't.
    sidebar: L.sidebar ? T(o("sidebar")) : T(surface), "sidebar-foreground": T(ink),
    "sidebar-muted": T(mutedFg),
    "sidebar-border": L["sidebar-border"] ? T(o("sidebar-border")) : T(border),
    "sidebar-accent": T(primary),
  };

  return {
    id: appId || preset.id, name: appName || preset.name,
    anchorId: preset.id, anchorName: preset.name,
    palette: {
      background: T(bg), foreground: T(ink),
      card: T(surface), "card-foreground": T(ink),
      muted: T(muted), "muted-foreground": T(mutedFg),
      secondary: T(muted), "secondary-foreground": T(ink),
      accent: `${primary.h} ${Math.max(primary.s, 60)}% 95%`,
      "accent-foreground": `${primary.h} ${Math.min(Math.max(primary.s, 50), 80)}% ${Math.min(primary.l, 38)}%`,
      primary: T(primary), "primary-foreground": primaryFg,
      destructive: T(o("destructive")), "destructive-foreground": "0 0% 100%",
      success: T(o("success")), "success-foreground": "0 0% 100%",
      warning: T(o("warning")), "warning-foreground": `${o("warning").h} 40% 14%`,
      border: T(border), input: T(border), ring: T(primary),
      ...sb,
      sidebarDark: darkBg ? T(darkBg) : undefined,
      neutralHue: bg.h,
      chart, category,
    },
    type: {
      display: { family: preset.fonts?.heading || preset.typography?.heading?.fontFamily || "Inter", weights: weightList },
      body: { family: preset.fonts?.body || preset.typography?.body?.fontFamily || "Inter", weights: weightList },
      headWeight: weightNums.semibold,
      tracking: g("tracking-normal"),
      weights: weightNums,
      scale: {
        xs: g("text-xs"), sm: g("text-sm"), base: g("text-base"), lg: g("text-lg"),
        xl: g("text-xl"), "2xl": g("text-2xl"), display: g("text-display"), kpi: g("text-kpi"),
      },
      trackingScale: {
        tighter: g("tracking-tighter"), tight: g("tracking-tight"), normal: g("tracking-normal"),
        wide: g("tracking-wide"), wider: g("tracking-wider"), widest: g("tracking-widest"),
      },
      leadingScale: {
        tight: g("leading-tight"), snug: g("leading-snug"), normal: g("leading-normal"),
        relaxed: g("leading-relaxed"), loose: g("leading-loose"),
      },
      mono: g("font-mono-var"),
    },
    shape: {
      // preset.radius is the registry's single authored value (rem already) — the rung the
      // ThemeProvider maps to `--radius-lg`. The previous version read `rounded.md` (a smaller,
      // WRONG rung) off the old .md mirror; that field no longer exists on this schema.
      radius: preset.radius || "0.75rem",
      surface: h.surface,
      borderWidth: g("border-width-medium"),
      ringWidth: g("ring-width"),
      shadowScale: {
        "2xs": g("shadow-2xs"), xs: g("shadow-xs"), sm: g("shadow-sm"), md: g("shadow-md"),
        lg: g("shadow-lg"), xl: g("shadow-xl"), "2xl": g("shadow-2xl"),
      },
    },
    // GRADIENT tokens — new with the `checkpoint` anchor (2026-08-07). A preset may carry a
    // `gradients` map ({light:{hero,brand,success,review,danger,warning}, dark:{…}}) for looks the
    // flat token schema cannot express: a pastel hero wash, gradient status tints, a brand-mark
    // gradient. Passed through verbatim (light mode — the design slice is light-first, like the
    // palette above); design-language.mjs emits them as --grad-* CSS vars and paints the shell
    // header with --grad-hero when present. Anchors without the key are completely unaffected.
    ...(preset.gradients?.light ? { gradients: preset.gradients.light } : {}),
    spacingUnit: g("spacing"),
    motionTiming: {
      duration: g("default-transition-duration"), easing: g("default-transition-timing-function"),
      moveDuration: g("transition-duration-move"),
    },
    density: density || h.density,
    shell: { archetype: archetype || DEFAULT_ARCHETYPE[preset.id] || "rail-left", sidebarTone: tone },
    icons: "line",
  };
}

// ── curated fit vocabulary ───────────────────────────────────────────────────────────────────────
// The preset descriptions are upstream prose (a verbatim mirror of the rapp-ui-registry presets), so
// they only name the domains their authors happened to name. Food/hospitality is a hole: NOTHING in
// the 21 descriptions says food · restaurant · dining · cafe · meal, so a food-ordering app scored 0
// everywhere and fell through to `default`'s fallback prior. These keywords are OURS, they score
// ABOVE the description tail (4 vs 3) so curated intent beats incidental prose overlap — `atelier`'s
// literal "menus" must not tie with a deliberate food keyword. Add domains here, never to the mirror.
export const FIT_KEYWORDS = {
  checkpoint: "compliance register registers audit audits legal regulatory regulation governance policy permit hse signoff sign-off checkpoint",
  voyage:  "food ordering orders order delivery takeaway courier restaurant dining hospitality guest",
  atelier: "menu menus dining restaurant chef culinary bistro hospitality plating",
  school:  "canteen cafeteria meal meals lunch breakfast campus student",
  harvest: "kitchen catering grocery produce ingredients pantry supplier",
};

// ── domain scoring — the fit lives in each preset's description tail ("Insurance, claims and policy
// administration.", "Wellness, mindfulness and habit tracking.") + FIT_KEYWORDS above ─────────────
export function pickAnchor(useCaseWords, { exclude = [] } = {}) {
  const words = String(Array.isArray(useCaseWords) ? useCaseWords.join(" ") : useCaseWords)
    .toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
  const scored = loadAnchors().filter((p) => !exclude.includes(p.id)).map((p) => {
    const hay = `${p.name} ${p.description}`.toLowerCase();
    const kw = FIT_KEYWORDS[p.id] || "";
    let score = 0;
    for (const w of words) {
      if (kw.includes(w)) score += 4;                                                    // curated fit wins
      if (hay.includes(w)) score += hay.split("—").pop().includes(w) ? 3 : 1;            // fit sentence weighs more
    }
    if (p.id === "default") score += 0.25; // gentle safe-fallback prior
    return { id: p.id, name: p.name, score, fit: p.description.split("—").pop().trim() };
  }).sort((a, b) => b.score - a.score);
  return { best: scored[0], runnersUp: scored.slice(1, 4) };
}

// ── validate — the mechanical form of reference/THEME-AUTHORING.md ───────────────────────────────
// Generated themes get a pass/fail instead of trusting the generator: key-set completeness, oklch
// format, the primary-lightness guard, the brand-tone contrast floors (the same audit that caught
// the first sidebarTone formulas failing on 19 of 21 anchors), and gradient shape.
const COLOR_KEYS = [
  "background", "foreground-ink", "foreground-inverse", "static-light", "static-dark", "surface",
  "primary", "muted", "accent", "destructive", "success", "warning", "info", "ring",
  ...Array.from({ length: 8 }, (_, i) => [`chart-${i + 1}`, `category-${i + 1}`]).flat(),
];
const EXT_KEYS = Object.keys(EXT_FALLBACK);
const GRAD_KEYS = ["hero", "brand", "success", "review", "danger", "warning"];

// WCAG relative-luminance contrast on "H S% L%" triplets (the audit's math, in-process).
function tripletLum(t) {
  let [h, s, l] = String(t).split(/\s+/).map((x) => parseFloat(x));
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const seg = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const lin = (v) => { v += m; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(seg[0]) + 0.7152 * lin(seg[1]) + 0.0722 * lin(seg[2]);
}
const contrast = (a, b) => { const [x, y] = [tripletLum(a), tripletLum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

export function validateAnchor(preset) {
  const errs = [], warns = [];
  if (!preset.id || !/^[a-z][a-z0-9-]*$/.test(preset.id)) errs.push("id: missing or not a lowercase slug");
  if (!preset.name) errs.push("name: missing");
  if (!preset.description || preset.description.length < 60) errs.push("description: missing/too short — pick() scores against it");
  else if (!/[.!]\s*$/.test(preset.description.trim()) || preset.description.split(".").length < 2)
    warns.push("description: should END with a domain-fit sentence (drives pick() 3× tail weighting)");
  if (!preset.category) warns.push("category: missing");
  if (!/^[\d.]+rem$/.test(preset.radius || "")) errs.push(`radius: "${preset.radius}" — must be a single rem value`);
  if (!preset.fonts?.heading || !preset.fonts?.body) errs.push("fonts: heading and body required");

  for (const mode of ["light", "dark"]) {
    const M = preset[mode];
    if (!M || typeof M !== "object") { errs.push(`${mode}: block missing`); continue; }
    for (const k of COLOR_KEYS) {
      if (M[k] === undefined) { errs.push(`${mode}.${k}: missing`); continue; }
      if (!/^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+\s*\)$/.test(M[k])) errs.push(`${mode}.${k}: not "oklch(L C H)" — got "${String(M[k]).slice(0, 40)}"`);
    }
    for (const k of ["sidebar", "sidebar-border"]) // optional authored pair — both or neither
      if ((M.sidebar === undefined) !== (M["sidebar-border"] === undefined)) { warns.push(`${mode}: authored sidebar needs BOTH sidebar and sidebar-border`); break; }
    const missingExt = EXT_KEYS.filter((k) => M[k] === undefined);
    if (missingExt.length) warns.push(`${mode}: ${missingExt.length} extended token(s) missing (EXT_FALLBACK covers, but the theme loses its own personality): ${missingExt.slice(0, 5).join(", ")}${missingExt.length > 5 ? "…" : ""}`);
    const pL = oklchL(M.primary);
    if (pL !== null) {
      if (pL >= 0.8) errs.push(`${mode}.primary: oklch L ${pL} ≥ 0.8 — trips the dark-text guard; keep 0.45–0.72`);
      else if (mode === "light" && (pL < 0.45 || pL > 0.72)) warns.push(`${mode}.primary: oklch L ${pL} outside the catalog band 0.45–0.72 (ideal 0.53–0.63)`);
    }
    const wL = oklchL(M.warning);
    if (wL !== null && wL > 0.85) warns.push(`${mode}.warning: oklch L ${wL} — pale ambers defeat both light and dark foregrounds`);
    // chart ramp spread: eight hues should not collapse onto one
    const hues = Array.from({ length: 8 }, (_, i) => { const m = /oklch\([\d.]+\s+[\d.]+\s+([\d.]+)\)/.exec(M[`chart-${i + 1}`] || ""); return m ? parseFloat(m[1]) : null; }).filter((h) => h !== null);
    if (hues.length === 8 && new Set(hues.map((h) => Math.round(h / 30))).size < 4)
      warns.push(`${mode}: chart-1…8 span < 4 distinct 30° hue bands — the ramp exists to be mutually distinguishable`);
  }

  if (preset.gradients) {
    for (const mode of ["light", "dark"]) {
      const G = preset.gradients[mode];
      if (!G) { errs.push(`gradients.${mode}: missing — both modes required when gradients is present`); continue; }
      for (const k of Object.keys(G)) {
        if (!GRAD_KEYS.includes(k)) errs.push(`gradients.${mode}.${k}: unknown key (allowed: ${GRAD_KEYS.join(", ")})`);
        else if (!/gradient\(/.test(G[k])) errs.push(`gradients.${mode}.${k}: not a CSS gradient`);
      }
      if (!G.hero) warns.push(`gradients.${mode}.hero: missing — the header wash is the point of the system`);
    }
  }

  // derived-palette contrast floors — the failures that shipped once and were caught by screenshot
  try {
    for (const tone of ["light", "brand", "dark"]) {
      const dl = toDesignLanguage(preset, { sidebarTone: tone, appId: "t", appName: "T" });
      const p = dl.palette;
      // Floors calibrated against the 21 vetted upstream presets: button/chip labels are semibold
      // 13px+, where WCAG's UI-component standard is 3:1 — the catalog sits at 3.3–3.9 by design,
      // so 3.0 is the ERROR floor and 4.5 (AAA-ish body-text comfort) only warns. A 4.5 error floor
      // was tried first and failed 20 of 22 known-good anchors — a validator that flunks the vetted
      // catalog teaches authors to ignore it.
      const checks = [
        [`primary text (tone=${tone})`, contrast(p.primary, p["primary-foreground"]), 3.0, 4.5],
        [`sidebar-muted on rail (tone=${tone})`, contrast(p.sidebar, p["sidebar-muted"]), 2.5, 2.8],
      ];
      if (tone === "brand") checks.push(
        ["brand chip text", contrast(p["sidebar-accent"], p["primary-foreground"]), 3.0, 4.5],
        ["brand chip vs rail", contrast(p.sidebar, p["sidebar-accent"]), 1.3, 1.3]);
      for (const [what, got, floor, comfort] of checks) {
        if (got < floor) errs.push(`contrast: ${what} = ${got.toFixed(2)} (floor ${floor})`);
        else if (got < comfort && tone === "light") warns.push(`contrast: ${what} = ${got.toFixed(2)} (below comfort ${comfort})`);
      }
    }
  } catch (e) { errs.push(`derive: toDesignLanguage threw — ${e.message}`); }

  return { errs, warns };
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain) {
  const [cmd, arg, ...rest] = process.argv.slice(2);
  const flag = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
  if (cmd === "list") {
    for (const p of loadAnchors()) console.log(`${p.id.padEnd(11)} ${p.description}`);
  } else if (cmd === "pick") {
    const exclude = (flag("--exclude", "") || "").split(",").filter(Boolean);
    console.log(JSON.stringify(pickAnchor(arg, { exclude }), null, 2));
  } else if (cmd === "design") {
    const p = loadAnchors().find((x) => x.id === arg);
    if (!p) { console.error(`unknown anchor "${arg}" — run \`theme-anchors.mjs list\``); process.exit(1); }
    console.log(JSON.stringify(toDesignLanguage(p, {
      hueShift: parseFloat(flag("--hue-shift", "0")) || 0,
      density: flag("--density"), archetype: flag("--archetype"), sidebarTone: flag("--sidebar-tone"),
      appId: flag("--app-id"), appName: flag("--app-name"),
    }), null, 2));
  } else if (cmd === "validate") {
    const targets = arg === "--all" || !arg ? loadAnchors() : loadAnchors().filter((x) => x.id === arg);
    if (!targets.length) { console.error(`unknown anchor "${arg}"`); process.exit(1); }
    let failed = 0;
    for (const p of targets) {
      const { errs, warns } = validateAnchor(p);
      const verdict = errs.length ? "FAIL" : warns.length ? "PASS (warnings)" : "PASS";
      console.log(`${p.id.padEnd(12)} ${verdict}`);
      for (const e of errs) console.log(`  ✗ ${e}`);
      for (const w of warns) console.log(`  ⚠ ${w}`);
      if (errs.length) failed++;
    }
    if (targets.length > 1) console.log(`\n${targets.length - failed}/${targets.length} pass`);
    process.exit(failed ? 1 : 0);
  } else {
    console.error("usage: theme-anchors.mjs list | pick \"<use case>\" [--exclude a,b] | design <id> [--hue-shift N] [--density d] [--archetype a] [--sidebar-tone light|brand|dark] [--app-id s] [--app-name n] | validate <id>|--all");
    process.exit(2);
  }
}
