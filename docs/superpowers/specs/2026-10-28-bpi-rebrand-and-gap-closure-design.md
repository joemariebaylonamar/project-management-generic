# BPI rebrand and requirements gap closure — design

Date: 2026-10-28. Status: DRAFT, awaiting approval. Nothing built yet.

## Intent

The app (ITPMD Project Hub, `itpm-ui`) was built for LANDBANK. It is now for BPI (TPMO is the primary stakeholder). Two jobs:

1. Rebrand: theme, colours, logo, loader, AI agent.
2. Close the gaps between the app and `docs/Solutioning_Requirements_Elicitation.md` (36 requirements, all P1 / Essential / POC).

## How the app works (constraints)

- UI is the prototype HTML (`../ITPMD_Project_Hub_Prototype_LANDBANK (4).html`), transformed into `itpm-ui/index.html` by `scripts/make-index.mjs`. Extra UI patches live in `scripts/wbs-ui.js`. Persistence is `src/bridge.js` (load Kissflow records into state `S`, diff-save back). Branding is in `src/app-theme.css`, `src/loader.js`, `public/landbank-logo.webp`, and the LEAF assistant block of the prototype (AI_IMG, AI_HERO, prompts).
- Kissflow models today: Project, Activity, Risk, Issue (case), Action Item (case), Cost Entry, Holiday Calendar, Hub Settings, Project Status Report (process), Portfolio Status Report, Notification, Discussion Message/Read.
- Decision: edit the prototype source + make-index + scripts, then regenerate `index.html`. Do not hand-edit generated `index.html`.

## Part 1 — Rebrand (my call, change if wrong)

| Item | LANDBANK now | BPI |
| --- | --- | --- |
| Primary | green `hsl(122 45% 34%)` | BPI red (sampled from `docs/bpi-logo.webp`, about `#B3141B`) |
| Accent | lime `#74BC44`, gold `--gold` | BPI gold (sampled from logo crest) |
| Sidebar | dark green | deep BPI red / near-black red; active item in gold |
| Neutrals | green-tinted greys | warm neutral greys |
| Font | IBM Plex Sans | keep (no BPI font supplied) |
| Dark mode | present | keep, re-derived from the new palette |
| Logo | `landbank-logo.webp` | `docs/bpi-logo.webp` in rail, loader, favicon, title |
| Loader | animated LANDBANK leaf SVG | new BPI animation (logo with crest shimmer + ring) |
| Agent | LEAF, "LANDBANK Enhanced AI Framework" | **BPI Ava**, "AI Virtual Assistant"; `docs/ava-ai.png` as avatar and hero; greeting "Hi! I'm Ava"; quick actions adapted to project hub |
| Text | LANDBANK / ITPMD | BPI / TPMO; the product name "ITPMD Project Hub" stays unless told |

Status/RAG colours (red/amber/green) stay semantic and distinct from the brand red (brand red must not read as "Red status": use a deeper brand red, and keep RAG pills as filled chips with labels).

## Part 2 — Gap matrix

Legend: OK = covered, P = partial, G = gap. First pass from code search; each row is re-verified in the plan before building.

### Workplan
| Req | Status | Note |
| --- | --- | --- |
| WP001 task, duration, start, resource | OK | Activity form |
| WP002 parent/child | OK | WBS hierarchy shipped (Sep 30) |
| WP003 predecessor/successor | P | predecessors only (`predecessor_codes`); successor not shown/taggable |
| WP004 leads/lags | G | no lag field; scheduler is finish-to-start only |
| WP006 % complete | OK | |
| WP007 auto actual start/finish | OK | set on first progress / 100% |
| WP008 milestones | OK | |
| WP010 critical path | OK | verify float-based, not only "critical" label |
| WP015 holiday calendar applied to plan | OK | |
| WP017 baseline task/duration/start/finish | P | baseline dates exist; duration not stored in a baseline snapshot |
| WP018 keep at least 10 rebaselines | P | version list exists in memory; need durable store with at least 10 snapshots |
| WP022 choose baseline driving %Planned/%Actual/RAG | G | always latest baseline |
| WP023 PV and EV per task | P | project-level PV/EV exist; per task missing; definitions to be confirmed |
| WP027 schedule KPI = %Actual / %Planned | G | health uses variance days; add KPI, handle %Planned = 0 |
| WP035 consolidate sub-initiative schedules into program schedule | G | no program entity |
| WP036 roll up to program/MVP KPIs | G | |

### Project Binder
| Req | Status | Note |
| --- | --- | --- |
| PB003 risk/issue register, 20+ fields | P | Risk and Issue exist; missing event type/category, milestone link, raised by, org unit, action item cols, results, last status update, etc. |
| PB004 aging RAG | G | `days_open` only; add RAG (thresholds in clarifications) |
| PB010 CR tally of approved reschedules/rebaselines by month | G | no Change Request entity |
| PB013 metrics log: aging tally for dependencies, risks, issues, defects, CRs | G | no dependency, defect, CR entities |
| PB014 overall leading-indicator RAG = worst of risks, issues | G | |

### WSR
| Req | Status | Note |
| --- | --- | --- |
| WSR001.2 auto-pull | P | monthly PSR pulls figures; WSR is weekly |
| WSR002 autofit to template | G | template not supplied (open question) |
| WSR004 KPI RAG (0.70 / 0.90) | G | |
| WSR010 nine qualitative fields | G | PSR has one narrative field |
| WSR016 download PPT + PDF, 3 pages | G | |

### Dashboard
| Req | Status | Note |
| --- | --- | --- |
| DAS002 monthly project count by status, vs prior month | P | statuses today: Planning/Active/On Hold/Closed; need 7 required statuses |
| DAS003 weekly count by RAG vs last report date | G | needs weekly history snapshots |
| DAS004 quarterly milestone forecast on time/at risk/delayed | G | |
| DAS008 MVP/release per quarter | G | no release entity |
| DAS010 filters date, segment, RAG | P | |
| DAS011 live update from WSR inputs | G | |

### Admin and export
| Req | Status | Note |
| --- | --- | --- |
| ADM004 admin creates project profile | P | PM creates projects; admin path to verify |
| ADM006 admin templates (workplan, WSR, dashboards) | G | |
| ADM012 admin creates reports/dashboards | G | |
| REP001 export Excel, PPT, CSV, PDF | G | |

## Part 3 — Design decisions (proposed)

1. **Data**: new Kissflow forms, created draft-first in the dev app via the kf-author engine: `Baseline Snapshot` (project, version, task rows JSON, selected flag), `Change Request`, `Defect`, `Dependency`, `Program`, `Release/MVP`, `Weekly Status Report` (nine text fields + frozen KPI/RAG snapshot per week), `Report Template`. Extra fields on Activity (lag, lead), Risk/Issue (register fields), Project (segment, program, new status values). **This mutates the live Kissflow app: needs your explicit go-ahead.**
2. **Scheduler**: add lead/lag to the scheduling engine (`src/wbs.js` + prototype `schedule()`), successors derived from predecessors.
3. **KPI**: schedule KPI = %Actual / %Planned against the selected baseline. %Planned = 0 → KPI shown as "n/a", RAG Green (proposed; confirm). Thresholds from WSR004. Boundaries: Red ≤ 0.70, Green ≥ 0.90, Amber strictly between (confirm). Aging: Red ≥ 8 days, Amber 3–7, Green ≤ 2 (2 resolves to Green; confirm).
4. **WSR export**: PDF via browser print stylesheet (3 pages); PPTX via PptxGenJS in the browser. No template supplied, so a 3-page layout is built from the field list. Swap to the real template when provided.
5. **Dashboards**: new Portfolio tabs for DAS002/003/004/008 using existing chart code; weekly RAG history comes from saved WSR snapshots.
6. **Export**: CSV and Excel (`.xlsx` via SheetJS) for every table; PPT/PDF for reports.
7. **Admin**: project profile wizard, template editor (task template, WSR sections, dashboard widget set), simple report builder (choose entity, columns, filters, save).
8. **Ava**: gets the new entities in its tool context (CRs, defects, dependencies, KPI).

## Phases (each shippable)

1. Rebrand (theme, logo, loader, Ava). No backend change.
2. Scheduling: lead/lag, successors, baseline snapshots (10+), baseline selector, per-task PV/EV, KPI + RAG, program roll-up.
3. Project Binder: register fields, aging, CR, defect, dependency, metrics log, leading-indicator RAG.
4. WSR: weekly report, nine fields, PDF/PPTX.
5. Dashboards DAS002–011.
6. Admin templates/report builder, REP001 exports.

## Non-goals

- No change to Kissflow workflow/approval steps of the existing PSR.
- No real BPI WSR PPT template fidelity until supplied.
- No auth/role redesign (reuse existing six roles; TPMO maps to PSC Member / Hub Administrator, to confirm).

## Open questions for you

1. OK to create the new Kissflow forms/fields in the dev app (draft-first, then publish)?
2. Is there a BPI WSR PPT template and BPI brand guide (exact red/gold hex)? Otherwise I sample the logo.
3. Confirm clarification defaults in decision 3 (aging at exactly 2 days, KPI boundaries, %Planned = 0, PV/EV = budget-weighted, as already used in Financials).
4. Is TPMO an existing role, or a new role to add?

## Progress log

- 2026-10-28 Phase 1 (rebrand) done. Removed S-curve and Discussions; Ava hidden.
- 2026-10-28 Phase 2a done: lead/lag (WP004), successors (WP003), critical path (WP010, was a gap), schedule KPI + RAG (WP027, WSR004).
- 2026-10-28 Phase 2b done: baseline snapshots, all kept (WP017, WP018), baseline selector driving %Planned / KPI / RAG (WP022), per-task PV/EV in Financials (WP023), programs with consolidated schedule and KPI in Portfolio (WP035, WP036), TPMO role.
  - Kissflow: new forms `ITPMD Baseline`, `ITPMD Program`; Project gets `Program` (reference) and `Active_Baseline`; role `TPMO` (portfolio view + administration in the UI).
  - Incident: the first apply used a stale `runs/itpmd-project-hub/id-map.json` and re-keyed the Project PM/DH/Sponsor fields, dropping their values. Fixed by correcting the id-map to the live role ids and re-applying; PM/DH/Sponsor on the 4 seeded projects were re-set to the dev user. Always diff `id-map.json` role ids against `app_role/list` before any apply.
- Note: the old project-level PV/EV S-curve went away with the S-curve tab; PV/EV now appears per task in Financials.
- 2026-10-28 Phase 3 done (project binder): new Kissflow form `ITPMD Binder Item` (+6 option lists). Project tab "Binder": register with the 21 PB003 fields for risks, issues, dependencies, defects and change requests (risks and issues keep their own record and get a linked entry for the extra fields); aging RAG (PB004: Red 8+ days past target, Amber 3-7, Green up to 2); CR tally by approval month (PB010); metrics log across the five types and leading-indicator RAG (PB013, PB014), also rolled up on the Portfolio. Verified end to end against the dev app with test records (removed afterwards).
- 2026-10-28 Phase 4 done (weekly status report): new Kissflow form `ITPMD Weekly Report` (one record per project per week: the nine highlight fields, status Draft/Final, frozen KPI, RAG and snapshot). Project tab "Weekly report": pulls schedule KPI, health, finance, leading indicators, milestones, top risks/issues and next week's activities from live data (WSR001.2); KPI RAG per WSR004; nine highlights (WSR010); PPT and PDF download only when all nine are filled (WSR016), from one layout model so both match; long text shrinks to fit its box (WSR002, no BPI template supplied yet so the layout is generic). Libraries added: pptxgenjs, jspdf (loaded on demand). Verified end to end with a test record (removed afterwards). Weekly records also feed DAS003 later.
- 2026-10-28 Phase 5 done (dashboards): new Kissflow form `ITPMD Release` (MVP/release plan, forecast, implemented date); weekly report gains `Project_Status`; project statuses extended (Ongoing, Completed, Implemented, Cancelled; legacy Active/Closed still read). New sidebar view "Dashboards": status by month vs previous month (DAS002, 7 statuses, Ongoing split On-Track/At Risk/Not Met by RAG), RAG count by week vs last reporting date (DAS003), quarterly milestone forecast with realistic dates for delayed ones (DAS004, on time / at risk up to 7 days late / delayed beyond that or past due), MVP/release plan per quarter (DAS008), filters for segment, RAG and date window (DAS010), refresh every minute from Kissflow so other users' weekly reports, releases and status changes appear (DAS011). Releases are managed in the project's Binder tab; the project status is set on the Overview. Decision: no silent writes; month/week history comes from saved weekly reports plus the live current period.
- 2026-10-28 Phase 6 done (admin, templates, report builder, exports): new Kissflow form `ITPMD Template` (workplan, WSR and dashboard templates, and saved report definitions); Hub Administrator can create projects and tasks. Configuration gains Project profiles (ADM004: admin names PM/DH/Sponsor, program, optional workplan template that schedules the new project, holiday-aware), Templates (ADM006: workplan templates, weekly report prompts and required fields, dashboard cards and default filters), Reports and dashboards (ADM012: pick dataset, columns, filters, sort, group/sum, bar chart; saved reports appear in a Reports menu). Every table in the app gets Export CSV / Excel / PPT / PDF (REP001). Verified end to end with test records (removed afterwards); the Excel output opens in LibreOffice.

## Final coverage (all 36 requirements)

| Req | Where |
| --- | --- |
| WP001, WP002, WP006, WP007, WP008, WP015 | existing (schedule, WBS, % complete, actual dates, milestones, holiday calendar) |
| WP003, WP004 | predecessors with lead/lag, successors shown (Phase 2a) |
| WP010 | critical path, computed from float (Phase 2a) |
| WP017, WP018, WP022 | baseline snapshots, all kept, baseline selector (Phase 2b) |
| WP023 | PV/EV per task in Financials (Phase 2b) |
| WP027 | schedule KPI %Actual / %Planned, n/a when nothing planned (Phase 2a) |
| WP035, WP036 | programs with consolidated schedule and KPI (Phase 2b) |
| PB003, PB004 | binder register with the 21 fields and aging RAG (Phase 3) |
| PB010, PB013, PB014 | CR tally, metrics log, leading-indicator RAG (Phase 3) |
| WSR001.2, WSR002, WSR004, WSR010, WSR016 | weekly report tab, PPT/PDF (Phase 4) |
| DAS002, DAS003, DAS004, DAS008, DAS010, DAS011 | Dashboards view (Phase 5) |
| ADM004, ADM006, ADM012 | Configuration → Project profiles, Templates, Reports and dashboards (Phase 6) |
| REP001 | export bar on every table (Phase 6) |

Open items: BPI weekly report PPT template (layout is generic until supplied); confirm the clarification defaults (PB004 2-day boundary, WSR004 boundaries, PV/EV definition, "at risk" = up to 7 days late).
