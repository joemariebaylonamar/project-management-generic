# WBS hierarchy (Phase → Deliverable → Task → Subtask) — design

Date: 2026-09-30 · App: `ITPMD_Project_Hub_A00` (development-landbank-ai) · BRD §8.3 schedule (ITPH-0004 – 0016)

## Goal

Give each project's schedule the PMBOK work breakdown structure:

```
PORTFOLIO                      (unchanged — project field)
 └── PROJECT                   (unchanged)
      ├── PHASE                (summary)
      │    ├── DELIVERABLE     (summary, or a work item when it has no children; PM ticks Accepted)
      │    │    └── TASK       (work item, or summary when it has subtasks)
      │    │         └── SUBTASK (work item)
      │    └── ◆ MILESTONE     (phase gate: zero duration, ₱ value, LD — as today)
      └── …
```

Today the schedule is a flat list of activities and milestones linked only by predecessors
(`p.activities`, each with `id`, `preds`, `ms`, …). A PM must be able to build a phased plan, see it as
an indented tree in the table and the Gantt, with parent rows rolling up, while every existing figure
(overall %, forecast, health, S-curve, My tasks, milestones, LD, PSR, LEAF) keeps working.

## Decisions (agreed 2026-09-30)

| # | Decision |
|---|---|
| W1 | Full standard: Phase, Deliverable, Task, Subtask as levels; milestones are points (◆), never containers. |
| W2 | Deliverable acceptance: the PM ticks **Accepted**; the date is recorded. No approval step. |
| W3 | Flexible placement (rules below); levels may be skipped; top-level tasks allowed. |
| W4 | Existing projects stay flat; the PM groups them with **Move under…**. No data migration. |
| W5 | Predecessors only on work items (tasks, subtasks, leaf deliverables, milestones). Summary rows never have predecessors. |
| W6 | Approach A: every row is an Activity record; the UI splits rows into work items and summary rows at load. |

## Data model

### Kissflow — `ITPMD_Activity_A00`, five new fields

| Field id | Type | Purpose |
|---|---|---|
| `item_type` | Select: Phase / Deliverable / Task / Subtask / Milestone | the row's level |
| `parent_code` | Text | short id of the parent row (`wbs_code` of the parent); blank = top level |
| `deliverable_accepted` | Boolean | PM tick (deliverables only) |
| `accepted_date` | Date | set when ticked, cleared when unticked |
| `sort_order` | Number | order among siblings (for Move up/down) |

Existing fields keep their meaning: `wbs_code` holds the short id; `is_milestone` stays in sync with
`item_type = Milestone`; `is_summary` is written by the UI (true when the row has children).

Short-id prefixes for new rows: **P** phase, **D** deliverable, **N** task/subtask, **X** milestone
(numbered as today: prefix + running count in the project). Existing ids (A1, M1, N2, X1 …) never change.

Legacy records (blank `item_type`): read as Milestone when `is_milestone`, else Task. Blank
`parent_code` = top level. Blank `sort_order` = keep today's order (baseline start, then `wbs_code`).

### In the UI — two lists per project

- `p.activities` — **work items only**: leaf tasks, leaf subtasks, deliverables without children,
  milestones. This is the list every existing consumer reads; its shape is unchanged, plus
  `type`, `parent`, `order`, `accepted`, `acceptedDate`.
- `p.wbs` — **summary rows**: phases (always), and deliverables/tasks that have children. Fields:
  `id`, `type`, `name`, `parent`, `order`, `accepted`, `acceptedDate`, `_kfId`, and rolled-up
  `bStart`, `bFinish`, `fStart`, `fFinish`, `dur`, `pct` (never typed by a user).

Rule: **a row with children is a summary row; a row without children is a work item** — except a phase,
which is always a summary row (an empty phase shows "—" for dates and %).

### Roll-up (computed after `schedule(p)`, bottom-up)

- start = earliest child start; finish = latest child finish (baseline and forecast separately)
- duration = working days between rolled-up start and finish
- % complete = child % weighted by child duration (same method as the project's overall %); milestones
  are excluded from the weighting, as today
- status = the worst `actState()` among the children: Behind (red) > Behind (amber) > In progress / Ahead >
  Not started > Complete; a summary row is Complete only when every child is Complete

### Placement rules

| Type | Allowed parents |
|---|---|
| Phase | top level only |
| Deliverable | top level, Phase |
| Task | top level, Phase, Deliverable |
| Subtask | Task only |
| Milestone | top level, Phase, Deliverable |

A row with children cannot be deleted. A row cannot be moved under itself or its own descendant.

### Leaf → summary conversion

When a work item (task or deliverable) receives its first child:
1. it moves from `p.activities` to `p.wbs`;
2. its predecessors, owner, % complete and actual dates move to that first child;
3. every work item that listed it as a predecessor now lists the first child instead;
4. a Schedule change-history line records it ("N5 Review now groups N9; predecessors moved to N9").

When the last child of a deliverable or task is deleted or moved away, the row becomes a work item
again with duration 1 and no predecessors. Phases stay summary rows.

### Outline numbers

Computed for display from the tree and `order`: `1`, `1.2`, `1.2.1`. Never stored.

## Schedule tab — table

- Indented outline; new first column **WBS** (outline number) beside the existing **ID** column; all
  existing columns kept.
- Summary rows: bold, read-only (no owner / % / date inputs), rolled-up values, worst-child status.
- ▾/▸ per summary row; all expanded by default; collapsed state kept in `localStorage` per project
  (try/catch); **Expand all** / **Collapse all** buttons.
- Deliverables: **Accepted** checkbox (PM only) with the date, e.g. "Accepted 10 Oct"; works for leaf
  and summary deliverables.
- Work items keep today's inline edits (owner, actual start/finish, % complete, manual forecast) and
  the Discuss button.
- Existing filters apply to work items; ancestors of a visible work item stay visible.
- **Add to schedule** form (replaces "Add activity or milestone"):
  - Type (Phase / Deliverable / Task / Subtask / Milestone)
  - Under — only parents the placement rules allow for that type, plus "(top level)" where allowed
  - Duration, Predecessors, Assign to, Milestone value — shown only for types that use them
    (Phase shows only Name; a Deliverable shows Duration/Assign to, used while it has no children)
  - new rows go last among their siblings
- Row **⋯** menu (PM only): **Move under…** (parent picker), **Move up**, **Move down**, **Delete**
  (existing Confirm pattern; blocked while the row has children).
- Permissions unchanged: only the PM edits structure; team members update only their own work items.

## Gantt

- Same tree, same collapse state as the table.
- Summary rows: thin dark bracket bar from rolled-up start to finish with the % shaded; not draggable.
- Work items: unchanged (drag to move if not started, drag right edge for duration, dependants follow,
  grey baseline bars). Milestones stay ◆.
- A collapsed phase keeps its bracket bar and hides its children.

## Scheduling

`schedule(p)` is unchanged and runs on `p.activities` (work items). An item with no predecessors starts
at the project start date, exactly as today; parent rows never push their children. Summary rows are
rolled up after scheduling. **Set new baseline** also stores the summary rows' rolled-up baseline dates.

## Other screens

| Area | Change |
|---|---|
| Overview %, forecast, health | none (work items only) |
| S-curve | none |
| My tasks | none, plus a breadcrumb per item: "Initiation › Project charter" |
| Milestones list, LD | none |
| PSR | Schedule highlights gains a **Phases** table (name, dates, %, status) and a **Deliverables** table (name, due date = rolled-up or own finish, accepted Yes/No + date) |
| Discussions "Link to activity" | phases and deliverables are linkable (`act:<id>` refs resolve in both lists) |
| LEAF | can answer "which phase are we in?" (the phase containing today, else the next one) and "which deliverables are not yet accepted?"; what-if still runs on work items |

## Save / load (`src/bridge.js`)

- **Load:** read the five fields with the legacy defaults above, then `buildWbs()` (see below) returns
  `{ activities, wbs, warnings }`.
- **Save:** summary rows are written as Activity records like work items: rolled-up dates into
  `planned_start/finish` and `baseline_start/finish`, rolled-up % into `percent_complete`,
  `is_summary: true`, `responsible_person` omitted. The existing diff (write only changed rows, delete
  removed ones) runs over both lists.
- A leaf → summary conversion is saved in the same save pass: the parent, the new child, and every row
  whose predecessors were rewired.

### New module `src/wbs.js` (pure, unit-tested — the `discussions.js` pattern)

- `buildWbs(rows)` → tree, split into work items / summary rows, outline numbers, warnings
- `rollUp(wbs, activities, workdayFns)` → rolled-up fields on summary rows
- `allowedParents(type, rows)` → parent choices for the Add / Move forms
- `addChild(state, parentId, item)` → performs leaf → summary conversion when needed
- `moveRow(state, id, newParent)`, `reorder(state, id, dir)`, `canDelete(state, id)`

The prototype patches in `scripts/make-index.mjs` call these through `window.__ITPH_WBS`.

## Kissflow schema change

Add the five fields to `ITPMD_Activity_A00` through `runs/current/app-spec.json` and the engine's
field-level apply. **No full re-apply** (known to orphan dashboard pages). No role changes (same form,
same grants). This is the only step that changes Kissflow's structure; it runs only after the user
confirms.

## Errors and edge cases

- Orphan (`parent_code` names a missing row): shown at top level with a ⚠ badge.
- Invalid placement (e.g. a Subtask under a Phase, set directly in Kissflow): shown where it is with ⚠;
  never moved silently.
- Parent cycle: broken at load; the row that closes the cycle becomes top level with ⚠.
- Save errors: the existing red "Couldn't save to Kissflow" message.

## Testing

- **Unit (`npm test`)**: tree build, legacy defaults, roll-ups (dates, weighted %, worst status),
  outline numbers, placement rules, leaf → summary conversion incl. predecessor rewiring, summary →
  leaf on last-child removal, move/reorder, delete guard, orphan and cycle handling.
- **Preview (:3003, live dev data)**: on **Joms Project 2** build Phase "Initiation" → Deliverable
  "Project charter" → two tasks → ◆ "Charter approved"; reload and confirm it persists; confirm a flat
  project (Loan Origination) shows identical overall %, forecast finish and S-curve before and after;
  check the PSR Phases/Deliverables tables.
- **Inside Kissflow**: a short PM checklist run by the user (framed app is not scriptable).

## Rollout order

1. Kissflow fields (after user confirmation)
2. `src/wbs.js` + tests
3. Bridge load/save
4. Schedule table (tree, roll-ups, Accepted)
5. Add to schedule + ⋯ Move/Reorder/Delete
6. Gantt
7. PSR tables, My tasks breadcrumb, discussion links, LEAF answers
8. Deploy (zip) and user checklist in Kissflow

## Out of scope

- Predecessors on summary rows (W5)
- Deliverable approval workflow (W2)
- Auto-grouping existing projects into phases (W4)
- Program level between Portfolio and Project
- Drag-and-drop reordering in the table or Gantt (Move up/down and Move under… instead)
