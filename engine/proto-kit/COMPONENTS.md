# proto-kit component cookbook (shadcn/ui conventions · identity via DESIGN TOKENS)

This is the BASE kit. Every recipe styles itself through the shell's tokens (bg-card, border-border,
bg-primary, --radius, font-display…), so the app's DesignLanguage (design-language.mjs) re-skins all
of it automatically. A per-app SPECIALIZED kit may exist at `<partsDir>/components.md` (written by the
kit-generator stage from the app's identity) — when present it SUPERSEDES this file; same contract.

Role-part agents ASSEMBLE these components — never invent CSS. The shell (`shadcn-shell.html`)
ships the Tailwind CDN + shadcn token bridge, so every snippet below works verbatim.
**Rules: no `<style>` blocks in parts. No new class conventions. Compose, bind seed data, done.**

Shell globals available to part scripts (deferred after SEED by the assembler):
`SEED`, `ICON(name, cls)`, `fmtINR(n)`, `fmtDate(iso)`, `initials(name)`, `colorFor(str)`,
`find*(id)` lookups, `openPopup(html)` / `closePopup()` / `showToast(msg)`,
`window.onNavigate(roleSlug, navId)` hook for sub-pages.

Part contract: root is `your dashboard markup` + one `<script>` that fills dynamic regions
from SEED. Give dynamic containers ids prefixed with your role slug (`req-`, `mgr-`, …).

---

## Stat card row (KPI band)
```html
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <div class="rounded-lg border border-border bg-card p-5 shadow-sm">
    <div class="flex items-center justify-between text-muted-foreground">
      <span class="text-[13px] font-medium">Open requisitions</span>
      <span class="h-8 w-8 rounded-md bg-accent text-accent-foreground grid place-items-center">…ICON…</span>
    </div>
    <div class="mt-2 text-2xl font-bold tabular-nums">12</div>
    <div class="mt-1 text-xs text-muted-foreground"><span class="text-success font-semibold">▲ 8%</span> vs last month</div>
  </div>
</div>
```
Optional sparkline inside a stat card (uses kit chart classes from the shell):
```html
<svg class="kit-spark mt-2 w-full" viewBox="0 0 120 32" preserveAspectRatio="none">
  <path class="area" d="M0 28 L20 22 L40 24 L60 14 L80 16 L100 8 L120 12 L120 32 L0 32 Z"/>
  <path d="M0 28 L20 22 L40 24 L60 14 L80 16 L100 8 L120 12"/>
</svg>
```

## Card (generic container — everything lives in cards)
```html
<div class="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
  <div class="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
    <div class="min-w-0"><h3 class="font-semibold">Pending approvals</h3><p class="text-xs text-muted-foreground">Sorted by age</p></div>
    <button class="shrink-0 text-sm font-medium text-primary hover:underline">View all</button>
  </div>
  <div class="p-5">…content…</div>
</div>
```

**A title beside a pill needs `min-w-0` and `shrink-0`.** A record card's real titles are long
("Strategic Partnership Readout — Atlas Ventures") and its pills are short ("Critical"). Without
these, the title refuses to shrink and pushes the pill out through the side of the card:

```html
<article class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
  <div class="p-5">
    <div class="flex items-start justify-between gap-3">
      <h3 class="font-semibold leading-snug min-w-0">Strategic Partnership Readout — Atlas Ventures</h3>
      <span class="shrink-0 rounded-full bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1">Critical</span>
    </div>
    <p class="mt-1 text-sm text-muted-foreground">Strategic Initiatives</p>
    <p class="mt-3 text-sm line-clamp-2">…summary from SEED…</p>
    <div class="mt-4 flex items-center justify-between gap-3">…status pill… …owner initials…</div>
  </div>
</article>
```

`line-clamp-2` on the summary, never a hand-truncated string with a `…` in the seed data — the clamp
adapts to the column width, a baked-in ellipsis does not.

## Buttons
```html
<button class="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3.5 py-2 text-sm font-semibold shadow-sm hover:opacity-90">Primary</button>
<button class="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-semibold hover:bg-muted">Outline</button>
<button class="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">Ghost</button>
<button class="inline-flex items-center gap-1.5 rounded-md bg-destructive text-destructive-foreground px-3.5 py-2 text-sm font-semibold hover:opacity-90">Reject</button>
<button class="inline-flex items-center gap-1.5 rounded-md bg-success text-success-foreground px-3.5 py-2 text-sm font-semibold hover:opacity-90">Approve</button>
```

## Badges (status). Map workflow states onto these four; never invent hues.
```html
<span class="inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground px-2.5 py-0.5 text-xs font-semibold">In progress</span>
<span class="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2.5 py-0.5 text-xs font-semibold">Approved</span>
<span class="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning px-2.5 py-0.5 text-xs font-semibold">Awaiting</span>
<span class="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-semibold">Rejected</span>
<span class="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-semibold">Draft</span>
```

## Table (data list — wrap in a Card)
```html
<div class="overflow-x-auto">
  <table class="w-full text-sm">
    <thead><tr class="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
      <th class="px-5 py-3 font-semibold">Requisition</th><th class="px-5 py-3 font-semibold">Amount</th><th class="px-5 py-3 font-semibold">Status</th><th class="px-5 py-3"></th>
    </tr></thead>
    <!-- The id goes on the TBODY. Rows assigned to a <div>'s innerHTML do not fail and do not warn:
         the parser discards every <tr> and <td> as invalid there and keeps only their text, so the
         whole table arrives as one run-on paragraph under a header that still looks like a table.
         proto-verify fails the role with TABLE_ORPHAN when it sees rows going anywhere else. -->
    <tbody id="req-table"><!-- rows from SEED -->
      <tr class="border-b border-border/60 hover:bg-muted/50 cursor-pointer">
        <td class="px-5 py-3"><div class="font-medium">Laptops for interns</div><div class="text-xs text-muted-foreground">PR-0031 · IT</div></td>
        <td class="px-5 py-3 tabular-nums font-medium">₹4,20,000</td>
        <td class="px-5 py-3">…badge…</td>
        <td class="px-5 py-3 text-right">…ghost button…</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Approval queue row (actionable inbox)
```html
<div class="flex items-center gap-4 px-5 py-4 border-b border-border/60 hover:bg-muted/40">
  <div class="h-10 w-10 rounded-full grid place-items-center text-xs font-bold text-white shrink-0" style="background:#2563eb">AI</div>
  <div class="min-w-0 flex-1">
    <div class="font-medium truncate">PR-0031 — Laptops for interns</div>
    <div class="text-xs text-muted-foreground">Ananya Iyer · ₹4,20,000 · 2 days waiting</div>
  </div>
  <div class="flex gap-2 shrink-0">…Approve/Reject buttons (small: px-3 py-1.5)…</div>
</div>
```

## Tabs (within a page)
```html
<div class="inline-flex rounded-lg border border-border bg-muted p-1 mb-4" data-tabs="req-tabs">
  <button data-tab="open" class="rounded-md px-3.5 py-1.5 text-sm font-medium bg-card shadow-sm">Open</button>
  <button data-tab="closed" class="rounded-md px-3.5 py-1.5 text-sm font-medium text-muted-foreground">Closed</button>
</div>
```
Toggle in your part script: swap `bg-card shadow-sm` ↔ `text-muted-foreground`, show/hide panels.

## Bar chart (monthly spend etc. — kit classes)
```html
<svg class="w-full" height="120" viewBox="0 0 240 120" preserveAspectRatio="none">
  <rect class="kit-bar alt" x="10" y="60" width="22" height="60"/>
  <rect class="kit-bar" x="42" y="30" width="22" height="90"/>
</svg>
```

## Donut / progress ring
```html
<svg width="120" height="120" viewBox="0 0 120 120">
  <circle class="kit-donut-track" cx="60" cy="60" r="50" fill="none" stroke-width="12"/>
  <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--primary))" stroke-width="12"
          stroke-dasharray="314" stroke-dashoffset="94" stroke-linecap="round" transform="rotate(-90 60 60)"/>
  <text x="60" y="66" text-anchor="middle" class="font-bold" font-size="20" fill="currentColor">70%</text>
</svg>
```

## Timeline / activity feed
```html
<ol class="relative border-l border-border ml-2 space-y-5">
  <li class="ml-5"><span class="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary"></span>
    <div class="text-sm font-medium">PO-0012 approved by Finance</div>
    <div class="text-xs text-muted-foreground">Meera Krishnan · 02 Jul</div></li>
</ol>
```

## Progress bar (budget consumption etc.)
```html
<div class="flex items-center justify-between text-xs mb-1"><span class="font-medium">IT budget</span><span class="text-muted-foreground tabular-nums">₹8.2L / ₹12L</span></div>
<div class="h-2 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full bg-primary" style="width:68%"></div></div>
```

## Opening a create-form — NEVER build markup inside an attribute

`openPopup(html)` takes markup, and markup contains quotes. An `on*="…"` attribute ends at its first
`"`, so building the form in the attribute cuts the handler in half and prints the rest of your source
on the page, under a button that no longer works:

```html
<!-- WRONG — class="…" ends the onclick, and `; window.openPopup(form); "> renders as visible text -->
<button onclick="const form = `<h3 class="text-lg">New briefing</h3>`; window.openPopup(form); ">New briefing</button>
```

Give the form a named function in `<script>` and call it by name. The handler then holds an identifier
and a pair of parentheses — nothing that can be quoted wrongly:

```html
<button class="…" onclick="newBriefing()">New briefing</button>
<script>
function newBriefing() {
  openPopup(`
    <h3 class="text-lg font-bold mb-1">New briefing</h3>
    <p class="text-sm text-muted-foreground mb-5">Saved as a draft you can refine.</p>
    …fields, from SEED…
    <div class="flex justify-end gap-2 mt-2">…Cancel / Submit…</div>`);
}
</script>
```

The rule, with no exceptions: **an `on*` attribute contains a call, never markup.** `proto-verify`
fails the role with `HANDLER_LEAK` when source code reaches the screen.

## Form fields (inside openPopup create-forms)
```html
<h3 class="text-lg font-bold mb-1">New requisition</h3><p class="text-sm text-muted-foreground mb-5">Sent to your manager for approval.</p>
<label class="block text-sm font-medium mb-1.5">Title</label>
<input class="w-full rounded-md border border-input bg-card px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-ring" placeholder="What do you need?">
<select class="w-full rounded-md border border-input bg-card px-3 py-2 text-sm mb-4">…options from SEED.lists…</select>
<div class="flex justify-end gap-2 mt-2">…Ghost Cancel (closePopup())… …Primary Submit (showToast('Requisition submitted'); closePopup())…</div>
```

## Empty state
```html
<div class="py-12 text-center">
  <div class="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center text-muted-foreground mb-3">…ICON…</div>
  <div class="font-semibold">Nothing waiting on you</div><div class="text-sm text-muted-foreground">Approved items move to Purchase Orders.</div>
</div>
```

## Kanban column (pipeline views)
```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div class="rounded-lg bg-muted/60 p-3">
    <div class="flex items-center justify-between px-1.5 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"><span>Sourcing</span><span class="rounded-full bg-card border border-border px-2 py-0.5 tabular-nums">4</span></div>
    <div class="space-y-2"><div class="rounded-md border border-border bg-card p-3 shadow-sm">…title, meta, badge…</div></div>
  </div>
</div>
```

---

### Page composition — per-page LAYOUT archetypes (NOT one fixed recipe)
Each page is composed per its layout archetype (`engine/page-layouts.mjs` — command | queue | intake |
analytics | operations | board | directory | master-detail | calendar): the HERO leads with the most
space, compose[] rows follow, forbid[] respected. The old fixed "KPI row → work surface → rail" recipe
applies ONLY to `command` pages. Bind everything to SEED; actions call `openPopup`/`showToast` — never
dead buttons.

---

## ENRICHED SET (2026-07-25) — richer anatomy, still 100% token-driven

## Stat tile with icon chip + delta (richer than the basic stat card — prefer on `command` landings)
```html
<div class="rounded-lg border border-border bg-card p-5 shadow-sm flex items-center gap-4">
  <span class="h-11 w-11 rounded-xl bg-accent text-accent-foreground grid place-items-center shrink-0">…ICON h-5 w-5…</span>
  <div class="min-w-0">
    <div class="text-2xl font-bold tabular-nums leading-tight">$6.7M</div>
    <div class="text-[13px] text-muted-foreground truncate">Charter &amp; contract value</div>
    <div class="mt-0.5 text-xs"><span class="text-success font-semibold">▲ 1.4%</span> <span class="text-muted-foreground">YTD</span></div>
  </div>
</div>
```

## Dual-series line chart with dark tooltip (trend vs prior period — `command`/`analytics` hero charts)
```html
<div class="relative">
  <svg class="w-full" height="160" viewBox="0 0 480 160" preserveAspectRatio="none">
    <g stroke="hsl(var(--border))" stroke-dasharray="3 4"><line x1="0" y1="40" x2="480" y2="40"/><line x1="0" y1="90" x2="480" y2="90"/><line x1="0" y1="140" x2="480" y2="140"/></g>
    <path d="M0,120 C80,100 160,130 240,84 C320,40 400,96 480,60" fill="none" stroke="hsl(var(--primary)/0.35)" stroke-width="2"/>
    <path class="area" d="M0,110 C80,84 160,118 240,64 C320,24 400,80 480,44 L480,160 L0,160 Z" fill="hsl(var(--primary)/0.10)"/>
    <path d="M0,110 C80,84 160,118 240,64 C320,24 400,80 480,44" fill="none" stroke="hsl(var(--primary))" stroke-width="2.5"/>
  </svg>
  <!-- dark tooltip: absolutely position on hover point; near-black surface, white text, series dots -->
  <div class="absolute rounded-lg bg-foreground text-background text-xs px-3 py-2 shadow-lg pointer-events-none" style="left:46%;top:8%">
    <div class="font-semibold mb-1">03 May</div>
    <div class="flex items-center gap-1.5"><span class="h-1.5 w-1.5 rounded-full bg-primary"></span>This period <span class="font-semibold tabular-nums ml-1">7h</span></div>
    <div class="flex items-center gap-1.5 opacity-70"><span class="h-1.5 w-1.5 rounded-full bg-warning"></span>Last period <span class="font-semibold tabular-nums ml-1">6h</span></div>
  </div>
</div>
```

## Segment bar (distribution strip + legend — statuses/categories at a glance)
```html
<div class="h-2.5 w-full rounded-full overflow-hidden flex">
  <div class="bg-primary" style="width:52%"></div><div class="bg-success" style="width:22%"></div>
  <div class="bg-warning" style="width:16%"></div><div class="bg-destructive" style="width:10%"></div>
</div>
<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
  <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-primary"></span><b class="text-foreground tabular-nums">14</b> Active</span>
  <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-success"></span><b class="text-foreground tabular-nums">6</b> Done</span>
</div>
```

## Search + filter bar (leads `directory` and `operations` pages)
```html
<div class="flex flex-wrap items-center gap-2.5 mb-4">
  <div class="relative flex-1 min-w-[220px]"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">…ICON search h-4 w-4…</span>
    <input class="w-full rounded-md border border-input bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search vessels…"></div>
  <select class="rounded-md border border-input bg-card px-3 py-2 text-sm">…type…</select>
  <select class="rounded-md border border-input bg-card px-3 py-2 text-sm">…status…</select>
  <span class="ml-auto text-sm text-muted-foreground tabular-nums">10 results</span>
</div>
```

## Directory photo-card (the ONE place stock imagery belongs — photographable entities only)
```html
<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
  <div class="rounded-lg border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
    <div class="relative h-36">
      <img src="…meta.imagery stock URL…" alt="" class="absolute inset-0 h-full w-full object-cover">
      <span class="absolute top-3 right-3">…status badge…</span>
    </div>
    <div class="p-4">
      <div class="font-semibold truncate">MV Northern Compass</div>
      <div class="text-xs text-muted-foreground mt-0.5">Bulk Carrier · Singapore · IMO 9811000</div>
      <div class="mt-3 flex items-center justify-between text-xs"><span class="text-muted-foreground">Utilisation</span><span class="font-semibold tabular-nums">86%</span></div>
      <div class="mt-1 h-1.5 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full bg-primary" style="width:86%"></div></div>
    </div>
  </div>
  <!-- ABSTRACT entities (GL account, policy, config) get an ICON TILE instead of a photo: -->
  <div class="rounded-lg border border-border bg-card shadow-sm p-4 flex items-start gap-3">
    <span class="h-11 w-11 rounded-xl bg-accent text-accent-foreground grid place-items-center shrink-0">…ICON…</span>
    <div class="min-w-0"><div class="font-semibold truncate">4010 — Charter revenue</div><div class="text-xs text-muted-foreground">GL account · Revenue</div></div>
  </div>
</div>
```

## Master-detail split (record focus — selector list + deep detail)
```html
<div class="grid grid-cols-12 gap-6 items-start">
  <div class="col-span-12 md:col-span-4 rounded-lg border border-border bg-card shadow-sm overflow-hidden">
    <div class="p-3 border-b border-border">…search input…</div>
    <div class="max-h-[520px] overflow-y-auto" id="<slug>-md-list">
      <button class="w-full text-left px-4 py-3 border-b border-border/60 hover:bg-muted/50 data-[active=true]:bg-accent">
        <div class="font-medium text-sm truncate">MV Coral Navigator</div><div class="text-xs text-muted-foreground">Tanker · Active</div></button>
    </div>
  </div>
  <div class="col-span-12 md:col-span-8 rounded-lg border border-border bg-card shadow-sm" id="<slug>-md-detail">
    <div class="flex items-start gap-4 p-5 border-b border-border">
      <img src="…thumb (photographable only)…" class="h-16 w-16 rounded-lg object-cover shrink-0" alt="">
      <div class="min-w-0 flex-1"><div class="text-lg font-bold font-display">MV Coral Navigator</div>
        <div class="text-sm text-muted-foreground">IMO 9811001 · Flag: Panama · Built 2015</div></div>
      …status badge… …outline button…
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 border-b border-border">…key fact tiles: label + bold value…</div>
    <div class="p-5">…related-items tabs (charters / payments / certificates) + timeline…</div>
  </div>
</div>
```

## Calendar / agenda (schedule pages — month-lite + upcoming rail)
```html
<div class="grid grid-cols-12 gap-6 items-start">
  <div class="col-span-12 xl:col-span-8 rounded-lg border border-border bg-card shadow-sm p-5">
    <div class="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground mb-2">…Mo…Su…</div>
    <div class="grid grid-cols-7 gap-1 text-sm" id="<slug>-cal"><!-- day cells -->
      <div class="aspect-square rounded-md p-1.5 hover:bg-muted/60"><span class="text-xs">18</span>
        <div class="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary mx-auto"></div></div></div>
  </div>
  <div class="col-span-12 xl:col-span-4 rounded-lg border border-border bg-card shadow-sm divide-y divide-border/60" id="<slug>-agenda">
    <div class="flex items-center gap-3 p-4"><div class="rounded-md bg-accent text-accent-foreground text-center px-2.5 py-1"><div class="text-[10px] font-bold uppercase">Mar</div><div class="text-sm font-bold leading-none">18</div></div>
      <div class="min-w-0"><div class="text-sm font-medium truncate">Board Meeting — MV Meridian Star</div><div class="text-xs text-muted-foreground">Virtual · Teams</div></div>
      <span class="ml-auto text-xs text-muted-foreground whitespace-nowrap">Q1</span></div>
  </div>
</div>
```

## WIP strip (leads `board` pages — per-stage counts + aging)
```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
  <div class="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between">
    <div><div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Raise</div>
      <div class="text-lg font-bold tabular-nums">4</div></div>
    <span class="text-xs text-warning font-semibold">2 &gt; 7d</span>
  </div>
</div>
```

## Activity feed with chat + attachment (context rails / rail-right panels)
```html
<div class="space-y-4" id="<slug>-activity">
  <div class="flex gap-3"><div class="h-8 w-8 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0" style="background:#2563eb">EF</div>
    <div class="min-w-0"><div class="text-sm"><b>Elena Farah</b> <span class="text-muted-foreground">raised</span> <a class="text-primary font-medium">PAY-0114</a></div>
      <div class="text-xs text-muted-foreground">10:15</div>
      <div class="mt-1.5 rounded-lg rounded-tl-sm bg-accent text-accent-foreground text-sm px-3.5 py-2.5 w-fit max-w-[260px]">Docking invoice attached — needs sign-off before Friday.</div>
      <div class="mt-1.5 flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 w-fit">
        <span class="h-8 w-8 rounded-md bg-accent text-accent-foreground grid place-items-center">…ICON file…</span>
        <div><div class="text-xs font-semibold">drydock-invoice.pdf</div><div class="text-[11px] text-muted-foreground">1.2 MB</div></div>
        <button class="text-muted-foreground hover:text-foreground ml-1">…ICON download h-4 w-4…</button></div></div></div>
</div>
```

## Dense table variant (`operations` pages — more rows per screen)
Same table recipe with: `text-[13px]`, cells `px-4 py-2`, no per-row hover buttons (row click opens
detail), sticky header `thead class="sticky top-0 bg-card"` inside a `max-h-[480px] overflow-y-auto` wrapper.

---

# HERO-BAND ADDENDUM (gradient anchors — `design.gradients` present, e.g. `checkpoint`)

When the app's design slice carries `gradients` (the anchor's shell is the `hero-band` archetype:
rounded floating canvas, pastel gradient band, flush putty rail), parts get FIVE extra template
slots and a stricter anatomy, learned from the Compliance Checkpoint source design (2026-08-07,
verified component-by-component on Vendor Onboarding). The shell copies each template's innerHTML
into its band/sidebar slot on role switch — **templates carry FINAL STATIC HTML** (scripts inside
never execute); build them in your load-time script from SEED, exactly like any dynamic region.

Extra shell CSS available: `.frost` (frosted glass chip) · `.eyebrow-mono` (mono uppercase
tracking-wide label) · `.bar-striped` (dashed candy-stripe "needs action" meter variant) ·
gradient vars `--grad-hero/-brand/-success/-review/-danger/-warning`. Also automatic: cards with
`rounded-lg border border-border bg-card` drop their hairline for layered shadows; labels with
`text-[13px] text-muted-foreground` render as mono eyebrows; `button.rounded-md` becomes a pill;
`input.pl-9` search fields become underline-only.

## The five slot templates (all built from SEED in your load script)

```html
<template class="hero"><!-- meter strip: one flex row of proportional pastel bars -->
  <div class="flex items-end gap-2.5">
    <div class="min-w-0" style="flex:8">
      <div class="eyebrow-mono !text-[9.5px] mb-1.5 pl-0.5">Moving on time</div>
      <div class="h-10 rounded-full flex items-center gap-2.5 px-2" style="background:var(--grad-success)">
        <span class="h-5 w-5 rounded-full bg-white/90 grid place-items-center"><span class="h-1.5 w-1.5 rounded-full bg-foreground/60"></span></span>
        <b class="tabular-nums text-sm">8</b><span class="text-xs text-foreground/60 truncate">within SLA</span></div></div>
    <!-- needs-action variant: dashed candy-stripe, dark ink, NO solid gradient -->
    <div class="min-w-0" style="flex:5">
      <div class="eyebrow-mono !text-[9.5px] mb-1.5 pl-0.5">Register needs action</div>
      <div class="h-10 rounded-full flex items-center gap-2.5 px-2 bar-striped"><b class="tabular-nums text-sm">5</b></div></div>
  </div>
</template>

<template class="hero-fig"><!-- inline headline beside the page title: "Register 16 requirements tracked" -->
  <span class="font-display font-bold tracking-tight leading-none text-[clamp(28px,3.5vw,44px)] tabular-nums">16</span>
  <span class="text-base font-medium text-muted-foreground">requirements tracked</span>
</template>

<template class="hero-side"><!-- 2–3 right-of-title stat clusters -->
  <div class="flex items-center gap-2.5">
    <div class="frost h-8 w-8 rounded-full grid place-items-center font-mono text-xs text-muted-foreground">#</div>
    <div class="leading-tight"><div class="eyebrow-mono !text-[9.5px]">Register</div>
      <div class="text-sm font-semibold">POF-HSE-FR-091</div></div></div>
</template>

<template class="hero-cta"><!-- the black pill, wired to a REAL nav action — never a dead button -->
  <button onclick="document.querySelector('[data-nav=<slug>-<page>]')?.click()"
    class="h-9 px-5 rounded-full text-[12.5px] font-bold"
    style="background:hsl(var(--foreground));color:hsl(var(--background));box-shadow:0 4px 12px rgba(20,22,28,.28)">New change</button>
</template>

<template class="side-foot"><!-- sidebar health strip: segmented 7px bar + counts -->
  <div class="eyebrow-mono !text-[9.5px] mb-2">Pipeline health</div>
  <div class="flex h-[7px] rounded-full overflow-hidden gap-[2px]">
    <span style="flex:11;background:var(--grad-success)"></span>
    <span style="flex:3;background:var(--grad-review)"></span>
    <span style="flex:2;background:var(--grad-danger)"></span></div>
  <div class="flex justify-between text-[11px] text-sidebar-muted mt-2"><span>11 approved</span><span class="font-mono">of 16</span></div>
</template>
```

## Anatomy upgrades that replace the base recipes on gradient anchors

- **KPI card**: eyebrow label (`text-[13px] text-muted-foreground` — auto mono-uppercase) + 28px
  pastel icon tile top-right (`h-7 w-7 rounded-lg grid place-items-center` +
  `style="background:var(--grad-…)"` + 14px inline stroke SVG in `text-muted-foreground`); value row
  `text-2xl font-bold tabular-nums` with a small muted unit ("of 6", "days"); sub-note below.
- **Sign-off / queue row**: soft pastel-gradient row (`rounded-[14px]`,
  `background:var(--grad-review)` — `--grad-warning` when at-risk) with a stacked left figure
  (bold `36d` over a mono 9px "waiting" microlabel), bold title, muted meta, actions right.
- **Donut**: conic-gradient of the pastel endpoint colors, `bg-card` inner circle with big tabular
  total + mono "TOTAL" microlabel, legend rows of dot + label + bold tabular value.
- **Bars-in-track**: label row (name left, mono meta right), 26px `rounded-[9px]` bar on
  `bg-muted`-style track with the value INSIDE the fill.

Rule of the band: figures come from SEED, actions target real nav ids. Decorative dead chrome
(an Export that exports nothing, a fake "synced 2m ago") is out of contract.
