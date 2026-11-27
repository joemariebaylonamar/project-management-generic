// design-language.mjs — turn a per-app DESIGN LANGUAGE (derived from the use case by kf-design-director)
// into a COMPLETE prototype shell: fonts, palette, shape, surface treatment AND container/layout
// archetype. Today every app reuses proto-kit/shadcn-shell.html — same Inter, same violet, same
// sidebar+main layout; only accent colours vary. This module regenerates the whole shell per app so a
// bank, a clinic and a creative studio look like different products, not reskins of one template.
//
// A DesignLanguage (the `design` slice kf-design-director emits) has this shape — every field grounded
// in the domain, never a generic default:
//   {
//     id, name, rationale,                       // why these choices fit THIS domain
//     palette: { <token>: "H S% L%", …, chart:{1..8}, category:{1..8} },  // see TOKENS
//     type: { display:{family,weights}, body:{family,weights}, headWeight, tracking, mono,
//             scale:{xs..2xl,display,kpi}, weights:{normal..black}, trackingScale:{...}, leadingScale:{...} },
//     shape: { radius:"0.75rem", borderWidth:"1px", ringWidth:"2px", surface:"solid|flat|elevated|glass",
//              shadowScale:{2xs,xs,sm,md,lg,xl,2xl} },
//     spacingUnit: "0.25rem", motionTiming: { duration, easing, moveDuration },
//     density: "compact|comfortable|airy",
//     shell:  { archetype:"rail-left|rail-dark|top-bar|rail-right", framing:"full-bleed|rounded-canvas", sidebarTone:"light|dark|brand" },
//     icons:  "line|solid|duotone",
//   }
// Only `palette.primary` + `type` + `shape` + `shell.archetype` are strictly required; the rest fall
// back to sensible, still-domain-neutral defaults so a partial slice never crashes the build (this is
// what lets an OLD design slice — one written before 2026-07-30, missing shadowScale/spacingUnit/the
// type ladders/motionTiming — still render instead of breaking; see DEFAULT_EXT below).

// Fallback values for the extended tokens (shadow scale, spacing unit, type ladders, motion timing,
// mono font) when a design slice predates them or a caller hand-builds a minimal `dl`. Matches this
// module's pre-2026-07-30 behaviour as closely as possible so old runs don't visibly regress.
const DEFAULT_EXT = {
  shadowScale: {
    "2xs": "0 1px 2px hsl(var(--foreground) / 0.06)", xs: "0 1px 2px hsl(var(--foreground) / 0.06)",
    sm: "0 1px 2px hsl(var(--foreground) / 0.04), 0 10px 26px -18px hsl(var(--foreground) / 0.14)",
    md: "0 2px 5px hsl(var(--foreground) / 0.05), 0 16px 32px -16px hsl(var(--foreground) / 0.16)",
    lg: "0 8px 24px -12px hsl(var(--foreground) / 0.18)", xl: "0 16px 40px -16px hsl(var(--foreground) / 0.2)",
    "2xl": "0 24px 56px -20px hsl(var(--foreground) / 0.24)",
  },
  spacingUnit: "0.25rem",
  scale: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", display: "2.5rem", kpi: "1.75rem" },
  weights: { normal: 400, medium: 500, semibold: 600, bold: 700, black: 800 },
  trackingScale: { tighter: "-0.03em", tight: "-0.015em", normal: "0em", wide: "0.02em", wider: "0.04em", widest: "0.08em" },
  leadingScale: { tight: "1.25", snug: "1.375", normal: "1.5", relaxed: "1.625", loose: "2" },
  motionTiming: { duration: "150ms", easing: "ease", moveDuration: "200ms" },
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  borderWidth: "1px", ringWidth: "2px",
};
// Tailwind's own numeric spacing scale (utility-number → multiplier of the base unit) — every
// gap-*/p-*/m-*/w-*/h-* class already used across every part is one of these keys, so remapping the
// theme scale here re-themes them with ZERO markup changes (same trick as the borderRadius remap).
const SPACING_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];

const TOKENS = [
  "background", "foreground", "card", "card-foreground", "muted", "muted-foreground",
  "secondary", "secondary-foreground", "accent", "accent-foreground", "primary", "primary-foreground",
  "destructive", "destructive-foreground", "success", "success-foreground", "warning", "warning-foreground",
  "border", "input", "ring", "sidebar", "sidebar-foreground", "sidebar-muted", "sidebar-border", "sidebar-accent",
];
// derive a coherent full palette from a minimal one (primary + a neutral hue), so kf-design-director can
// emit just the identity colours and get a complete, legible token set.
function fullPalette(p = {}) {
  const primary = p.primary || "258 84% 58%";
  const [ph] = primary.split(" ");
  const nh = p.neutralHue != null ? p.neutralHue : 230; // neutral hue bias toward the accent reads "chosen"
  const d = {
    background: `${nh} 20% 99%`, foreground: `${nh} 12% 12%`,
    card: "0 0% 100%", "card-foreground": `${nh} 12% 12%`,
    muted: `${nh} 12% 96%`, "muted-foreground": `${nh} 6% 45%`,
    secondary: `${nh} 12% 96%`, "secondary-foreground": `${nh} 10% 22%`,
    accent: `${ph} 90% 96%`, "accent-foreground": `${ph} 70% 38%`,
    primary, "primary-foreground": "0 0% 100%",
    destructive: "0 74% 54%", "destructive-foreground": "0 0% 100%",
    success: "152 58% 40%", "success-foreground": "0 0% 100%",
    warning: "36 92% 46%", "warning-foreground": "0 0% 100%",
    border: `${nh} 13% 90%`, input: `${nh} 13% 90%`, ring: primary,
    sidebar: "0 0% 100%", "sidebar-foreground": `${nh} 22% 18%`,
    "sidebar-muted": `${nh} 9% 46%`, "sidebar-border": `${nh} 13% 91%`, "sidebar-accent": primary,
  };
  return { ...d, ...p }; // caller overrides win
}

// Google-Fonts family → CSS query. weights default to a full display+body ramp.
const fontLink = (fam, weights) => fam
  ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, "+")}:wght@${(weights || [400, 500, 600, 700, 800]).join(";")}&display=swap`
  : null;

// Surface treatment → the CSS recipe applied to .card / bg-card so "glass" vs "flat" vs "elevated"
// actually looks different, not just a shadow tweak. The shadow itself now comes from the theme's
// OWN authored `--shadow-sm`/`--shadow-md` (real per-theme values — see DEFAULT_EXT/shadowScale)
// rather than one of 4 generic hardcoded recipes shared by every theme that happened to guess the
// same word.
function surfaceCSS(shape = {}) {
  const s = shape.surface || "solid";
  const bw = shape.borderWidth || DEFAULT_EXT.borderWidth;
  const recipes = {
    solid: `background: hsl(var(--card)); border: ${bw} solid hsl(var(--border)); box-shadow: var(--shadow-sm);`,
    flat: `background: hsl(var(--card)); border: ${bw} solid hsl(var(--border)); box-shadow: none;`,
    elevated: `background: hsl(var(--card)); border: ${bw === "0px" ? "none" : `${bw} solid hsl(var(--border))`}; box-shadow: var(--shadow-md);`,
    glass: `background: hsl(var(--card) / 0.7); backdrop-filter: blur(14px) saturate(160%); border: 1px solid hsl(0 0% 100% / 0.5); box-shadow: var(--shadow-sm);`,
  };
  return recipes[s] || recipes.solid;
}

// Build the <head> style/config: fonts + full :root token block + shape/surface bridge. This replaces
// the shell's hardcoded Inter link, tailwind fontFamily, :root block, and card recipe.
export function emitHead(dl = {}) {
  const pal = fullPalette(dl.palette);
  const t = dl.type || {};
  const shape = dl.shape || {};
  const disp = t.display || {}; const body = t.body || {};
  const dispFam = disp.family || "Inter"; const bodyFam = body.family || dispFam;
  const links = [fontLink(dispFam, disp.weights), dispFam !== bodyFam ? fontLink(bodyFam, body.weights) : null].filter(Boolean);
  const radius = shape.radius || "0.75rem";
  const pad = { compact: "0.75rem", comfortable: "1rem", airy: "1.5rem" }[dl.density || "comfortable"];
  const rootVars = TOKENS.map((k) => `--${k}: ${pal[k]};`).join(" ");
  // chart/category ramp → --chart-1.. / --category-1.. CSS vars (raw HSL, unprefixed by fullPalette
  // since they're app-specific, not part of the base shadcn TOKENS list).
  const chart = pal.chart || {}, category = pal.category || {};
  const chartVars = Array.from({ length: 8 }, (_, i) => i + 1)
    .map((i) => `${chart[i] ? `--chart-${i}: ${chart[i]};` : ""}${category[i] ? ` --category-${i}: ${category[i]};` : ""}`).join(" ");
  // extended personality tokens (shadow scale, spacing unit, type ladders, motion timing, mono font) —
  // merged over DEFAULT_EXT so an old/partial design slice still renders instead of breaking.
  const shadowScale = { ...DEFAULT_EXT.shadowScale, ...(shape.shadowScale || {}) };
  const scale = { ...DEFAULT_EXT.scale, ...(t.scale || {}) };
  const weights = { ...DEFAULT_EXT.weights, ...(t.weights || {}) };
  const tracking = { ...DEFAULT_EXT.trackingScale, ...(t.trackingScale || {}) };
  const leading = { ...DEFAULT_EXT.leadingScale, ...(t.leadingScale || {}) };
  const motion = { ...DEFAULT_EXT.motionTiming, ...(dl.motionTiming || {}) };
  const spacingUnit = dl.spacingUnit || DEFAULT_EXT.spacingUnit;
  const monoFont = t.mono || DEFAULT_EXT.mono;
  const borderWidth = shape.borderWidth || DEFAULT_EXT.borderWidth;
  const ringWidth = shape.ringWidth || DEFAULT_EXT.ringWidth;
  // GRADIENT tokens (2026-08-07, first carrier: the `checkpoint` anchor) — looks the flat palette
  // cannot express: a pastel hero wash, gradient status tints, a brand-mark gradient. Emitted as
  // --grad-* vars so parts/kit recipes (and the runtime app via theme-from-design.mjs, which lifts
  // these same blocks) can paint with them; the shell header rule below uses --grad-hero directly.
  const grads = dl.gradients || {};
  const gradVars = Object.entries(grads).map(([k, v]) => `--grad-${k}: ${v};`).join(" ");
  const extVars = [
    ...Object.entries(shadowScale).map(([k, v]) => `--shadow-${k}: ${v};`),
    `--spacing-unit: ${spacingUnit};`,
    ...Object.entries(scale).map(([k, v]) => `--text-${k}: ${v};`),
    ...Object.entries(weights).map(([k, v]) => `--font-weight-${k}: ${v};`),
    ...Object.entries(tracking).map(([k, v]) => `--tracking-${k}: ${v};`),
    ...Object.entries(leading).map(([k, v]) => `--leading-${k}: ${v};`),
    `--motion-duration: ${motion.duration}; --motion-easing: ${motion.easing}; --motion-move-duration: ${motion.moveDuration};`,
    `--font-mono: ${monoFont};`,
    `--border-width: ${borderWidth}; --ring-width: ${ringWidth};`,
    gradVars,
  ].filter(Boolean).join(" ");
  // Tailwind's default numeric spacing scale is `n * 0.25rem` per utility number n (p-4 = 1rem); every
  // gap-*/p-*/m-*/w-*/h-* class already used across every part is one of these keys, so remapping the
  // SAME keys to `n * var(--spacing-unit)` re-themes them all with zero markup changes.
  const spacingConfig = SPACING_STEPS.map((n) => `"${n}": "calc(${n} * var(--spacing-unit))"`).join(", ");
  return `
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${links.map((h) => `<link href="${h}" rel="stylesheet">`).join("\n")}
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = { theme: { extend: {
  fontFamily: { sans: ["${bodyFam}", "ui-sans-serif", "system-ui"], display: ["${dispFam}", "ui-sans-serif", "system-ui"], mono: ["var(--font-mono)", "ui-monospace", "monospace"] },
  colors: {
    border: "hsl(var(--border))", input: "hsl(var(--input))", ring: "hsl(var(--ring))",
    background: "hsl(var(--background))", foreground: "hsl(var(--foreground))",
    primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
    secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
    muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
    accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
    card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
    destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
    success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
    warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
    sidebar: { DEFAULT: "hsl(var(--sidebar))", foreground: "hsl(var(--sidebar-foreground))", muted: "hsl(var(--sidebar-muted))", border: "hsl(var(--sidebar-border))", accent: "hsl(var(--sidebar-accent))" },
    chart1: "hsl(var(--chart-1))", chart2: "hsl(var(--chart-2))", chart3: "hsl(var(--chart-3))", chart4: "hsl(var(--chart-4))",
    chart5: "hsl(var(--chart-5))", chart6: "hsl(var(--chart-6))", chart7: "hsl(var(--chart-7))", chart8: "hsl(var(--chart-8))",
    category1: "hsl(var(--category-1))", category2: "hsl(var(--category-2))", category3: "hsl(var(--category-3))", category4: "hsl(var(--category-4))",
    category5: "hsl(var(--category-5))", category6: "hsl(var(--category-6))", category7: "hsl(var(--category-7))", category8: "hsl(var(--category-8))",
  },
  borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 4px)", sm: "calc(var(--radius) - 8px)", xl: "calc(var(--radius) + 4px)", "2xl": "calc(var(--radius) + 8px)", full: "9999px" },
  boxShadow: { "2xs": "var(--shadow-2xs)", xs: "var(--shadow-xs)", sm: "var(--shadow-sm)", DEFAULT: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)", xl: "var(--shadow-xl)", "2xl": "var(--shadow-2xl)", none: "none" },
  spacing: { ${spacingConfig} },
  fontSize: { xs: "var(--text-xs)", sm: "var(--text-sm)", base: "var(--text-base)", lg: "var(--text-lg)", xl: "var(--text-xl)", "2xl": "var(--text-2xl)", display: "var(--text-display)", kpi: "var(--text-kpi)" },
  fontWeight: { normal: "var(--font-weight-normal)", medium: "var(--font-weight-medium)", semibold: "var(--font-weight-semibold)", bold: "var(--font-weight-bold)", black: "var(--font-weight-black)" },
  letterSpacing: { tighter: "var(--tracking-tighter)", tight: "var(--tracking-tight)", normal: "var(--tracking-normal)", wide: "var(--tracking-wide)", wider: "var(--tracking-wider)", widest: "var(--tracking-widest)" },
  lineHeight: { tight: "var(--leading-tight)", snug: "var(--leading-snug)", normal: "var(--leading-normal)", relaxed: "var(--leading-relaxed)", loose: "var(--leading-loose)" },
  ringWidth: { DEFAULT: "var(--ring-width)", 2: "var(--ring-width)" },
  transitionDuration: { DEFAULT: "var(--motion-duration)" },
  transitionTimingFunction: { DEFAULT: "var(--motion-easing)" },
}}};
</script>
<style type="text/tailwindcss">
:root { ${rootVars} ${chartVars} --radius: ${radius}; --kf-pad: ${pad};${pal.sidebarDark ? ` --sidebar-dark: ${pal.sidebarDark};` : ""} ${extVars} }
body { @apply bg-background text-foreground font-sans antialiased; font-size: 14.5px; letter-spacing: var(--tracking-normal); }
h1,h2,h3,.font-display { font-family: "${dispFam}", ui-sans-serif, system-ui; font-weight: var(--font-weight-bold); letter-spacing: var(--tracking-tight); }
/* surface treatment — "${(dl.shape && dl.shape.surface) || "solid"}" */
.surface, .bg-card.card, [data-surface] { ${surfaceCSS(dl.shape)} border-radius: var(--radius); }
#roleswitch{scrollbar-width:none}#roleswitch::-webkit-scrollbar{display:none}
#roleswitch button{white-space:nowrap;flex:0 0 auto}
#personaname,#pagetitle{white-space:nowrap}
.kit-spark path { fill: none; stroke: hsl(var(--primary)); stroke-width: 2; }
.kit-spark .area { fill: hsl(var(--primary) / 0.12); stroke: none; }
.kit-bar { fill: hsl(var(--primary)); rx: 3; } .kit-bar.alt { fill: hsl(var(--primary) / 0.35); }
.kit-donut-track { stroke: hsl(var(--muted)); }
::-webkit-scrollbar { height: 8px; width: 8px; } ::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 4px; }
.roleview { display: none; } .roleview.active { display: block; }
${grads.hero ? `/* hero wash — the anchor carries gradient tokens, so the shell header wears the wash
   (header.sticky out-specifies Tailwind's .bg-card\\/80 background-color; blur off so the wash
   shows true). Anchors without gradients never emit this rule. */
header.sticky { background: var(--grad-hero); backdrop-filter: none; }
/* ── COMPOSITION CSS for gradient anchors (checkpoint, 2026-08-07) ─────────────────────────────
   Read from the Compliance Checkpoint source: tokens alone repaint but do not recompose, and the
   difference the reviewer saw between "our design" and the Claude design was exactly composition.
   These rules reach the anatomy that generated parts express through consistent utility stacks:
   - frosted-glass chip (the hero band's brand pill / switcher / meta chips)
   - cards lose their hairline (Tailwind's border utility is static 1px — the borderWidth token
     can't reach it) and gain the layered soft shadow instead
   - KPI labels become mono uppercase eyebrows; action buttons become pills */
.frost { background: rgba(255,255,255,.62); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 1px 2px rgba(40,44,60,.06); }
.rounded-lg.border.border-border.bg-card, .rounded-xl.border.border-border.bg-card { border-color: transparent; box-shadow: var(--shadow-sm); border-radius: var(--radius); }
.text-\\[13px\\].text-muted-foreground { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: .11em; text-transform: uppercase; }
button.rounded-md { border-radius: 999px; }
.eyebrow-mono { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: hsl(var(--muted-foreground)); }
/* NAV, per the source (corrected 2026-08-07 — the reviewer flagged the solid violet pill + detached
   badge): ACTIVE is a white card (bold ink, soft shadow) and the accent lives on the 22px icon chip;
   INACTIVE is transparent with a putty icon chip and a white-wash hover; badges are small mono chips,
   lilac-tinted on the active row. Double-class selectors out-specify the runtime's utility classes. */
.navitem { border-radius: 11px; min-height: 40px; line-height: 1.25; font-size: 13.5px; }
.navitem.bg-sidebar-accent { background: hsl(var(--card)); color: hsl(var(--foreground)); font-weight: 700;
  box-shadow: 0 1px 2px rgba(32,38,50,.08), 0 8px 18px -14px rgba(32,38,50,.45); }
.navitem svg { box-sizing: content-box; width: 12px; height: 12px; padding: 5px; border-radius: 7px;
  background: hsl(var(--sidebar-border)); color: hsl(var(--muted-foreground)); }
.navitem.bg-sidebar-accent svg { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
.navitem:not(.bg-sidebar-accent):hover { background: rgba(255,255,255,.62); color: hsl(var(--foreground)); }
.navitem .font-mono { border-radius: 6px; padding: 2px 6px; background: hsl(var(--sidebar-border)); color: hsl(var(--sidebar-muted)); }
.navitem.bg-sidebar-accent .font-mono { background: hsl(var(--primary) / .09); color: hsl(var(--primary)); }
/* the source's third hero-meter variant — "needs action": dashed outline + candy-stripe fill,
   deliberately unfinished-looking next to the solid pastel bars. For part hero templates. */
.bar-striped { border: 1.5px dashed hsl(var(--muted-foreground) / .45);
  background: repeating-linear-gradient(115deg, rgba(255,255,255,.75) 0 7px, rgba(255,255,255,.25) 7px 14px); }
/* the source's search anatomy: underline-only inside card headers, never a boxed input. Scoped to
   search fields (the pl-9 icon-padding stack) so form/modal inputs keep their boxed affordance. */
input.pl-9 { border: 0; border-bottom: 1px solid hsl(var(--border)); border-radius: 0; background: transparent; box-shadow: none; }
input.pl-9:focus { outline: none; box-shadow: none; border-bottom-color: hsl(var(--primary)); }` : ""}
</style>`;
}

// ── SHELL ARCHETYPES — the CONTAINER/LAYOUT, chosen per app so structure differs too. Each returns the
// <body>…</body> chrome with @ROLE_SECTIONS + the standard element ids the switcher script needs
// (#sidenav, #roleselect, #pagetitle, #personaavatar/name/role, #crumb). ───────────────────────────
const HDR = `
    <header class="h-16 shrink-0 border-b border-border bg-card/80 backdrop-blur flex items-center gap-4 px-6 sticky top-0 z-30">
      <div class="min-w-0"><div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase" id="crumb">@APP_TITLE</div><h1 class="text-[17px] font-bold leading-tight font-display" id="pagetitle">Home</h1></div>
      <div class="ml-auto flex items-center gap-2" id="roleswitch"><span class="text-xs font-semibold text-muted-foreground whitespace-nowrap">Viewing as</span><select id="roleselect" class="h-9 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground cursor-pointer max-w-[240px]"></select></div>
      <div class="flex items-center gap-2.5 pl-3 border-l border-border">
        <div id="personaavatar" class="h-9 w-9 rounded-full grid place-items-center text-xs font-bold text-white bg-primary"></div>
        <div class="leading-tight hidden md:block"><div class="text-sm font-semibold" id="personaname"></div><div class="text-xs text-muted-foreground" id="personarole"></div></div>
      </div>
    </header>`;
const BRAND = `
    <div class="flex items-start gap-2.5 px-5 py-3 min-h-16 border-b border-sidebar-border">
      <div class="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-sm shadow-sm">@APP_MARK</div>
      <div class="min-w-0"><div class="font-semibold leading-snug font-display break-words" title="@APP_TITLE">@APP_TITLE</div><div class="text-xs text-sidebar-muted leading-snug break-words">@APP_SUB</div></div>
    </div>`;
const SIDENAV = `<nav id="sidenav" class="flex-1 overflow-y-auto p-3 space-y-1 text-sm"></nav>`;
const MAIN = (extra = "") => `<main class="flex-1 min-w-0 p-6 lg:p-8 ${extra}"><!-- @ROLE_SECTIONS --></main>`;

export const SHELL_ARCHETYPES = {
  // classic left rail, light — the current look
  "rail-left": () => `<div class="flex min-h-screen">
  <aside class="w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">${BRAND}${SIDENAV}<div class="p-4 border-t border-sidebar-border text-xs text-sidebar-muted">Clickable prototype</div></aside>
  <div class="flex-1 min-w-0 flex flex-col">${HDR}${MAIN()}</div>
</div>`,
  // dark brand rail — premium / finance / enterprise
  "rail-dark": () => `<div class="flex min-h-screen">
  <aside class="w-60 shrink-0 flex flex-col text-white" style="background:hsl(var(--sidebar-dark, var(--sidebar-foreground)));">${BRAND.replace("border-sidebar-border", "border-white/10").replace("text-sidebar-muted", "text-white/50")}<nav id="sidenav" class="flex-1 overflow-y-auto p-3 space-y-1 text-sm"></nav><div class="p-4 border-t border-white/10 text-xs text-white/50">Clickable prototype</div></aside>
  <div class="flex-1 min-w-0 flex flex-col">${HDR}${MAIN()}</div>
</div>`,
  // top bar (no side rail) — consumer / marketing / lightweight tools
  "top-bar": () => `<div class="min-h-screen flex flex-col">
  <header class="h-16 shrink-0 border-b border-border bg-card flex items-center gap-4 px-6 sticky top-0 z-30">
    <div class="flex items-center gap-2.5"><div class="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold text-sm">@APP_MARK</div><div class="font-semibold font-display">@APP_TITLE</div></div>
    <nav id="sidenav" class="ml-6 hidden md:flex items-center gap-1 text-sm"></nav>
    <div class="ml-auto flex items-center gap-2" id="roleswitch"><span class="text-xs font-semibold text-muted-foreground">Viewing as</span><select id="roleselect" class="h-9 rounded-lg border border-border bg-card px-3 text-sm font-semibold"></select></div>
    <div class="flex items-center gap-2.5 pl-3 border-l border-border"><div id="personaavatar" class="h-9 w-9 rounded-full grid place-items-center text-xs font-bold text-white bg-primary"></div><div class="leading-tight hidden md:block"><div class="text-sm font-semibold" id="personaname"></div><div class="text-xs text-muted-foreground" id="personarole"></div></div></div>
    <span id="crumb" class="hidden"></span><h1 id="pagetitle" class="hidden"></h1>
  </header>
  ${MAIN("max-w-[1400px] w-full mx-auto")}
</div>`,
  // rail + right context panel — ops / clinical / review-heavy
  "rail-right": () => `<div class="flex min-h-screen">
  <aside class="w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">${BRAND}${SIDENAV}</aside>
  <div class="flex-1 min-w-0 flex flex-col">${HDR}${MAIN()}</div>
  <aside class="w-80 shrink-0 border-l border-border bg-card/60 hidden xl:flex flex-col p-5 gap-4"><div class="text-sm font-semibold text-muted-foreground">Activity</div><div class="text-xs text-muted-foreground">Context panel — recent items and quick actions render here per role.</div></aside>
</div>`,
  // hero band — the Compliance Checkpoint container (2026-08-07): the whole app is a rounded canvas
  // floating on the page, topped by a tall gradient-wash band that carries the brand as a frosted
  // pill, a display-size page title under a mono eyebrow, and the persona/switcher chips. The
  // sidebar floats as its own card on the canvas rather than running edge-to-edge. Built for anchors
  // with gradient tokens (--grad-hero paints the band; a card fallback keeps it legible without).
  // Same runtime contract as every archetype: #sidenav #roleselect #pagetitle #crumb #persona*.
  "hero-band": () => `<div class="min-h-screen p-4 md:p-6">
  <div class="mx-auto max-w-[1500px] rounded-[22px] overflow-hidden flex flex-col shadow-2xl" style="background:hsl(var(--muted))">
    <div style="background:var(--grad-hero, hsl(var(--card)))" class="px-6 pt-4 pb-7">
      <div class="flex items-center gap-3.5 flex-wrap">
        <div class="frost flex items-center gap-2.5 rounded-full py-1.5 pl-2 pr-4">
          <div class="h-8 w-8 rounded-lg grid place-items-center font-black text-[12px] text-primary-foreground" style="background:var(--grad-brand, hsl(var(--primary)))">@APP_MARK</div>
          <div class="leading-tight"><div class="text-[13.5px] font-bold">@APP_TITLE</div><div class="eyebrow-mono !text-[9px]">@APP_SUB</div></div>
        </div>
        <!-- role switcher AS THE SOURCE DRAWS IT: a frosted chip group with a dot per role (active =
             white chip, colored dot). The <select> stays for the runtime contract but hidden; chips
             drive switchRole. Persona name/role live in the hero eyebrow per the source, so the text
             block here is contract-only; the avatar joins an overlapping team stack. -->
        <div class="ml-auto flex items-center gap-1 frost rounded-full p-1" id="rolechips"></div>
        <select id="roleselect" class="hidden"></select>
        <div class="flex items-center" id="personastack">
          <div id="personaavatar" class="h-[30px] w-[30px] rounded-full grid place-items-center text-[11px] font-bold text-white bg-primary ring-2 ring-white/90 relative z-10"></div>
        </div>
        <!-- per-role primary action (the source's black 'New change' pill) — from template.hero-cta -->
        <div id="heroctaslot"></div>
        <div class="hidden"><span id="personaname"></span><span id="personarole"></span></div>
      </div>
      <div class="flex items-end gap-5 pt-7 pb-1">
        <div class="frost hidden sm:grid h-[52px] w-[52px] rounded-full place-items-center text-lg text-muted-foreground">@APP_MARK</div>
        <div class="min-w-0">
          <div class="eyebrow-mono mb-1" id="crumb">@APP_TITLE</div>
          <div class="flex items-baseline gap-3.5 flex-wrap">
            <h1 class="font-display font-bold tracking-tight leading-none text-[clamp(28px,3.5vw,44px)]" id="pagetitle">Home</h1>
            <!-- the source's inline headline figure ("Register 16 requirements tracked") — template.hero-fig -->
            <div id="herofig" class="flex items-baseline gap-2.5"></div>
          </div>
        </div>
        <div class="flex-1"></div>
        <!-- the source's right-of-title stat clusters (REGISTER · COVERAGE · STATUS) — template.hero-side -->
        <div id="herosideslot" class="hidden lg:flex items-center gap-7 pb-1.5"></div>
      </div>
      <!-- per-role band content — filled from the active role part's <template class="hero"> (headline
           figures, SLA/status meters); empty and collapsed when a role carries none -->
      <div id="heroslot"></div>
    </div>
    <div class="flex-1 min-h-0 flex items-stretch">
      <!-- FLUSH rail, not a floating card (corrected against the source 2026-08-07: the design's
           sidebar is #f1efeb putty with a hairline border-right, edge-to-edge under the band —
           reviewer caught the invented gap + white card immediately) -->
      <aside class="w-[236px] shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground p-3.5">${SIDENAV}
        <!-- the source's register-health footer (segmented mini-bar + counts) — template.side-foot -->
        <div id="sidefootslot" class="border-t border-sidebar-border mt-2 pt-3 px-2 empty:hidden"></div>
        <div class="mt-2 border-t border-sidebar-border pt-3 px-2 pb-1 flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-success"></span><span class="text-xs text-sidebar-muted">Clickable prototype</span></div>
      </aside>
      <main class="flex-1 min-w-0 p-6"><!-- @ROLE_SECTIONS --></main>
    </div>
  </div>
</div>`,
};

// Full prototype shell for an app from its DesignLanguage. `meta` = {appTitle, appMark, appSub}.
// Keeps the SAME markers/ids the assembler + switcher expect, so parts + seed splice unchanged.
// opts.roles = ["fm","ops",…] → emits ONE `<section class="roleview" id="rv-<slug>"><!-- @PART:role-<slug> --></section>`
// per role (the proto-assemble.mjs contract), replacing the bare <!-- @ROLE_SECTIONS --> marker.
export function buildShell(dl = {}, meta = {}, opts = {}) {
  const arch = (dl.shell && dl.shell.archetype) || "rail-left";
  const bodyFn = SHELL_ARCHETYPES[arch] || SHELL_ARCHETYPES["rail-left"];
  const OVERLAYS = `
<div id="kitoverlay" class="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] hidden" onclick="if(event.target===this)closePopup()"><div id="kitpopup" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(560px,92vw)] max-h-[85vh] overflow-y-auto rounded-lg border border-border bg-card shadow-2xl p-6"></div></div>
<div id="kittoast" class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 shadow-lg text-sm font-medium opacity-0 translate-y-2 transition pointer-events-none"><span class="h-5 w-5 rounded-full bg-success text-success-foreground grid place-items-center text-[10px]">✓</span><span id="kittoastmsg">Saved</span></div>`;
  // RUNTIME: the role-switcher + popup/toast helpers every prototype needs. This must ship in EVERY
  // generated shell — omitting it renders chrome with no content (nav/role select empty, roleviews
  // never activated; caught converting the maritime FM page 2026-07-25).
  const RUNTIME = `
/* ICON(name, cls) — the shell's own icon set. The nav renderer and most kit recipes call it, but
   nothing defined it: when no part happened to, nav items rendered label-only and icon tiles came out
   empty. The container owns its chrome, so it ships here. Unknown names degrade to a neutral dot. */
window.ICON = (function () {
  const P = {
    gauge: '<path d="M12 14 8.5 9.5"/><circle cx="12" cy="14" r="1.5"/><path d="M20 18a9 9 0 1 0-16 0"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    inbox: '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M4 4h16l1 8v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    trend: '<path d="m3 16 5-5 4 3 7-7"/><path d="M17 7h3v3"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 8.5a3 3 0 0 1 0 6M18.5 20a6 6 0 0 0-3-5.2"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h3a1 1 0 0 1 1 1v11M8 7h4M8 11h4M8 15h4"/>',
    box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    truck: '<path d="M3 16V6h11v10"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    ship: '<path d="M3 15l2-5h14l2 5"/><path d="M12 4v6M6 15v5h12v-5"/>',
    wrench: '<path d="M15 4a4.5 4.5 0 0 0 5 7l-9 9-3-3 9-9a4.5 4.5 0 0 1-2-4z"/>',
    file: '<path d="M14 3v5h5"/><path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>',
    folder: '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
    bell: '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
    flag: '<path d="M5 21V4h9l-1 3h6l-1.5 5H12l1 3H5"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5h.01"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    money: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.5h5M9.5 14h5"/>',
    cart: '<circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/><path d="M3 4h2l2.5 10h10L20 7H6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    dot: '<circle cx="12" cy="12" r="3.5"/>'
  };
  const ALIAS = { dashboard: "gauge", overview: "gauge", queue: "inbox", approvals: "check", tasks: "check",
    reports: "chart", analytics: "chart", directory: "users", roster: "users", people: "users", team: "users",
    vessels: "ship", fleet: "ship", assets: "box", inventory: "box", orders: "file", requests: "inbox",
    invoices: "file", documents: "file", schedule: "calendar", maintenance: "wrench", work: "wrench",
    vendors: "building", suppliers: "building", sites: "pin", campus: "building", finance: "money",
    payments: "money", risk: "alert", compliance: "shield", audit: "shield", catalog: "cart", create: "plus" };
  return function (name, cls) {
    const k = String(name || "").toLowerCase().replace(/[^a-z]/g, "");
    const d = P[k] || P[ALIAS[k]] || P.dot;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="' + (cls || "h-4 w-4") + '" aria-hidden="true">' + d + '</svg>';
  };
})();
(function () {
  const nav = document.getElementById("sidenav");
  window.switchRole = function (slug) {
    slug = String(slug).toLowerCase();
    const R = window.ROLES.find((r) => r.slug === slug) || window.ROLES[0];
    window.__kfRole = R.slug;   // remembered so the deferred first paint below re-renders THIS role
    document.querySelectorAll(".roleview").forEach((v) => v.classList.toggle("active", v.id === "rv-" + R.slug));
    const rsel0 = document.getElementById("roleselect"); if (rsel0) rsel0.value = R.slug;
    const pn = document.getElementById("personaname"); if (pn) pn.textContent = R.persona.name;
    const pr = document.getElementById("personarole"); if (pr) pr.textContent = R.persona.role;
    const av = document.getElementById("personaavatar"); if (av) { av.textContent = R.persona.initials; av.style.background = R.persona.color; }
    document.getElementById("pagetitle").textContent = R.title;
    // HERO SLOT (hero-band archetype): a role part may carry <template class="hero"> — headline
    // figures / status meters that belong IN the gradient band, not in the page body (the Compliance
    // Checkpoint band shows "In flight 10" + an SLA meter per role). Copied on role switch; roles
    // without the template leave the band clean. No-op for archetypes without #heroslot.
    const hs = document.getElementById("heroslot");
    if (hs) { const ht = document.querySelector("#rv-" + R.slug + " template.hero"); hs.innerHTML = ht ? ht.innerHTML : ""; }
    // Same slot mechanism for the band's other zones (source anatomy): the inline headline figure
    // beside the title, the right-of-title stat clusters, the top-bar primary-action pill, and the
    // sidebar health footer. A role without a given template leaves that zone empty/collapsed.
    for (const [slotId, tpl] of [["herofig", "hero-fig"], ["herosideslot", "hero-side"], ["heroctaslot", "hero-cta"], ["sidefootslot", "side-foot"]]) {
      const slot = document.getElementById(slotId);
      if (!slot) continue;
      const t = document.querySelector("#rv-" + R.slug + " template." + tpl);
      slot.innerHTML = t ? t.innerHTML : "";
    }
    // HERO-BAND CHROME, per the source: the eyebrow reads "ROLE · PERSONA" for the active role
    // ("DIRECTOR HSE · FATIMA AL SUWAIDI"), the switcher is a frosted chip group with a dot per role
    // (active = white chip, colored dot), and the persona avatar leads an overlapping team stack of
    // the other roles' personas. All gated on #rolechips so every other archetype is untouched.
    const chips = document.getElementById("rolechips");
    if (chips) {
      const crumbEl = document.getElementById("crumb");
      if (crumbEl) crumbEl.textContent = R.name + " · " + R.persona.name;
      chips.innerHTML = window.ROLES.map((r) => {
        const on = r.slug === R.slug;
        return \`<button data-chip="\${r.slug}" class="flex items-center gap-2 h-8 px-3.5 rounded-full text-[12.5px] transition \${on ? "bg-card font-bold text-foreground shadow-sm" : "font-semibold text-muted-foreground hover:text-foreground"}"><span class="h-1.5 w-1.5 rounded-full" style="background:\${on ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}"></span>\${r.name}</button>\`;
      }).join("");
      chips.querySelectorAll("[data-chip]").forEach((b) => b.addEventListener("click", () => window.switchRole(b.dataset.chip)));
      const stack = document.getElementById("personastack");
      if (stack) {
        stack.querySelectorAll("[data-stackmate]").forEach((x) => x.remove());
        const mates = window.ROLES.filter((r) => r.slug !== R.slug).slice(0, 2);
        const extra = window.ROLES.length - 1 - mates.length;
        stack.insertAdjacentHTML("beforeend",
          mates.map((r) => \`<div data-stackmate class="h-[30px] w-[30px] rounded-full grid place-items-center text-[10px] font-bold -ml-2 ring-2 ring-white/90 bg-card text-muted-foreground">\${r.persona.initials}</div>\`).join("") +
          (extra > 0 ? \`<div data-stackmate class="h-[30px] w-[30px] rounded-full grid place-items-center text-[10px] font-bold -ml-2 ring-2 ring-white/90 bg-card/70 text-muted-foreground">+\${extra}</div>\` : ""));
      }
    }
    // bg-sidebar-accent (not bg-primary): on the default "light" sidebar tone it resolves to the same
    // primary color as before (zero visual change), but on a "brand" tone rail (sidebar bg == primary)
    // bg-primary would make the active item invisible against its own background — sidebar-accent is
    // deliberately a lighter/darker tint of primary for exactly that case (see theme-anchors.mjs).
    const NAV_ON = "bg-sidebar-accent text-primary-foreground shadow-sm", NAV_OFF = "text-sidebar-muted hover:bg-foreground/5 hover:text-sidebar-foreground";
    nav.innerHTML = \`<div class="px-2 pb-1 pt-2 text-[10.5px] font-bold tracking-widest uppercase text-sidebar-muted">\${R.name} workspace</div>\` +
      R.nav.map((n, i) => \`<a href="#" data-nav="\${n.id}" class="navitem flex items-center gap-2.5 rounded-md px-3 py-2 font-medium \${i === 0 ? NAV_ON : NAV_OFF}">\${window.ICON && n.icon ? ICON(n.icon, "h-4 w-4 shrink-0") : ""}<span class="flex-1 min-w-0">\${n.label}</span>\${n.badge != null ? \`<span class="font-mono text-[10.5px] px-1.5 py-0.5 rounded-md bg-foreground/5">\${n.badge}</span>\` : ""}</a>\`).join("");
    const showPage = (navId) => {
      document.getElementById("rv-" + R.slug).querySelectorAll("[data-page]").forEach((p) => p.classList.toggle("hidden", p.dataset.page !== navId));
      const n = R.nav.find((x) => x.id === navId);
      document.getElementById("pagetitle").textContent = (n && n.label) || R.title;
      if (window.PAGES && window.PAGES[navId]) window.PAGES[navId]();
    };
    nav.querySelectorAll("[data-nav]").forEach((a) => a.addEventListener("click", (ev) => { ev.preventDefault();
      nav.querySelectorAll(".navitem").forEach((x) => x.className = x.className.replace(NAV_ON, NAV_OFF));
      a.className = a.className.replace(NAV_OFF, NAV_ON);
      showPage(a.dataset.nav);
    }));
    showPage(R.nav[0].id);
    if (window.onRoleChange) window.onRoleChange(R.slug);
  };
  const rsel = document.getElementById("roleselect");
  rsel.innerHTML = window.ROLES.map((r) => \`<option value="\${r.slug}">\${r.name}</option>\`).join("");
  rsel.addEventListener("change", () => switchRole(rsel.value));
  // FIRST PAINT MUST WAIT FOR THE PARTS. The assembler defers every part <script> to the end of
  // <body>, so at the moment this shell script runs \`window.PAGES\` is still undefined — booting
  // here would toggle the landing page visible and then skip its render function, leaving a
  // correctly-themed page with an empty body. Parts are inline scripts, so DOMContentLoaded is
  // guaranteed to fire after all of them have registered.
  // Boot the role someone ALREADY chose, not always ROLES[0]: capture-screens.mjs drives a specific
  // role by injecting \`switchRole(slug)\` at the very end of the body, which still runs
  // pre-DOMContentLoaded — an unconditional ROLES[0] here would silently screenshot the wrong role
  // for every role but the first. (Keep the literal closing-body-tag sequence out of this comment:
  // the HTML parser ends the shell <script> at it and the verifier then sees a truncated program.)
  const boot = () => switchRole(window.__kfRole || window.ROLES[0].slug);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
window.openPopup = function (html) { document.getElementById("kitpopup").innerHTML = html; document.getElementById("kitoverlay").classList.remove("hidden"); };
window.closePopup = function () { document.getElementById("kitoverlay").classList.add("hidden"); };
window.showToast = function (msg) {
  const t = document.getElementById("kittoast"); document.getElementById("kittoastmsg").textContent = msg || "Saved";
  t.classList.remove("opacity-0", "translate-y-2"); clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => t.classList.add("opacity-0", "translate-y-2"), 2600);
};`;
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>@APP_TITLE — Prototype</title>
${emitHead(dl)}
</head>
<body>
${bodyFn()}
${OVERLAYS}
<script>
/* ── SEED + helpers (injected per app) ── */
<!-- @PART:seed -->
${RUNTIME}
</script>
</body></html>`;
  let out = html;
  if (Array.isArray(opts.roles) && opts.roles.length) {
    const sections = opts.roles
      .map((r) => `<section class="roleview" id="rv-${r}"><!-- @PART:role-${r} --></section>`)
      .join("\n      ");
    out = out.replace("<!-- @ROLE_SECTIONS -->", () => sections);
  }
  // window.ROLES — the shell's own boot code reads it in three places (switchRole, the role
  // <select>, and boot()), but nothing ever WROTE it: every prototype rendered a chrome-only blank
  // page with an empty role switcher, and proto-verify passed them all because each role part was
  // individually well-formed. Found 2026-08-02 after three shipped builds were silently blank.
  // Emitted from the experience spec so nav labels/icons and personas survive into the runtime.
  if (Array.isArray(opts.roleData) && opts.roleData.length) {
    const roles = opts.roleData.map((r) => ({
      slug: r.slug, name: r.role || r.name || r.slug, title: r.title || r.role || r.name || r.slug,
      landing: r.landing || (r.nav && r.nav[0] && r.nav[0].page) || null,
      persona: r.persona || null,
      nav: (r.nav || []).map((n) => ({ id: n.page || n.id, label: n.label || n.page || n.id, icon: n.icon || "dot" })),
    }));
    out = out.replace("</head>", `<script>window.ROLES=${JSON.stringify(roles)};</script>\n</head>`);
  }
  return out
    .replace(/@APP_TITLE/g, meta.appTitle || dl.name || "App")
    .replace(/@APP_MARK/g, meta.appMark || (meta.appTitle || "A").slice(0, 2).toUpperCase())
    .replace(/@APP_SUB/g, meta.appSub || "");
}

// ── CLI: `node design-language.mjs shell <experience-spec.json> [--out <file>] [--roles a,b,c]` ──
// The pipeline's Shell stage calls this INSTEAD of instantiating proto-kit/shadcn-shell.html.
// Design slice: spec.design (written by kf-design-director). FALLBACK when absent — the pipeline
// must never break on an old spec: derive the design from the 21-anchor catalog by matching the app
// name + domain words (theme-anchors.mjs), the same source kf-design-director itself picks from.
// Role slugs: --roles wins; else spec.roles[].slug; else the `<slug>-` prefix of each role's landing id.
async function cliShell(argv) {
  const { readFileSync, writeFileSync } = await import("node:fs");
  const specPath = argv[0];
  if (!specPath) { console.error("usage: design-language.mjs shell <experience-spec.json> [--out shell.html] [--roles a,b,c]"); process.exit(2); }
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const appName = typeof spec.app === "string" ? spec.app : (spec.app && spec.app.name) || spec.domain || "App";
  let design = spec.design;
  if (!design || !design.palette) {
    const { pickAnchor, loadAnchors, toDesignLanguage } = await import("./theme-anchors.mjs");
    const words = [appName, spec.domain, ...(spec.roles || []).map((r) => r.role || r.name)].filter(Boolean).join(" ");
    const { best } = pickAnchor(words);
    const anchor = loadAnchors().find((a) => a.id === best.id);
    design = toDesignLanguage(anchor, { appId: appName.toLowerCase().replace(/[^a-z0-9]+/g, "-"), appName });
    design.paletteId = anchor.id;
    design.rationale = `FALLBACK (no design slice in spec): anchor '${anchor.id}' matched from app/domain words.`;
    console.error(`no design slice — fallback derived: anchor=${anchor.id}`);
  }
  const slugOf = (r) => r.slug || String(r.landing || r.role || "").split("-")[0].toLowerCase();
  const roles = flag("--roles") ? flag("--roles").split(",").map((x) => x.trim()).filter(Boolean)
    : [...new Set((spec.roles || []).map(slugOf).filter(Boolean))];
  const appTitle = appName || design.name || "App";
  const html = buildShell(design, {
    appTitle,
    // Initials from WORDS THAT ARE WORDS. Splitting on whitespace and taking the first character of
    // each let punctuation through, so "POF Risk & HAZID Manager" produced the mark "PR&" — an
    // ampersand rendered as if it meant something. Two letters read better than three at 36px anyway.
    appMark: (appTitle.match(/[A-Za-z0-9]+/g) || ["A"]).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    appSub: (spec.meta && spec.meta.tagline) || design.rationale?.split(";")[0]?.slice(0, 48) || "",
  }, { roles, roleData: (spec.roles || []).filter((r) => roles.includes(slugOf(r))).map((r) => ({ ...r, slug: slugOf(r) })) });
  const out = flag("--out") || specPath.replace(/[^/]+$/, "shell-base.html");
  writeFileSync(out, html);
  console.log(`shell → ${out} · palette=${design.paletteId || "custom"} archetype=${(design.shell || {}).archetype || "rail-left"} roles=[${roles.join(",")}]`);
}
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (isMain && process.argv[2] === "shell") cliShell(process.argv.slice(3));
