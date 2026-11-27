// Builds qa/results.json + qa/report.html from the live evidence files. Offline (no network).
import fs from "node:fs";
import { compare } from "./acl-compare.mjs";
const R = "../../"; const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const spec = J(R + "app-spec.json"), U = J("../universe.json").items, plan = J("../test-plan.json");
const idmap = J(R + "id-map.json").genToServer;
const PA = J("phaseA.json"), PB = J("phaseB.json"), PC = J("phaseC.json"), PD = J("phaseD.json"), PSR = J("psr-evidence.json"), INT = J("integrations.json");
const draftMeta = { psr: J("psr_draft.json"), project: J("project_draft.json"), activity: J("meta_activity.json"), cost: J("meta_cost.json"), portfolio: J("meta_portfolio.json") };
const ACL = compare();
const nameToForm = Object.fromEntries(spec.forms.map((f) => [f.name, f]));
const liveId = (fid) => idmap[fid] && /^Ro/.test(idmap[fid]) && ["project_manager", "department_head", "project_sponsor", "team_member"].includes(fid) ? idmap[fid] : fid;
const RES = new Map();
const rank = { fail: 6, "known-limit": 5, blocked: 4, pass: 3, "pass-weak": 2, "not-independently-grantable": 1 };
function rec(id, status, evidence, note, extra = {}) {
  const cur = RES.get(id);
  const e = { id, status, evidence, note, ...extra };
  if (!cur) { RES.set(id, { ...e, notes: [note] }); return; }
  cur.notes.push(note);
  if (rank[status] > rank[cur.status]) { Object.assign(cur, { status, evidence }); }
  else if (status === cur.status && evidence === "strong") cur.evidence = "strong";
}
const byKind = (k) => U.filter((u) => u.kind === k);

// ---------- P / D / S : live member ACL (weak: single user cannot execute AS each role) ----------
const aclTxt = (role, fid) => `live ACL ${ACL[role + "::" + fid].live}`;
for (const u of byKind("permission")) {
  const [, role, fid, lvl] = u.id.split(":"); const a = ACL[role + "::" + fid];
  const want = lvl === "edit" ? "edit" : "read";
  if (a.actual === want) rec(u.id, "pass-weak", "weak", `Granted as designed (${a.live}) -- proven by reading the live member list, not by acting as the role. Admin-key write to the flow also succeeded (create/update).`);
  else rec(u.id, "fail", "weak", `Designed ${want}, live ${a.actual === "none" ? "NO GRANT AT ALL" : a.live}. The role is ${a.actual === "none" ? "locked out of the flow" : "granted the wrong level"}.`);
}
const spl = (id) => id.split(":");
for (const u of byKind("denial")) {
  const [, role, ...rest] = spl(u.id); const f = nameToForm[rest.join(":")];
  const isChild = !!f.childOf; const fid = isChild ? f.childOf : f.id;
  const a = ACL[role + "::" + fid];
  if (a.actual === "none") rec(u.id, "pass-weak", "weak", `No member entry for this role on ${isChild ? "the parent flow of this child table" : "this flow"} in the live ACL, so the platform denies it. Not executed as that role.`);
  else if (isChild) rec(u.id, "not-independently-grantable", "weak", `Child table has no grant of its own; this role holds ${a.live} on the parent flow, so it reaches these rows through the parent. Not a denial the platform can express.`);
  else rec(u.id, "fail", "weak", `SECURITY: role has a live grant (${a.live}) on a flow the design denies.`, { security: true });
}
for (const u of byKind("scope")) {
  const [, role, fid, scope] = spl(u.id); const a = ACL[role + "::" + fid];
  if (a.actual === "none") rec(u.id, "fail", "weak", `Role has no live grant on the flow at all, so no scope can apply.`);
  else if (scope === "all") rec(u.id, "pass-weak", "weak", `Role holds flow-level access (${a.live}) with no row filter, which is what 'all' means. Not executed as the role.`);
  else rec(u.id, "known-limit", "weak", `Scope '${scope}' is a view-layer convention only (decision D29): the platform ACL is whole-flow (${a.live}), so a role can read every row through REST/reports. Cannot be proven or enforced with one identity.`);
}

// ---------- F required ----------
const FLOWKEY = { "ITPMD Hub Settings": "hub_settings", "ITPMD Holiday Calendar": "holiday", "ITPMD Project": "project", "ITPMD Activity": "activity1", "ITPMD Risk": "risk1", "ITPMD Cost Entry": "cost", "ITPMD Portfolio Status Report": "portfolio", "ITPMD Discussion Message": "dmsg", "ITPMD Notification": "notif", "ITPMD Discussion Read": "dread", "ITPMD Baseline": "baseline", "ITPMD Program": "program", "ITPMD Binder Item": "binder", "ITPMD Weekly Report": "weekly", "ITPMD Release": "release", "ITPMD Template": "template" };
const CASEKEY = { "ITPMD Issue": "issue", "ITPMD Action Item": "action" };
const childBlob = (parentId) => ({ itpmd_project: draftMeta.project, itpmd_activity: draftMeta.activity, itpmd_cost_entry: draftMeta.cost, itpmd_portfolio_report: draftMeta.portfolio, itpmd_psr: draftMeta.psr }[parentId]);
const childLive = (f) => { const blob = childBlob(f.childOf); const mid = idmap[f.id] || (idmap[f.childOf] + "__" + f.id.split("__")[1]); const model = Object.values(blob).find((v) => v?.Kind === "Model" && String(v.Id).toLowerCase() === mid.toLowerCase()); return { blob, model }; };
for (const u of byKind("field")) {
  const p = spl(u.id); const fname = p[1]; const f = nameToForm[fname];
  const last = p[p.length - 1];
  if (last === "required") {
    const fieldName = p[2]; const fs_ = f.fields.find((x) => x.name === fieldName); const lid = liveId(fs_.id);
    if (FLOWKEY[fname]) {
      const t = PA.required[FLOWKEY[fname]]?.[lid];
      if (t?.refused) rec(u.id, "pass", "strong", `Submitting with '${fieldName}' blank was refused (HTTP ${t.submitStatus}: Value is required).`);
      else rec(u.id, "fail", "strong", `Submit with '${fieldName}' blank was NOT refused (${t ? t.submitStatus + " " + t.msg : "no result"}).`);
    } else if (CASEKEY[fname]) {
      const t = PC.cases[CASEKEY[fname]].required[fs_.id];
      if (t?.refused) rec(u.id, "pass", "strong", `Creating the board item with '${fieldName}' blank was refused (HTTP ${t.status}).`);
      else rec(u.id, "fail", "strong", `Board item created without '${fieldName}'.`);
    } else if (fname === "ITPMD Project Status Report") {
      const t = PSR.required[fs_.id];
      if (t && t.submit === 400) rec(u.id, "pass", "strong", `Submitting the report with '${fieldName}' blank was refused (400 Value is required).`);
      else rec(u.id, "fail", "strong", `Not refused.`);
    } else if (f.childOf) {
      const { blob, model } = childLive(f);
      const flds = model ? Object.values(blob).filter((v) => v?.Kind === "Field" && v.Model === model.Id) : [];
      const fl = flds.find((x) => x.Id === lid);
      if (fl?.Required) rec(u.id, "pass-weak", "weak", `Child-table column is flagged Required in the live schema. Rows cannot be written through the runtime API on this app (table not addressable), so refusal was not executed.`);
      else rec(u.id, "fail", "weak", `Live child-table column is not flagged Required.`);
    }
  } else if (last === "computed") {
    const fieldName = p[2]; const fid = f.fields.find((x) => x.name === fieldName).id;
    computed(u, f, fid, fieldName);
  } else {
    // PSR Draft step permission overrides:  F:ITPMD Project Status Report:Draft:<Field>:<Mandatory|Editable>
    const fieldName = p[3]; const want = last; const fs_ = f.fields.find((x) => x.name === fieldName); const lid = liveId(fs_.id);
    const d = draftMeta.psr; const draft = d.Activity_zfcq6a; const col = (c) => d[c]?.["Column::Field"]?.[0];
    const got = draft["Activity::Permission"].map((x) => d[x]).find((P) => col(P.Column) === lid)?.Permission;
    if (got !== want) rec(u.id, "fail", "weak", `Live Draft-step permission for ${fieldName} is ${got}, designed ${want}.`);
    else if (want === "Mandatory" && fieldName === "Narrative_Update") rec(u.id, "fail", "strong", `Live step permission says Mandatory, but submitting a report with the narrative blank was ACCEPTED (200) and moved to Department Head Review -- the mandatory flag is not enforced by the API.`);
    else if (want === "Mandatory") rec(u.id, "pass", "strong", `Mandatory at Draft in the live workflow and a blank Project was refused on submit.`);
    else rec(u.id, "pass-weak", "weak", `Live Draft-step permission is ${got} as designed (read from the published workflow definition); value written at create time.`);
  }
}
function computed(u, f, fid, fname) {
  const RB = PA.readback; const has = (o, k) => o && o[k] !== undefined && o[k] !== null;
  const cl = {
    "ITPMD Activity": {
      planned_duration_days: () => (RB.activity1.planned_duration_days === 4 && RB.activity2.planned_duration_days === 10 ? ["pass", "Planned duration computed (4 and 10 days)."] : ["fail", "Planned duration wrong."]),
      weighted_complete_value: () => (RB.activity1.weighted_complete_value === 4 && PD.updates.activity.wcv === 1.6 ? ["pass", "Weighted value 4 at 100% and recomputed to 1.6 after the percent was updated to 40."] : ["fail", "Weighted value wrong."]),
      missed_milestone_flag: () => (has(RB.activity2, "missed_milestone_flag") ? ["pass", "ok"] : ["fail", "Milestone with a past baseline finish and no actual finish should be flagged 1; no value is returned (formula uses ISBLANK/TODAY)."]),
      schedule_variance_days: () => (has(RB.activity3, "schedule_variance_days") ? ["pass", "ok"] : ["fail", "Baseline finish 13 Nov vs forecast 20 Nov should give 7 days; no value is returned (formula uses ISBLANK)."]),
      status_code: () => (has(RB.activity1, "status_code") ? ["pass", "ok"] : ["fail", "100% complete with actual start should give code 3; no value is returned (formula uses ISBLANK)."]),
      status: () => ["known-limit", "100% complete shows 'In Progress' (should be 'Complete'); 0% with no actual start shows 'In Progress' (should be 'Not Started'). Formula-of-formula -- known platform limit."],
    },
    "ITPMD Risk": {
      risk_rating: () => (RB.risk1.risk_rating === 20 && PD.updates.risk.rating === 25 ? ["pass", "Rating 5x4=20, recomputed to 25 after update."] : ["fail", "wrong"]),
      risk_band_code: () => ["known-limit", "Band code not returned (reads the rating formula). Formula-of-formula -- known platform limit."],
      risk_rating_band: () => ["known-limit", `Rating 25 still shows band '${PD.updates.risk.band}' (should be Critical), and did not self-correct after the update. Known chained-formula limit.`],
      residual_risk_rating: () => (RB.risk1.residual_risk_rating === 4 ? ["pass", "Residual 2x2=4."] : ["fail", "wrong"]),
      residual_band_code: () => ["known-limit", "Residual band code not returned. Chained formula."],
      residual_risk_rating_band: () => ["known-limit", "Shows 'Low' for 4 (which happens to be right) but the chained formula is unreliable (see Risk_Rating_Band); not provable."],
      escalation_flag: () => ["known-limit", "High/Critical rating should escalate (flag 1) but flag stays 0 -- depends on the broken band. Chained formula."],
      critical_flag: () => ["known-limit", "Critical rating should set the critical flag to 1 but it stays 0 -- depends on the broken band. Chained formula."],
    },
    "ITPMD Issue": {
      days_open: () => (has(PC.cases.issue.readback, "days_open") ? ["pass", "ok"] : ["fail", "Days open not returned for an issue with a past target date (formula uses TODAY/DATEDIFF)."]),
      critical_flag: () => (PC.cases.issue.readback.critical_flag === 1 ? ["pass", "Priority Critical gives critical flag 1."] : ["fail", "wrong"]),
      escalation_flag: () => (has(PC.cases.issue.readback, "escalation_flag") ? ["pass", "ok"] : ["known-limit", "Critical priority should escalate (flag 1); no value returned because it reads the Days Open formula. Chained formula."]),
    },
    "ITPMD Action Item": { overdue_flag: () => (has(PC.cases.action.readback, "overdue_flag") ? ["pass", "ok"] : ["fail", "Action item due 1 Oct (past) should be flagged overdue 1; no value returned (formula uses TODAY())."]) },
    "ITPMD Project Status Report": { sponsor_approval_required: () => ["fail", "A Red-health report (and one with the project flag) should compute 'Yes' so it routes to the Sponsor; the field came back empty, so the Sponsor step is never triggered by the rule. (Select-typed formula result is not stored.)"] },
  };
  if (fname !== undefined && f.id === "itpmd_project") {
    const depth1 = ["weighted_percent_complete", "schedule_variance_days", "current_approved_budget", "contingency_remaining", "contingency_utilization_percent", "cost_performance_percent"];
    if (depth1.includes(fid)) rec(u.id, "fail", "strong", `No value returned for a project with 3 activities, a cost entry, a critical risk and a critical issue. Root cause: every cross-flow roll-up on the Project is wired to the Project itself instead of Activity/Cost Entry/Risk/Issue/Action Item, so the inputs are always empty.`);
    else rec(u.id, "known-limit", "strong", `No value returned. Chained formula (reads other formula fields) -- known platform limit; also blocked upstream by the broken roll-ups.`);
    return;
  }
  const fn = cl[f.name]?.[fid];
  if (!fn) { rec(u.id, "blocked", "none", "no computed assertion defined"); return; }
  const [st, note] = fn(); rec(u.id, st, "strong", note);
}

// ---------- R references ----------
const refCases = {
  "ITPMD Project:Program": () => PA.readback.project.program?._id === PA.created.program.id && PA.readback.project.program?.program_name === "QA-Program",
  "ITPMD Activity:Project": () => PA.readback.activity1.project?._id === PA.created.project.id && PA.readback.activity1.project?.project_name === "QA-Project Alpha",
  "ITPMD Risk:Project": () => PA.readback.risk1.project?.project_name === "QA-Project Alpha",
  "ITPMD Issue:Project": () => PC.cases.issue.readback.project?.project_name === "QA-Project Alpha",
  "ITPMD Issue:Hub_Settings": () => PC.cases.issue.readback.hub_settings?.issue_aging_period_days === 5,
  "ITPMD Action Item:Project": () => PC.cases.action.readback.project?.project_name === "QA-Project Alpha",
  "ITPMD Action Item:Related_Issue": () => PC.cases.action.readback.related_issue?._id === PC.cases.issue.create.id && PC.cases.action.readback.related_issue?.issue_title === "QA-Issue 1",
  "ITPMD Cost Entry:Project": () => PA.readback.cost.project?.project_name === "QA-Project Alpha",
  "ITPMD Project Status Report:Project": () => J("psr_red_detail.json").project?.project_name === "QA-Project Alpha",
  "ITPMD Discussion Message:Project": () => PA.readback.dmsg.project?.project_name === "QA-Project Alpha",
  "ITPMD Notification:Project": () => PA.readback.notif.project?.project_name === "QA-Project Alpha",
  "ITPMD Discussion Read:Project": () => PA.readback.dread.project?.project_name === "QA-Project Alpha",
  "ITPMD Baseline:Project": () => PA.readback.baseline.project?.project_name === "QA-Project Alpha",
  "ITPMD Binder Item:Project": () => PA.readback.binder.project?.project_name === "QA-Project Alpha",
  "ITPMD Weekly Report:Project": () => PA.readback.weekly.project?.project_name === "QA-Project Alpha",
  "ITPMD Release:Project": () => PA.readback.release.project?.project_name === "QA-Project Alpha",
};
for (const u of byKind("reference")) {
  const p = spl(u.id); const key = p[1] + ":" + p[2]; const f = nameToForm[p[1]];
  if (refCases[key]) {
    const ok = refCases[key]();
    if (ok) rec(u.id, "pass", "strong", key === "ITPMD Issue:Hub_Settings" ? "Reference stored and lookups populated. Note: the platform stored the existing 'Default' settings record rather than the one written (autofill reference) -- harmless for a singleton." : "Reference saved, resolves to the chosen record, and the lookup column (name) is populated on read-back. Display label is the generic '<Flow> from <user>' rather than the record's title.");
    else rec(u.id, "fail", "strong", "Reference did not persist or lookups empty.");
  } else {
    const { blob, model } = childLive(f);
    const fl = Object.values(blob).filter((v) => v?.Kind === "Field" && model && v.Model === model.Id).find((x) => x.Id === f.fields.find((y) => y.name === p[2]).id);
    const qd = fl && blob[(fl["Field::QueryDefinition"] || [])[0]];
    if (fl && fl.Type === "Reference") rec(u.id, "pass-weak", "weak", `Child-table column is a Reference in the live schema (target ${qd?.LHSModel || "?"}). Rows cannot be written through the runtime API on this app, so the link was not exercised.`);
    else rec(u.id, "fail", "weak", "Child-table reference column missing or not a Reference in the live schema.");
  }
}

// ---------- W workflow ----------
const wfStatic = (() => { const d = draftMeta.psr; const acts = Object.values(d).filter((v) => v?.Kind === "Activity" && v.NodeType); return acts.map((a) => a.Name + ":" + a.NodeType).join(" > "); })();
for (const u of byKind("workflow")) {
  const p = spl(u.id); const step = p[2], out = p[3];
  if (step === "Draft") rec(u.id, "pass", "strong", "A report created and submitted by the manager moved to 'Department Head Review', status In Progress, assigned to the Department Head role (two items: Green and Red).");
  else rec(u.id, "known-limit", "weak", `Approver-step submit via the access key returns 400 KISSFLOW_ERROR_050302 (live re-confirmed on 2 items); outcome '${out}' at '${step}' cannot be executed. Structure verified read-only in the live definition (${wfStatic}; send-back-to-initiator node present; Sponsor step condition Sponsor_Approval_Required = "Yes").` + (step === "Sponsor Approval" || step === "Approved" ? " Also: the rule field that triggers the Sponsor step is never computed (see Sponsor_Approval_Required), so Red reports would not reach the Sponsor." : ""));
}

// ---------- A automations ----------
for (const u of byKind("automation")) {
  const a = spec.automations.find((x) => "A:" + x.id === u.id);
  const live = Object.entries(INT).find(([id, v]) => v.name && a && v.name.replace(/[^a-z]/gi, "").toLowerCase().startsWith(a.name.replace(/[^a-z]/gi, "").toLowerCase().slice(0, 18)));
  const v = live?.[1];
  if (!v) rec(u.id, "fail", "strong", "No live integration found for this automation.");
  else if (v.triggers === 0 || v.actions === 0) rec(u.id, "fail", "strong", `Live integration exists but is switched OFF and has no trigger and no action configured (hollow shell), so firing the event can never produce a notification.`);
  else rec(u.id, "known-limit", "strong", `Live integration is switched OFF with an empty To/Subject/Body mapping and no email connection (decision D30: needs Integration-Admin and an email connection). The trigger event (PSR submit) was fired but no effect can occur.`);
}

// ---------- J journeys ----------
const JV = {
  "J-01": ["fail", "Project record, business unit, portfolio, manager/department head/sponsor, budget, contingency and Program link all save and are validated. But the derived financial figures never appear, and contract/team/budget-change table rows could not be written through the runtime API."],
  "J-02": ["fail", "Activities save with planned/baseline dates and duration is computed; baseline record saves. Dependencies (child table) and status/variance figures did not work, and the Gantt view could not be exercised."],
  "J-03": ["fail", "Activities can be assigned and reassigned and the owner is stored, but the 'assigned at' timestamp is not recorded and the assignment notification is switched off with no trigger."],
  "J-04": ["fail", "Progress and actual dates save and the weighted value recomputes (1.6 at 40%), but status, schedule variance and the slippage alert do not work (formulas return nothing; alert is a hollow shell)."],
  "J-05": ["fail", "Issues and action items save with their required details and the critical flag works; days open, overdue flag and automatic escalation return nothing and the escalation/overdue/assignment notifications are not live."],
  "J-06": ["fail", "Risks save with their required details and the 5x5 rating computes and recomputes. But the rating band (Critical/High) and the escalation flags are wrong (known chained-formula limit) and the escalation alert to the risk owner is a hollow, switched-off shell, so High/Critical risks are not flagged to governance."],
  "J-07": ["fail", "Cost entries save, but the project totals and variance figures never roll up because the roll-ups are wired to the wrong flow; invoices (child table) could not be written."],
  "J-08": ["fail", "Manager creates and submits a report and it lands with the Department Head. But the form does NOT insist on the narrative (accepted blank), and the submit notification to the Department Head is a hollow shell."],
  "J-09": ["blocked", "Could not be tested: sending a report back requires acting as the Department Head/Sponsor, which the single access key cannot do."],
  "J-10": ["blocked", "Could not be tested: the S-curve is a custom derived view with no REST surface; no S-curve page exists in the native app."],
  "J-11": ["blocked", "Could not be tested as a Team Member: needs a Team Member identity. Team Member cannot even read Projects (grant missing). Activities save and update as the single user."],
  "J-12": ["blocked", "Could not be tested: the Department Head approve/return step cannot be completed with the access key (known platform limit)."],
  "J-13": ["blocked", "Could not be tested: the Sponsor step cannot be reached (and the rule deciding whether a report needs the Sponsor never computes)."],
  "J-14": ["blocked", "Could not be tested as a Steering Committee member. The PSC role has no read grant on Projects in the live app, so the portfolio view would be empty for them."],
  "J-15": ["blocked", "Portfolio report saves with its required period; its project-summary rows (child table) could not be written, and PSR history for other roles could not be viewed."],
  "J-16": ["pass", "Holiday and settings records save with required details enforced and settings update correctly. Only the administrator holds access (verified in the live member list, not by acting as other roles)."],
  "J-17": ["blocked", "User/role administration is native to the platform and has no REST exercise here; the live role list was read (7 roles) but account/role changes were not attempted (no mutation allowed)."],
  "J-18": ["blocked", "Audit trail is native; the item-history endpoints tried returned 404 so lifecycle tracing could not be demonstrated programmatically."],
};

// ---------- final assembly ----------
const planTests = (id) => plan.tests.filter((t) => t.covers.includes(id)).map((t) => t.id);
for (const u of byKind("journey")) { const j = u.id.split(":")[1]; const v = JV[j]; rec(u.id, v[0] === "pass" ? "pass" : v[0] === "fail" ? "fail" : "blocked", "weak", `Composite journey verdict: ${v[1]}`); }
const items = U.map((u) => {
  const r = RES.get(u.id) || { status: "blocked", evidence: "none", notes: ["no result"] };
  const st = r.status;
  return { id: u.id, kind: u.kind, status: st, tests: planTests(u.id), pass: st === "pass" || st === "pass-weak" ? 1 : 0, fail: st === "fail" ? 1 : 0, evidence: r.evidence, note: [...new Set(r.notes)].join(" | ") };
});
const ucs = plan.usecases.map((uc) => {
  const j = uc.id.replace("UC-", ""); const v = JV[j];
  const mine = items.filter((i) => uc.covers.includes(i.id));
  const cnt = (s) => mine.filter((i) => i.status === s).length;
  return { id: uc.id, title: uc.title, outcome: v[0], summary: v[1], counts: { total: mine.length, pass: cnt("pass"), "pass-weak": cnt("pass-weak"), fail: cnt("fail"), "known-limit": cnt("known-limit"), "not-independently-grantable": cnt("not-independently-grantable"), blocked: cnt("blocked") } };
});
const classCounts = {}; for (const i of items) { const c = (classCounts[i.kind] ||= {}); c[i.status] = (c[i.status] || 0) + 1; }
const tot = {}; for (const i of items) tot[i.status] = (tot[i.status] || 0) + 1;
const out = { verdict: `FAIL -- ${tot.fail || 0} failed, ${tot["known-limit"] || 0} known platform limits, ${(tot.pass || 0)} proven, ${tot["pass-weak"] || 0} proven weakly (live ACL/metadata only), ${tot["not-independently-grantable"] || 0} child-table items not independently grantable, ${tot.blocked || 0} blocked. Coverage of the plan 100% (${items.length}/${items.length}); executed live as one access-key user (member of all roles).`,
  generated: new Date().toISOString(), target: "dev ITPMD_Project_Hub_A00", identity: "single access-key user (Joms, member of all app roles) -- no per-role execution", totals: tot, byClass: classCounts, usecases: ucs, items };
fs.writeFileSync("../results.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ totals: tot, byClass: classCounts }, null, 1));
console.log(ucs.map((u) => `${u.id} ${u.outcome} ${JSON.stringify(u.counts)}`).join("\n"));
fs.writeFileSync("items.tmp.json", JSON.stringify(items));
