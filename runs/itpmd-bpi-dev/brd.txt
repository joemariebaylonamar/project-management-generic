
LAND BANK OF THE PHILIPPINES
IT Project Management Department (ITPMD)
ITPMD Project Hub
Business Requirements Document
with MVP Definition and Phased Delivery Plan
Item
Detail
Document version
1.1 – Draft for validation
Date
28 September 2026
Prepared by
Joms – Solution Lead
Source baseline
ITPMD Project Hub BRD, Annex C (252 requirements) plus 49 requirements added from the prototype review (v1.1) – 301 in total
Prototype
ITPMD Project Hub clickable prototype (MVP scope, LEAF assistant) – see Appendix B
Status
For review by ITPMD process owners. Items marked "Proposed" are for LANDBANK confirmation.

Document Control
Version history
Version
Date
Author
Changes
0.1
Sep 2026
LANDBANK ITPMD
Annex C requirements matrix (source)
1.0 Draft
28 Sep 2026
Joms
Consolidated BRD: context, roles, process flows, business rules, MVP definition, phasing, clarifications
1.1 Draft
28 Sep 2026
Joms
Aligned with the prototype: activity assignment and My Tasks, interactive Gantt, S-curve, project discussions, LEAF AI assistant (Basic and Advanced), UX and branding; 49 new requirements (ITPH-00253 – 00301), new business rules, questions and a prototype walkthrough

Review and approval
Role
Name
Signature / Date
ITPMD Department Head (Business Owner)


Project Steering Committee representative


IT Security / Information Security Office


Solution Lead
Joms


Contents


1. Introduction
1.1 Purpose
This document defines the business requirements for the ITPMD Project Hub, a web-based system that lets LANDBANK's IT Project Management Department plan, monitor, report and govern IT projects in one place. It consolidates the Annex C requirements matrix into a single reference, adds the business context, user roles, process flows and business rules needed to build and test the system, and defines a Minimum Viable Product (MVP) that can go live in about three months.
1.2 How to read this document
	•	Sections 2–7 describe the business: objectives, scope, MVP and phasing, roles, processes and business rules.
	•	Sections 8–10 list every requirement from Annex C, keeping the original IDs, plus the requirements added in v1.1 (ITPH-00253 onward), each with a delivery phase.
	•	Section 11 describes the user experience and the LEAF AI assistant as shown in the prototype.
	•	Sections 12–15 cover data, integrations, assumptions and the open questions that LANDBANK needs to answer before build.
	•	Anything marked Proposed is a recommended default that still needs LANDBANK confirmation.
1.3 What changed in version 1.1
After the first draft, a clickable prototype was built and reviewed. The features added during that review are now written as requirements so they can be estimated, built and tested.
Area
What the prototype added
New IDs
Phase
Activity assignment and My Tasks
PMs assign every activity; assignees update only their own work from a My Tasks page; assignment notifications
00253 – 00259
MVP
Interactive Gantt chart
Drag bars to move or resize; dependent activities move; baseline stays fixed; changes logged
00260 – 00265
Phase 2
Progress S-curve
Planned vs actual vs forecast curve, SPI and variance, hover values and data table
00266 – 00269
MVP
Project discussions
Channel per project, @mentions, links to activities and issues, unread counts, real time
00270 – 00276
Phase 2
LEAF assistant – Basic
How-to help, navigation, fact look-up and simple changes the user approves
00277 – 00282
Phase 2
LEAF assistant – Advanced
Health explanation, what-if with chart, portfolio comparison, S-curve reading, PSR drafts, risk suggestions; delivers Annex C 4.1.13
00283 – 00290
Phase 3
LEAF governance
Admin chooses who gets Advanced, can turn suggestions off; every AI decision logged
00291 – 00295
Phase 2
UX, branding and AI platform
Bank logo and palette, light/dark themes, three-panel layout, accessibility, secure real time, AI hosting
00296 – 00301
MVP / P2 / P3

Other changes: the missed-milestone test in BR-03 is clarified; business rules BR-15 to BR-20 are added; the access matrix, reports, data entities, integrations and open questions are updated; Appendix B maps each prototype screen to its requirements.
1.4 Definitions and acronyms
Term
Meaning
PSR / PPSR
Project Status Report / Portfolio Project Status Report
PSC
Project Steering Committee
PM, DH, PS
Project Manager, Department Head, Project Sponsor
QA, BA
Quality Assurance, Business Analyst
LD
Liquidated damages – penalty charged to a vendor for late delivery
NOA, PO, NTP, DO
Notice of Award, Purchase Order, Notice to Proceed, Delivery Order
CR
Change Request
PWP
Project Work Plan (referenced in ITPH-00111; to be defined – see Section 15)
MoM
Minutes of Meeting
Baseline
The approved version of the project schedule and budget, used to measure variance
Forecast
The current expected start/finish dates or cost, which may differ from the baseline
RAG
Red / Amber / Green health indicator
SIEM
Security Information and Event Management system
AD / LDAP
Active Directory / Lightweight Directory Access Protocol
MFA
Multi-factor authentication
MVP
Minimum Viable Product – the smallest release that delivers the core monthly PSR cycle end to end
LEAF
LANDBANK Enhanced AI Framework – the Project Hub's AI assistant, in Basic and Advanced modes
S-curve
Chart of cumulative % complete over time: planned (baseline), actual and forecast
SPI
Schedule Performance Index = actual progress ÷ planned progress to date (1.00 = on plan)
My Tasks
A page listing each user's assigned open activities and action items across all projects
2. Business Context and Objectives
2.1 Current situation (our understanding)
Based on the requirement set, ITPMD project information today is spread across separate schedules, spreadsheets and documents. Status reports are compiled by hand each period. Vendor penalties (liquidated damages), contingency usage and change-request costs are computed outside a system of record. The PSC has limited cross-project visibility, and lessons learned and past risks are not reused across projects.
To validate with ITPMD
Please confirm or correct this understanding. The current tools used (e.g., MS Project, Excel, SharePoint) also decide whether a data-import feature is needed for go-live.

2.2 Business objectives
#
Objective
How we will know (proposed measure)
O1
One source of truth for every IT project's schedule, issues, risks and financials
100% of active ITPMD projects maintained in the Hub within 60 days of go-live
O2
Faster, consistent Project Status Reports
PSR preparation time reduced by at least 50%; PSRs generated from system data, not re-typed
O3
Controlled and traceable approvals
All PSRs approved in-system with full approval history (ITPH-00123, 00146)
O4
Early warning on delays, cost overruns and vendor penalties
Alerts raised automatically when thresholds are crossed; LD computed consistently
O5
Portfolio visibility for the PSC
PSC views portfolio health and projects needing attention without requesting ad-hoc reports
O6
Compliance with LANDBANK security and audit standards
Passes IT Security review and VAPT before go-live; full audit trail
O7
Data-driven foresight (later phase)
Predicted completion dates and risk recommendations reviewed and accepted by PMs
3. Scope
3.1 In scope
Module
Summary
Annex C ref
Set-up and administration
Holiday calendar, LD formula, alert thresholds and recipients
4.1.1
Project and schedule management
Activities, dependencies, milestones, procurement dates, baseline, progress, forecast, Gantt
4.1.2
Issue management
Issues, action items, decisions, escalation
4.1.3
Risk management
Risk register, probability × impact rating, mitigation, residual risk, risk repository
4.1.4
Financial management
Budget and changes, contingency, invoices, actual / committed / forecast cost, man-day rates
4.1.5
Liquidated damages
LD computation per milestone, overrides, history, report
4.1.6
Change requests
CR log, impact, approval, man-day costing
4.1.7
Project status reporting
PSR, PPSR, MoM, lessons learned
4.1.8
Workflow and approvals
PM → DH → PS approval of PSRs
4.1.9
Portfolio / governance
PSC dashboards, comparisons, trends
4.1.10
User and access management
Users, roles, project assignment, audit trail
4.1.11
Notifications and alerts
Deadlines, approvals, thresholds, escalations
4.1.12
Project intelligence
Predictions, recommendations, AI-drafted summaries with human validation – delivered through LEAF Advanced
4.1.13
Assignment and My Tasks
Activity owners, assignee updates, personal task list
New (v1.1)
Interactive Gantt and S-curve
Drag-to-reschedule Gantt; progress S-curve with SPI
New (v1.1)
Project discussions
Per-project channels, mentions, links to work items
New (v1.1)
LEAF AI assistant
Basic (using the app) and Advanced (analysis) modes with admin controls
New (v1.1)
Non-functional
Security, audit, operations, portability, reports
5.2

3.2 Out of scope (unless LANDBANK confirms otherwise)
	•	Automated data feeds from procurement, finance/ERP or document management systems. NOA, PO, NTP, invoice and DO details are encoded manually.
	•	A vendor-facing portal. Vendors do not log in to the Hub.
	•	Native mobile apps. The Hub is a responsive web application on the intranet.
	•	Resource capacity planning and timesheets across projects.
	•	Payment processing. The Hub records payment dates and LD disposition but does not pay or collect.
4. MVP Definition and Phased Delivery
4.1 MVP principle
The MVP is done when…
A Project Manager can run one complete monthly reporting cycle inside the Hub: maintain the schedule, issues, risks and financials → generate the PSR → get it approved by the DH (and PS where needed) – and the PSC can see the status of every project in the portfolio. All of this passes LANDBANK's security and audit requirements.

Everything that does not directly support that cycle – vendor penalties, change requests, advanced analytics and AI – follows in Phases 2 and 3. Basic financials stay in the MVP because the PSR must show budget, cost and contingency status (ITPH-0068, 0069).
4.2 Phases at a glance
Phase
Target
Theme
Requirements
MVP
Months 1–3
Core project control, activity assignment and My Tasks, S-curve, PSR cycle and approvals, portfolio view, branding, security and audit baseline
189 (116 functional, 73 non-functional)
Phase 2
Months 4–6
Vendor and contract control (LD, change requests, forecast approval), MoM, lessons learned, full alerts, interactive Gantt, project discussions, LEAF Basic and governance, SIEM and AD
84 (76 functional, 8 non-functional)
Phase 3
Months 7–9
Project intelligence through LEAF Advanced: predicted completion, what-if simulations, risk recommendations, root cause, portfolio insights, AI drafts
28 (27 functional, 1 non-functional)
Total


301

4.3 MVP scope by module
Module
In the MVP
Deferred (phase)
Set-up
Holiday and non-working-day calendar; alert thresholds and recipients
LD formula configuration (P2)
Schedule
Activity assignment to team members, assignee-only updates, My Tasks page; activities, planned dates, dependencies, milestones, procurement dates (NOA/PO/NTP/expiry), baseline, progress, actual dates, planned vs actual, manual forecast, change history, Gantt, holiday-aware dates, auto-populated master data, alert when forecast passes baseline
Drag-and-drop Gantt (P2); automatic forecast recalculation, delay impact, forecast validation/approval and history (P2); AI prediction via LEAF Advanced (P3)
S-curve
Planned vs actual vs forecast curve, SPI, variance, data table
S-curve in the exported PSR (P2)
Collaboration
–
Project discussions with mentions and links (P2)
LEAF assistant
–
LEAF Basic and governance (P2); LEAF Advanced (P3)
Issues
Full: issues, priority, owners, target dates, actions, decisions, escalation, PSC view
–
Risks
Risk register, categories, probability × impact rating, owners, mitigation, response, residual risk, escalation, history
Cross-project risk repository (P2); AI-identified risks (P3)
Financials
Budget and approved changes, contingency and its use, invoices, actual and committed costs, budget vs actual vs committed vs forecast, remaining balance, PSR financial summary
Reforecasting workflow, variance reasons, contingency shortfall prediction, vendor man-day rates (P2)
Liquidated damages
–
All LD features (P2)
Change requests
–
All CR features (P2)
PSR
Generate from live data, narrative, reporting period, attachments, preview, completion %, behind/ahead-of-schedule and missed milestones, next-period plan, PPSR, history
Key changes since last PSR, MoM, lessons learned (P2); AI draft narrative (P3)
Workflow
Full: submit, DH approve/return with comments, resubmit, route to PS, status and history, notifications
–
Portfolio
Portfolio list, filters, dashboard, health indicators, projects needing attention
Schedule and financial comparisons, cross-project reports, trends, lessons search (P2)
Users and access
Users, roles, project assignment, role permissions, audit trail, PSR history
PM-managed team membership (P2)
Notifications
PSR deadlines, approvals pending, critical risks/issues, due and overdue action items, approval reminders
Budget/contingency thresholds, LD thresholds, contract/PO expiry, PSC escalations (P2)
Non-functional
Bank logo and palette, light/dark themes, three-panel responsive layout, WCAG 2.1 AA; password and lockout policy, MFA setting, single session, idle timeout, RBAC "deny all", audit logging, user list report, HTTPS, intranet, PDF/XLSX/DOCX/CSV export
SIEM interface, AD/LDAP, manual batch trigger, LD/issue/lessons portfolio reports (P2)

4.4 MVP delivery plan (12 weeks)
Sprint
Weeks
Deliverables
S0
1–2
Foundation: login, password and lockout policy, MFA, roles and permissions, user admin, audit trail, holiday calendar, project master data
S1
3–4
Schedule: activities, milestones, dependencies, procurement dates, baseline, Gantt chart
S2
5–6
Activity assignment, My Tasks and assignee updates; progress and actuals, manual forecast, variance, schedule history; issue and action management
S3
7–8
Risk register and rating matrix; financials (budget, changes, contingency, invoices, costs)
S4
9–10
PSR generation and approval workflow, notifications, portfolio dashboard, PPSR, progress S-curve
S5
11–12
Reports and exports, security hardening, VAPT fixes, UAT, production deployment

4.5 MVP exit criteria
	•	All MVP requirements pass UAT signed off by ITPMD.
	•	At least one pilot project completes a full PSR cycle (create → DH approve → PS approve) in the system.
	•	IT Security review and VAPT: no open critical or high findings.
	•	Audit trail verified for all 7 log events once LANDBANK confirms them (ITPH-00213).
	•	Backup and restore tested in the target environment (ITPH-00185).
4.6 Assumptions behind the 3-month timeline
	•	A dedicated team of about 4: solution lead, 2 full-stack developers, 1 QA/BA, using AI-assisted development.
	•	LANDBANK provides the servers, database, SSL certificate and an SMTP relay by week 4.
	•	Open questions in Section 15 that affect the MVP (marked "MVP" there) are answered by the end of week 2.
	•	The MVP uses local accounts with the Bank's password policy. AD/LDAP login follows in Phase 2.
	•	LANDBANK accepts phased delivery and acceptance. If all Mandatory items must be accepted at once, the plan becomes about 9 months.
	•	The approved prototype is the UI reference, so screens are built rather than designed from scratch. The 15 MVP items added in v1.1 (assignment, My Tasks, S-curve, branding) add an estimated 1–2 weeks; this is absorbed only if the week-2 answers arrive on time, otherwise go-live moves to about week 14.
5. Stakeholders and User Roles
Role
Who
What they do in the Hub
Project Manager (PM)
ITPMD project managers
Maintains the schedule, issues, risks, financials, LD and CRs; prepares and submits PSRs
Project Team Member / Responsible Person
Assigned team members
Updates only the activities and action items assigned to them, from My Tasks or the schedule; joins project discussions; uses LEAF Basic
Department Head (DH)
Head of the unit that owns the project
Reviews, approves or returns PSRs; approval access to own projects
Project Sponsor (PS)
Business sponsor
Approves PSRs when routing rules require it
PSC Member
Steering committee
Views portfolio, dashboards, critical risks/issues; generates PPSR; approves forecasts (P2)
Authorized Approver
Named per CR / forecast / LD override
Approves, rejects or returns CRs, forecasts and LD adjustments (P2)
QA
ITPMD quality assurance
Maintains the cross-project risk and lessons-learned repositories
BA / Application Administrator
ITPMD system owner
Maintains holidays, LD formula, alert thresholds, configuration and LEAF settings (who gets Advanced, suggestions on/off)
System / Security Administrator
IT operations / security
Users, roles, permissions, unlocks and resets, audit review

5.1 Access matrix (proposed)
C = create/edit, V = view, A = approve, — = no access. Access to project data is further limited to assigned projects ("deny all" unless allowed, ITPH-00225).
Area
PM
Team
DH
PS
PSC
QA
App Admin
Sys Admin
Project master data
C
V
V
V
V
V
V
—
Schedule and Gantt
C
C*
V
V
V
V
—
—
Issues and actions
C
C*
V
V
V
V
—
—
Risk register
C
V
V
V
V
C
—
—
Financials
C
—
V
V
V
—
—
—
PSR
C
V
A
A
V
V
—
—
Portfolio dashboard / PPSR
—
—
V
V
C
V
—
—
Configuration
—
—
—
—
—
—
C
—
Users, roles, audit
—
—
—
—
—
—
—
C
Assign activities
C
—
—
—
—
—
—
—
Drag Gantt / re-baseline
C
—
—
—
—
—
—
—
S-curve
V
V
V
V
V
V
—
—
Project discussions
C
C
C
C
C
C
—
—
LEAF Basic
C
C
C
C
C
C
C
C
LEAF Advanced (default)
C
—
C
C
C
C
C
—
LEAF settings
—
—
—
—
—
—
C
—
* Only for activities and action items assigned to them. For LEAF, C means the user can ask and apply suggestions their own role allows. LEAF Advanced access is set by the Application Administrator.
6. Business Processes
6.1 Monthly PSR cycle (MVP)
	•	PM sets up the project from approved master data: contract value, vendor, NOA/PO/NTP dates, budget, contingency, team.
	•	PM builds the schedule (activities, milestones, dependencies) and sets the baseline once approved.
	•	During the period, the PM and team update progress, actual dates, issues, actions, risks and costs.
	•	Before the deadline, the Hub reminds the PM (ITPH-00148). The PM generates the PSR; static and computed sections populate automatically.
	•	PM adds the narrative and attachments, previews, and submits to the DH.
	•	DH approves or returns with comments. Returned PSRs go back to the PM to revise and resubmit.
	•	If the routing rule requires it, the approved PSR goes to the PS for final approval.
	•	The approved PSR is locked as a period snapshot and rolls up into the portfolio dashboard and PPSR.
6.2 PSR status model
Status
Meaning
Who acts next
Draft
Being prepared by the PM; editable
PM
Submitted – For DH Review
Locked for editing; awaiting DH
DH
Returned
Sent back with mandatory comments
PM
DH Approved – For PS Approval
Only when the PS routing rule applies
PS
Approved
Final. Read-only snapshot; included in PPSR and history
—

6.3 Issue and risk escalation
An issue is escalated when it is Critical or passes its target resolution date by the configured aging period (ITPH-0039). A risk is escalated when its rating is High or Critical (ITPH-0048). Escalated items appear on the PSC view and trigger notifications. In Phase 2, items that stay unresolved past a second aging level escalate to the PSC automatically (ITPH-00158).
6.4 Activity assignment and updates (MVP)
	•	The PM assigns each activity to a team member in the schedule (ITPH-00253).
	•	The assignee is notified and sees the activity in My Tasks (ITPH-00255, 00258).
	•	The assignee records % complete, actual start and actual finish as work progresses (ITPH-00256). Forecasts, health and the S-curve update immediately.
	•	The PM reviews progress, reassigns work if needed (ITPH-00254) and discusses blockers in the project discussion (Phase 2).
6.5 LEAF suggestion flow
	•	A user asks LEAF a question in Basic or Advanced mode.
	•	LEAF reads only the data the user is allowed to see and answers. If a change is useful, it shows a suggested-change card.
	•	The user clicks Apply or Dismiss. On Apply, the Hub checks the user's role again before saving (ITPH-00294).
	•	The decision is written to the audit trail and the LEAF decision log (ITPH-00293).
6.6 Change request flow (Phase 2)
Raised → Impact assessed (scope, schedule, cost, risk, deliverables; cost = man-days × vendor rate) → For approval → Approved / Rejected / Returned → Implemented. Approved CRs can update the baseline and budget through a controlled re-baseline.
7. Business Rules (Proposed)
These rules turn the requirements into testable logic. All numeric values are configurable by the Application Administrator (ITPH-001–003). Each rule needs ITPMD confirmation.
ID
Rule
Proposed logic
Ref
BR-01
Working calendar
Working days exclude Saturdays, Sundays and configured holidays. Activity durations, dependencies and forecasts use working days.
001, 0030
BR-02
Overall completion %
Weighted average of leaf-activity % complete, weighted by planned duration. The PM may override with a recorded reason.
00105
BR-03
Schedule health
Variance = forecast finish − baseline finish (working days). Green ≤ 0; Amber 1–10 days; Red > 10 days or any missed milestone (a milestone past its baseline date and not yet achieved). A milestone that is only forecast late counts through the variance, not as missed.
0016, 0022
BR-04
Risk rating
5 × 5 probability × impact score. 1–4 Low, 5–9 Medium, 10–16 High, 20–25 Critical. High and Critical escalate.
0025, 0026, 0043
BR-05
Cost health
Forecast at completion ÷ current approved budget. Green ≤ 100%; Amber > 100–105% or contingency use ≥ 75%; Red > 105% or contingency exhausted.
0062, 00152
BR-06
Overall project health
Worst of schedule, cost, risk and issue health. "Needs management attention" = overall Red, or any Critical risk/issue, or any overdue escalation.
00130, 00132
BR-07
Liquidated damages
Per milestone: LD = rate × price of the undelivered portion × days of delay. Default rate 0.001 (one-tenth of one percent) per day, as in LANDBANK contract terms. Alert when total LD reaches the warning level (default 8%) and the 10% cap, at which LANDBANK may rescind the contract.
002, 0073–0080, 00153
BR-08
LD disposition
Each LD amount is Computed → Adjusted (with approval) → Collected (deducted from DO / offset) or Cancelled, so the report can show totals by disposition.
0081, 00191
BR-09
Change request cost
CR cost = Σ (man-days per position × vendor rate per man-day for that position).
0072, 0092, 0093
BR-10
PS routing
Route to the PS when any of these is true (proposed): overall health Red, baseline or budget change requested, or project flagged "PS approval required".
00118
BR-11
PSR deadline
Monthly period; PSR due on working day 5 of the next month. Reminders 3 days and 1 day before, and on each overdue day.
0097, 00148
BR-12
Contract expiry
Alert 60, 30 and 7 days before contract or PO expiry.
003, 00154, 00156
BR-13
Master data
Static PSR fields (project name, vendor, contract value, sponsor, dates) come from project master data. Changes apply to later PSRs; approved PSRs are never changed.
0027–0029
BR-14
AI outputs
Every prediction or recommendation shows its inputs, assumptions and confidence, and stays "Proposed" until a user accepts, edits or rejects it. All dispositions are logged.
00172–00175
BR-15
Activity updates
Only the PM can create, delete, assign, move or re-baseline activities. An assignee can change % complete, actual start and actual finish of their own activities. Entering % > 0 sets the actual start if blank; 100% sets the actual finish to today.
00253–00257
BR-16
Gantt drag rules
Not-started activities can be moved; the new start snaps to the next working day and cannot be before today or before all predecessors finish. Dragging the end changes duration (not started) or the forecast finish (in progress). Completed activities are locked. The baseline is never changed by a drag.
00260–00265
BR-17
S-curve
Weekly points from project start to the later of baseline and forecast finish. Planned uses baseline dates; actual uses actual dates and % complete up to today; forecast runs from today to the forecast finish. All weighted by activity duration (BR-02). SPI = actual ÷ planned to date.
00266–00268
BR-18
Mentions
@userid in a message notifies that user if they are a member of the project. Messages can link to one activity or issue.
00271, 00272
BR-19
LEAF modes
Basic: how-to, navigation, facts and simple changes (assign, progress, start date, action item, risk, message). Advanced adds analysis, what-if, comparison, S-curve reading, drafting and risk suggestions. Advanced roles default to PM, DH, PS, PSC, QA and Application Admin, and are configurable.
00277–00292
BR-20
LEAF safeguards
LEAF never saves anything without the user clicking Apply, re-checks the user's role on Apply, answers only from Hub data the user can see, and states confidence for predictions. If the AI service is unavailable it falls back to built-in answers.
00290, 00293–00295

Open point on LD days
LANDBANK's contract terms count "each day of delay". Please confirm whether LD uses calendar days (common in government contracts) while schedules use working days (BR-01).
8. Functional Requirements
All Annex C requirement IDs are unchanged. Sections 8.14 to 8.20 are new in v1.1 and come from the prototype review (ITPH-00253 onward). Priority: M = Mandatory, R = Recommended. Phase: MVP, P2 (Phase 2), P3 (Phase 3).
8.1 Project Hub Set-up and Administration
ID
As a
Requirement
Pri
Phase
ITPH-001
Application Administrator
Add, edit, or remove holidays and special non-working days, including their applicable dates and coverage
So that changes in the Bank's working calendar can be maintained without requiring system code changes.
M
MVP
ITPH-002
Application Administrator
Define and maintain the liquidated damages formula, including the applicable LD rate
So that I can consistently calculate liquidated damages using the correct rate and approved business rules.
M
Phase 2
ITPH-003
Application Administrator
Configure the conditions, utilization percentages, LD threshold levels, contract expiration notification periods, aging periods, and recipients for system alerts, automatic reminders, and escalations
So that notification and escalation parameters can be maintained in accordance with approved Bank policies and business rules without requiring system code changes.
M
MVP
8.2 Project & Schedule Management
ID
As a
Requirement
Pri
Phase
ITPH-004
Project Manager
Create, edit, and delete project activities
So that I can maintain an accurate project schedule that reflects the planned work.
M
MVP
ITPH-005
Project Manager
Define the planned start and end dates of project activities
So that project timelines and target completion dates can be established.
M
MVP
ITPH-006
Project Manager
Define dependencies between project activities
So that the system reflects the logical sequence and relationships of project work.
M
MVP
ITPH-007
Project Manager
Identify and maintain project milestones
So that key deliverables and target dates can be monitored.
M
MVP
ITPH-008
Project Manager
Record project details based on the procurement activties

Ex.
Date of NOA, PO, NTP, Contract Expiration
So that 1. I can view pertinent procurment/ contracts information
2. I can be notified on upcoming contract expiration
M
MVP
ITPH-009
Project Manager
Establish an approved project schedule baseline
So that actual and forecasted project performance can be compared against the approved plan.
M
MVP
ITPH-0010
Project Manager
Update the progress of project activities
So that the current project status is accurately reflected.
M
MVP
ITPH-0011
Project Manager
Record the actual start and completion dates of project activities
So that actual schedule performance can be measured and monitored.
M
MVP
ITPH-0012
Project Manager
View planned versus actual activity schedules
So that I can identify schedule variances and activities that are ahead of or behind schedule.
M
MVP
ITPH-0013
Project Manager
Manually update the forecast start and completion dates of project activities
So that I can reflect anticipated schedule changes based on my current assessment of project progress.
M
MVP
ITPH-0014
Project Manager
Maintain a history of changes made to the project schedule
So that schedule revisions and changes to the approved project plan are traceable.
M
MVP
ITPH-0015
PSC Member
View project schedules, activities, and milestones
So that I can monitor the overall progress and status of the project.
M
MVP
ITPH-0016
Project Manager
View the variance between the approved baseline completion date and the system-predicted completion date
So that I can determine whether the project is forecasted to be completed on time or delayed.
M
MVP
ITPH-0017
Project Manager
Have the project completion forecast automatically recalculated when material changes occur in project progress, activities, milestones, risks, issues, or dependencies
So that I can continuously monitor changes in the expected project completion date using the latest available project information.
M
Phase 2
ITPH-0018
Project Manager
View the projected impact of a forecasted project delay on project commitments, resources, deliverables, penalties, and other identified financial or operational exposures
So that I can make informed decisions and minimize potential losses or adverse impact to the Bank.
M
Phase 2
ITPH-0019
Project Manager
Review and validate the system-generated project completion forecast
So that I can confirm that the forecast is reasonable and supported by the project's actual status and conditions before it is used for reporting.
M
Phase 2
ITPH-0020
Authorized Approver / PSC Member
Review and approve a validated project completion forecast
So that the forecast can be formally recognized and used for authorized project monitoring and reporting.
M
Phase 2
ITPH-0021
Project Manager
Use the approved project completion forecast as an input to the Project Status Report (PSR)
So that the latest approved forecast can be consistently reflected in project reporting to management and stakeholders.
M
Phase 2
ITPH-0022
Project Manager
Receive an alert when the forecasted project completion date exceeds the approved baseline date or a defined schedule-risk threshold
So that I can proactively address potential project delays before they significantly affect project commitments.
M
MVP
ITPH-0023
Project Manager / PSC Member
View the history of system-generated project completion forecasts
So that I can track how the expected project completion date has changed over time and assess the effect of mitigation or corrective actions.
M
Phase 2
ITPH-0024
Project Manager
Generate and view a Gantt chart based on the project activities, milestones, dates, dependencies, and progress
So that I can visually monitor the project schedule, activity sequence, dependencies, milestones, and overall progress.
M
MVP
ITPH-0025
Project Manager
Categorize project risks based on their probability and potential impact on the project schedule
So that I can prioritize risks according to their likelihood and potential effect on project timelines and take appropriate mitigation actions.
M
MVP
ITPH-0026
Project Manager
Determine the overall risk rating based on the assessed probability and schedule impact
So that risks can be consistently classified as Low, Medium, High, or Critical and prioritized for appropriate action.
M
MVP
ITPH-0027
Project Manager
Have applicable static project information automatically populated in the PSR and other project records from existing system data
So that I do not need to repeatedly encode information that is already available in the system, reducing manual effort and data-entry errors.
M
MVP
ITPH-0028
Project Manager
Have auto-populated static information sourced from the approved project master data
So that information presented in project reports remains consistent with the official project record.
M
MVP
ITPH-0029
Project Manager
Have changes to authorized project master data reflected in subsequent PSRs and applicable project records
So that reports contain the most current approved project information without requiring duplicate updates.
M
MVP
ITPH-0030
Project Manager
Have the system automatically consider configured holidays and non-working days when calculating activity dates, milestones, dependencies, and forecast dates
So that project schedules reflect actual available working days.
M
MVP
8.3 Project Issue Management
ID
As a
Requirement
Pri
Phase
ITPH-0031
Project Manager
Create and maintain project issues
So that problems affecting the project can be formally tracked.
M
MVP
ITPH-0032
Project Manager
Categorize and prioritize issues
So that critical issues receive appropriate attention.
M
MVP
ITPH-0033
Project Manager
Assign issue owners
So that responsibility for resolving issues is clearly established.
M
MVP
ITPH-0034
Project Manager
Set issue target resolution dates
So that issues can be monitored against agreed timelines.
M
MVP
ITPH-0035
Project Manager
Record actions required to resolve issues
So that corrective activities can be tracked.
M
MVP
ITPH-0036
Project Manager
Assign action items to project team members
So that accountability for follow-up activities is established.
M
MVP
ITPH-0037
Project Manager
Track the status of action items
So that overdue actions can be identified.
M
MVP
ITPH-0038
Project Manager
Record project decisions
So that important decisions and their rationale are documented.
M
MVP
ITPH-0039
Project Manager
Escalate critical or overdue issues
So that management attention can be obtained when necessary.
M
MVP
ITPH-0040
PSC Member
View critical issues and overdue actions
So that I can focus on matters requiring governance attention.
M
MVP
8.4 Project Risk Management
ID
As a
Requirement
Pri
Phase
ITPH-0041
Project Manager
Create and maintain a project risk register
So that potential threats to the project can be monitored.
M
MVP
ITPH-0042
Project Manager
Categorize risks
So that risks can be analyzed consistently.
M
MVP
ITPH-0043
Project Manager
Assess risk probability and impact
So that the overall risk level can be determined.
M
MVP
ITPH-0044
Project Manager
Assign risk owners
So that responsibility for managing each risk is established.
M
MVP
ITPH-0045
Project Manager
Define risk mitigation actions
So that identified risks can be proactively addressed.
M
MVP
ITPH-0046
Project Manager
Define risk response strategies
So that the appropriate treatment of each risk is documented.
M
MVP
ITPH-0047
Project Manager
Monitor residual risk after mitigation
So that I can determine whether additional action is required.
M
MVP
ITPH-0048
Project Manager
Escalate high and critical risks
So that management can take appropriate action.
M
MVP
ITPH-0049
PSC Member
View high and critical project risks
So that I can provide appropriate governance and direction.
M
MVP
ITPH-0050
Project Manager
Maintain risk history and status
So that changes in risk status and assessment are traceable.
M
MVP
ITPH-0051
Project Manager
Review and validate system-identified potential risks before adding them to the project risk register
So that only relevant and validated risks are formally recorded and monitored.
M
Phase 3
ITPH-0052
QA
Maintain a repository of risks registered from past and current projects
So that I can use it as reference in identifying potential risks
M
Phase 2
8.5 Project Financial Management
ID
As a
Requirement
Pri
Phase
ITPH-0053
Project Manager
Record the approved project budget
So that the project's authorized financial baseline can be established and monitored.
M
MVP
ITPH-0054
Project Manager
Record approved changes to the project budget, including the amount, effective date, and reason for the change
So that authorized budget adjustments are documented and traceable.
M
MVP
ITPH-0055
Project Manager
View the current approved project budget after incorporating all approved budget changes
So that project financial performance can be monitored against the latest authorized budget.
M
MVP
ITPH-0056
Project Manager
Record the approved project contingency fund
So that contingency available for identified or unforeseen project costs can be monitored.
M
MVP
ITPH-0057
Project Manager
Record project invoices
So that project expenditures and amounts billed can be tracked.
M
MVP
ITPH-0058
Project Manager
Record actual project costs
So that actual spending can be compared against the approved project budget.
M
MVP
ITPH-0059
Project Manager
Record committed project costs
So that anticipated expenditures can be considered in project financial monitoring and forecasting.
M
MVP
ITPH-0060
Project Manager
Update the project financial forecast
So that the expected final project cost can be monitored.
M
Phase 2
ITPH-0061
Project Manager
Reforecast project costs when relevant project circumstances change
So that the projected financial position of the project remains current.
M
Phase 2
ITPH-0062
Project Manager
Compare the current approved budget, actual cost, committed cost, and forecast cost
So that I can identify financial variances and determine whether the project remains within the approved budget.
M
MVP
ITPH-0063
Project Manager
Record reasons for significant financial variances
So that management has sufficient context for changes or deviations in project costs.
M
Phase 2
ITPH-0064
Project Manager
View the remaining project budget and forecast balance
So that I can determine whether sufficient budget remains to complete the project.
M
MVP
ITPH-0065
Project Manager
Record and monitor the utilization of the approved contingency fund
So that I can track how much contingency has been utilized and for what purpose.
M
MVP
ITPH-0066
Project Manager
View the remaining available contingency fund
So that I can determine whether sufficient contingency remains to address potential project costs.
M
MVP
ITPH-0067
Project Manager
Have the system identify when forecasted costs requiring contingency are expected to exceed the remaining available contingency fund
So that I can anticipate a potential contingency shortfall and initiate appropriate action.
M
Phase 2
ITPH-0068
Project Manager
Include a summary of the project's financial status in the PSR, including budget, actual cost, committed cost, forecast cost, financial variances, and remaining budget
So that management can readily assess the project's current and projected financial position.
M
MVP
ITPH-0069
Project Manager
Include contingency utilization, remaining contingency, and any projected contingency shortfall in the PSR
So that management can monitor contingency usage and potential financial exposure.
M
MVP
ITPH-0070
PSC Member
View project financial status, significant variances, forecast costs, and contingency status
So that I can monitor project financial performance and identify projects requiring management attention.
M
MVP
ITPH-0071
Project Manager
Record and maintain project invoice details, including Invoice Number, Invoice Date, DO Number, DO Date, Vendor Name, Date Paid, Status, and Remarks
So that all project invoices and their payment status can be centrally tracked and monitored.
M
MVP
ITPH-0072
Project Manager
Record the applicable cost per man-day for each project position or resource of the vendor
So that project resource costs can be accurately determined and monitored.
M
Phase 2
8.6 Liquidated Damages
ID
As a
Requirement
Pri
Phase
ITPH-0073
Project Manager
Identify the applicable calculation basis for liquidated damages
So that the system can calculate the amount based on the project's contractual terms.
M
Phase 2
ITPH-0074
Project Manager
Record the undelivered portion of the project for each applicable milestone
So that the system can determine the amount subject to liquidated damages.
M
Phase 2
ITPH-0075
Project Manager
Record the applicable delay period for each affected milestone
So that the system can calculate liquidated damages based on the actual delay.
M
Phase 2
ITPH-0076
Project Manager
System to automatically calculate liquidated damages based on the configured formula
So that the calculated amount is accurate and consistent.
M
Phase 2
ITPH-0077
Project Manager
View the calculated liquidated damages per project milestone
So that I can identify how the total amount was derived.
M
Phase 2
ITPH-0078
Project Manager
View the total calculated liquidated damages for the project
So that I can determine the overall financial impact of project delays.
M
Phase 2
ITPH-0079
Project Manager
View the detailed computation of liquidated damages
So that I can validate how the system arrived at the calculated amount.
M
Phase 2
ITPH-0080
Project Manager
System to recalculate liquidated damages when relevant project or milestone information is updated
So that the calculation remains current.
M
Phase 2
ITPH-0081
authorized user
Record an approved adjustment or override to the calculated liquidated damages
So that authorized exceptions can be properly reflected.
M
Phase 2
ITPH-0082
Authorized User
View the history of liquidated damages calculations and adjustments
So that changes to the calculation are traceable.
M
Phase 2
ITPH-0083
Project Manager
Generate a liquidated damages report
So that the calculated amount and supporting details can be included in project monitoring and reporting.
M
Phase 2
8.7 Change Requests
ID
As a
Requirement
Pri
Phase
ITPH-0084
Project Manager
Create and maintain a log of project change requests
So that all proposed changes affecting the project can be centrally recorded and monitored.
M
Phase 2
ITPH-0085
Project Manager
Record the details of each change request, including description, reason, requestor, date raised, and affected project areas
So that sufficient information is available to assess and track each requested change.
M
Phase 2
ITPH-0086
Project Manager
Record the assessed impact of a change request on project scope, schedule, cost, risks, and deliverables
So that the implications of the proposed change can be evaluated before a decision is made.
M
Phase 2
ITPH-0087
Project Manager
Update and monitor the status of each change request
So that I can track whether a change request is pending, under evaluation, approved, rejected, implemented, or closed.
M
Phase 2
ITPH-0088
Authorized Approver
Approve, reject, or return a change request with comments
So that project changes are subjected to the appropriate review and authorization process.
M
Phase 2
ITPH-0089
Project Manager
Record the implementation date and actions taken for an approved change request
So that I can confirm that approved project changes have been properly implemented.
M
Phase 2
ITPH-0090
Authorized User
View the complete history of a change request, including modifications, status changes, decisions, comments, and responsible users
So that all actions related to project changes are traceable and auditable.
M
Phase 2
ITPH-0091
Project Manager / PSC Member
View and generate a consolidated list of project change requests
So that I can monitor pending, approved, rejected, and implemented changes and their impact on the project.
M
Phase 2
ITPH-0092
Project Manager
Record the required number of man-days per position or resource for each Change Request of the vendor
So that the resource effort required for the Change Request can be assessed and monitored.
M
Phase 2
ITPH-0093
Project Manager
Calculate the cost of a Change Request based on the applicable man-days and cost per man-day of the vendor
So that the financial impact of the Change Request can be determined before approval.
M
Phase 2
8.8 Project Status Reporting
ID
As a
Requirement
Pri
Phase
ITPH-0094
Project Manager
Generate a Project Status Report (PSR) using current project information
So that I can efficiently prepare the periodic project report.
M
MVP
ITPH-0095
Project Manager
PSR to include schedule milestone issue risk financial and action information
So that management receives a consolidated project status.
M
MVP
ITPH-0096
Project Manager
Provide narrative updates in the PSR
So that important project developments can be communicated to management.
M
MVP
ITPH-0097
Project Manager
Define the PSR reporting period
So that the report reflects the appropriate monitoring period.
M
MVP
ITPH-0098
Project Manager
Attach supporting documents to the PSR
So that relevant evidence can be provided.
M
MVP
ITPH-0099
Project Manager
View the PSR before submission
So that I can validate its completeness and accuracy.
M
MVP
ITPH-00100
PSC Member
View consolidated project status information
So that I can monitor multiple projects from a single view.
M
MVP
ITPH-00101
PSC Member
Generate a Portfolio Project Status Report (PPSR)
So that project status can be consolidated for portfolio-level reporting.
M
MVP
ITPH-00102
PM/PSC Member
View historical PSRs
So that project performance and status trends can be reviewed.
M
MVP
ITPH-00103
Project Manager
Identify key changes in the project's status since the previous PSR
So that significant developments and changes during the reporting period can be clearly communicated to management.
R
Phase 2
ITPH-00104
Project Manager
Identify activities and milestones planned for the next reporting period
So that management and stakeholders can understand the project's upcoming activities and expected deliverables.
M
MVP
ITPH-00105
Project Manager
Record and report the overall project completion percentage
So that the current level of project progress can be consistently monitored and reported.
M
MVP
ITPH-00106
Project Manager
Identify project activities that are behind schedule
So that delayed activities can be highlighted and appropriate corrective actions can be initiated.
M
MVP
ITPH-00107
Project Manager
Identify project activities that are ahead of schedule
So that positive schedule performance and its impact on the overall project timeline can be monitored.
M
MVP
ITPH-00108
Project Manager
Identify milestones that have been missed or are forecasted to be missed
So that potential or actual milestone delays can be highlighted and addressed before they further affect project delivery.
M
MVP
ITPH-00109
Project Manager
Record lessons learned identified during project implementation
So that relevant project experiences can be documented and used as reference for current and future projects.
M
Phase 2
ITPH-00110
Project Manager
Generate Minutes of Meeting based on recorded project meeting information
So that project discussions, decisions, agreements, and action items can be documented consistently.
M
Phase 2
ITPH-00111
Project Manager
Review and update generated Minutes of Meeting before finalization

Business rule:
automatically populate action items recorded into the Project Work Plan (PWP)
So that 1. the accuracy and completeness of the meeting record can be validated.
2. agreed actions can be monitored without requiring duplicate encoding.
M
Phase 2
ITPH-00112
QA
Maintain a repository of lessons learned from past and current projects
So that 1. I can use it as reference in identifying potential risks

2. relevant project experiences can be documented and used as reference for current and future projects.
M
Phase 2
8.9 Workflow & Approvals
ID
As a
Requirement
Pri
Phase
ITPH-00113
Project Manager
Submit a completed PSR for approval
So that the report can proceed through the required governance process.
M
MVP
ITPH-00114
Department Head (DH)
Review submitted PSRs
So that I can validate the accuracy and completeness of project information.
M
MVP
ITPH-00115
Department Head
Approve or return a PSR
So that only validated reports proceed to the next stage.
M
MVP
ITPH-00116
Department Head
Provide comments when returning a PSR
So that the Project Manager knows what needs to be corrected.
M
MVP
ITPH-00117
Project Manager
Revise and resubmit a returned PSR
So that identified deficiencies can be addressed.
M
MVP
ITPH-00118
Project Manager
System to route an approved PSR to the Project Sponsor (PS) when required
So that the applicable approval hierarchy is followed.
M
MVP
ITPH-00119
Project Sponsor
Approve or return a PSR when PS approval is required
So that project reporting is formally endorsed.
M
MVP
ITPH-00120
Project Manager
View the approval status of my PSR
So that I know whether further action is required.
M
MVP
ITPH-00121
Project Manager
Receive notifications for returned or approved PSRs
So that I can take timely action.
M
MVP
ITPH-00122
PSC Member
View the approval status of PSRs
So that I can monitor reporting compliance.
M
MVP
ITPH-00123
Authorized User
View the complete approval history of a PSR
So that all approval actions are auditable.
M
MVP
8.10 Portfolio / Governance Management
ID
As a
Requirement
Pri
Phase
ITPH-00124
PSC Member
View all projects under my portfolio
So that I can monitor the overall project landscape.
M
MVP
ITPH-00125
PSC Member
Filter projects by status health risk business unit and other relevant criteria
So that I can focus on areas requiring attention. and other relevant criteria so that I can focus on areas requiring attention.
M
MVP
ITPH-00126
PSC Member
View dashboards showing project status risks issues milestones and financial performance
So that I can make informed governance decisions. and financial performance so that I can make informed governance decisions.
M
MVP
ITPH-00127
PSC Member
Compare project schedule performance
So that delayed projects can be identified.
M
Phase 2
ITPH-00128
PSC Member
Compare project financial performance
So that projects with significant budget variances can be identified.
M
Phase 2
ITPH-00129
PSC Member
View consolidated risks and issues across projects
So that portfolio-level risks can be identified.
M
Phase 2
ITPH-00130
PSC Member
Identify projects requiring management attention
So that appropriate intervention can be initiated.
M
MVP
ITPH-00131
PSC Member
View cross-project reports
So that portfolio performance can be presented to management.
M
Phase 2
ITPH-00132
PSC Member
Monitor project health indicators
So that emerging project problems can be identified early.
M
MVP
ITPH-00133
PSC Member
View project trends over time
So that portfolio performance can be assessed.
M
Phase 2
ITPH-00134
PSC Member
View and search lessons learned from completed and ongoing projects
So that recurring issues, good practices, and improvement opportunities can be considered in managing the project portfolio.
M
Phase 2
8.11 User & Access Management
ID
As a
Requirement
Pri
Phase
ITPH-00135
System Administrator
Create and maintain user accounts
So that authorized users can access the system.
M
MVP
ITPH-00136
System Administrator
Assign users to appropriate roles
So that access is aligned with their responsibilities.
M
MVP
ITPH-00137
System Administrator
Activate deactivate and modify user access
So that system access remains current.
M
MVP
ITPH-00138
System Administrator
Assign users to specific projects
So that they can access only the projects relevant to their responsibilities.
M
MVP
ITPH-00139
Project Manager
Project team members to have appropriate access to project information
So that they can perform their assigned responsibilities.
M
MVP
ITPH-00140
Project Manager
Manage project team membership subject to authorization controls
So that project access remains appropriate.
R
Phase 2
ITPH-00141
PSC Member
View access to projects under my portfolio
So that I can perform governance activities.
M
MVP
ITPH-00142
DH
Approval access for projects under my responsibility
So that I can review and approve PSRs.
M
MVP
ITPH-00143
PS
Approval access only to projects requiring my approval
So that I can perform my governance responsibilities.
M
MVP
ITPH-00144
BA/System Administrator
Administrative access to configuration and project data as authorized
So that I can support system operations.
M
MVP
ITPH-00145
System Administrator
Maintain role permissions
So that access privileges can be controlled centrally.
M
MVP
ITPH-00146
Authorized User
View the complete PSR history, including creation, modification, submission, approval, return, associated comments, responsible users, and date and time of each action
So that the complete lifecycle and approval history of the PSR is traceable and auditable.
M
MVP
ITPH-00147
Authorized User
Have all system transactions and user actions recorded in an audit trail
So that changes to project information, reports, approvals, configurations, and access can be traced to the responsible user.
M
MVP
8.12 Notifications & Alerts
ID
As a
Requirement
Pri
Phase
ITPH-00148
Project Manager
Receive notifications when PSR submission deadlines are approaching
So that reports can be submitted on time.
M
MVP
ITPH-00149
DH
Receive notifications when a PSR requires my approval
So that approvals are not delayed.
M
MVP
ITPH-00150
Project Manager
Receive alerts for critical risks and issues
So that timely mitigation can be initiated.
M
MVP
ITPH-00151
PSC Member
Receive alerts for projects requiring management attention
So that I can take appropriate action.
M
Phase 2
ITPH-00152
Project Manager
Receive an alert when the approved project budget or contingency fund reaches a defined utilization threshold
So that I can monitor financial exposure and take appropriate action before the available balance becomes insufficient.
M
Phase 2
ITPH-00153
Project Manager
Receive alerts when calculated liquidated damages reach or approach defined LD threshold levels
So that I can closely monitor increasing liquidated damages exposure and initiate appropriate corrective or escalation actions.
M
Phase 2
ITPH-00154
Project Manager
Receive an alert when a project contract is within a defined period before its expiration date
So that I can initiate necessary actions before the contract expires and avoid disruption to project implementation.
M
Phase 2
ITPH-00155
Project Manager / Responsible Person
Receive automatic reminders for project deliverables/ action items that are approaching their due dates or are overdue
So that required deliverables can be completed and followed up within the prescribed timelines.
M
MVP
ITPH-00156
Project Manager
Receive automatic reminders when a contract or Purchase Order is approaching its expiration or validity date
So that appropriate action can be initiated before the contract or Purchase Order expires.
M
Phase 2
ITPH-00157
Approver
Receive automatic reminders for project status reports awaiting approval
So that pending approvals can be acted upon within the prescribed turnaround time.
M
MVP
ITPH-00158
PSC Member
Receive automatic escalation notices for overdue, unresolved, or critical project matters that meet defined escalation criteria
So that Urgent/ critical project matters are escalated in a timely mannner.
M
Phase 2
8.13 Project Intelligence and Predictive Analytics
ID
As a
Requirement
Pri
Phase
ITPH-00159
Project Manager
Generate a system-predicted project completion date based on project progress, activities, dependencies, milestones, risks, issues, and other relevant project data
So that I can anticipate potential project delays and take appropriate corrective or mitigating actions.
M
Phase 3
ITPH-00160
Project Manager
Identify the activities, dependencies, issues, risks, and other factors most likely to cause project delays
So that I can focus mitigation efforts on the factors with the greatest impact on the project timeline.
M
Phase 3
ITPH-00161
Project Manager
Receive recommended probability, impact, and risk level for identified project risks
So that I can assess and prioritize risks using relevant project information and historical patterns.
M
Phase 3
ITPH-00162
Project Manager
Analyze project issues and identify possible root causes, related activities, dependencies, and affected project areas
So that I can determine appropriate corrective actions more efficiently.
M
Phase 3
ITPH-00163
Project Manager
Predict potential project cost overruns based on actual costs, committed costs, schedule performance, risks, issues, and historical project data
So that I can identify potential financial exposure before the approved project budget is exceeded.
M
Phase 3
ITPH-00164
Project Manager
Estimate the possible financial impact of project delays, risks, issues, and changes
So that I can assess potential losses or additional costs to the Bank and determine appropriate mitigating actions.
M
Phase 3
ITPH-00165
Project Manager / PSC Member
Assess overall project health based on schedule, risks, issues, financial performance, milestones, actions, and other relevant project information
So that I can obtain an early indication of projects that may require intervention.
M
Phase 3
ITPH-00166
PSC Member
Identify and rank projects requiring management attention based on project health, risks, issues, delays, and financial exposure
So that I can prioritize governance attention and intervention across the project portfolio.
M
Phase 3
ITPH-00167
Project Manager / PSC Member
Identify recurring trends, patterns, and anomalies in project schedule, risks, issues, costs, and performance
So that emerging problems can be identified before they significantly affect project outcomes.
M
Phase 3
ITPH-00168
Project Manager
Generate a draft narrative summary of the Project Status Report based on current project data
So that I can prepare project status updates more efficiently while retaining responsibility for reviewing and validating the generated content.
M
Phase 3
ITPH-00169
PSC Member
Generate a consolidated management summary of project and portfolio performance
So that I can quickly understand key developments, risks, issues, delays, financial exposures, and matters requiring management attention.
M
Phase 3
ITPH-00170
Project Manager / PSC Member
Receive recommended actions based on identified schedule delays, risks, issues, financial variances, and project health conditions
So that I can evaluate possible interventions and make informed project management or governance decisions.
M
Phase 3
ITPH-00171
Project Manager
Simulate the potential effect of proposed changes or mitigation actions on project schedule, cost, risks, and completion date
So that I can evaluate possible courses of action before implementing changes to the project.
M
Phase 3
ITPH-00172
Project Manager / PSC Member
View the key data, assumptions, and factors contributing to a generated prediction, assessment, or recommendation
So that I can understand and evaluate the basis of the generated result before relying on it for decision-making.
M
Phase 3
ITPH-00173
Project Manager / PSC Member
View the confidence level or reliability indicator associated with a generated prediction or recommendation
So that I can consider the level of uncertainty when using the information for decision-making.
M
Phase 3
ITPH-00174
Authorized User
Review, accept, modify, or reject generated predictions, recommendations, summaries, and assessments
So that generated outputs remain subject to appropriate human judgment and validation before becoming official project information.
M
Phase 3
ITPH-00175
Authorized User
View the history of generated predictions, recommendations, and assessments together with the information used, user validation, modifications, and final disposition
So that intelligent system outputs and related user actions are transparent, traceable, and auditable.
M
Phase 3
ITPH-00176
Project Manager
Identify potential project risks based on: 
1. information recorded within the project, including PSR details, schedules, milestones, issues, financial information, and action items (other IT Projects)
2. Lessons Learned database (other IT Projects)
3. Risk register database (other IT Projects)
So that potential risks can be identified early for assessment and appropriate mitigation.
M
Phase 3
8.14 Activity Assignment and My Tasks (new in v1.1)
ID
As a
Requirement
Pri
Phase
ITPH-00253
Project Manager
Assign each activity and milestone to a responsible team member
So that responsibility for every piece of work is clear
M
MVP
ITPH-00254
Project Manager
Reassign an activity to another team member at any time, with the change recorded in the schedule history
So that work can be rebalanced without losing the record
M
MVP
ITPH-00255
Team Member
Receive a notification when an activity is assigned to me
So that I know about new work right away
M
MVP
ITPH-00256
Team Member
Update the % complete, actual start and actual finish of the activities assigned to me
So that progress is recorded by the person doing the work
M
MVP
ITPH-00257
Team Member
Be prevented from editing activities that are not assigned to me
So that the schedule stays under the Project Manager's control
M
MVP
ITPH-00258
Team Member / Project Manager
See a My Tasks page listing my open activities and action items across all projects, with status and due dates, and update them there
So that I can manage all my work in one place
M
MVP
ITPH-00259
Project Manager / Team Member
Filter the schedule to show only the activities assigned to me
So that I can focus on my own work
M
MVP
8.15 Interactive Gantt Chart (new in v1.1)
ID
As a
Requirement
Pri
Phase
ITPH-00260
Project Manager
Drag an activity bar that has not started to a new start date on the Gantt chart
So that I can reschedule visually
M
Phase 2
ITPH-00261
Project Manager
Drag the end of a bar to change the duration of an activity that has not started, or the forecast finish of one in progress
So that I can adjust estimates directly on the chart
M
Phase 2
ITPH-00262
Project Manager
Have dependent activities and milestones move automatically when I move an activity
So that the schedule stays consistent with its dependencies
M
Phase 2
ITPH-00263
Project Manager
Be stopped, with a clear message, from starting an activity before its predecessors finish or in the past
So that invalid schedules are not created
M
Phase 2
ITPH-00264
Project Manager
Keep the baseline bar unchanged when I move activities
So that the variance against the approved baseline stays visible
M
Phase 2
ITPH-00265
Authorized User
Have every change made on the Gantt chart recorded in the schedule history and audit trail
So that changes are traceable
M
Phase 2
8.16 Progress S-curve (new in v1.1)
ID
As a
Requirement
Pri
Phase
ITPH-00266
Project Manager / PSC Member
View a cumulative S-curve of planned, actual and forecast progress for each project
So that the progress trend is visible at a glance
M
MVP
ITPH-00267
Project Manager / PSC Member
See planned % to date, actual % to date, the variance in percentage points and the Schedule Performance Index (SPI)
So that schedule performance is quantified
M
MVP
ITPH-00268
Project Manager / PSC Member
Hover over the S-curve to see the values for any week and view the same data as a table
So that the figures are exact and accessible
M
MVP
ITPH-00269
Project Manager
Include the S-curve in the PSR and export it with the PSR
So that the steering committee sees the trend in the report
M
MVP
8.17 Project Discussions (new in v1.1)
ID
As a
Requirement
Pri
Phase
ITPH-00270
Project team member
Post messages in a discussion channel for each project I have access to
So that the team collaborates in the context of the project
M
Phase 2
ITPH-00271
Project team member
Mention a colleague with @userid so they are notified
So that the right person sees the message
M
Phase 2
ITPH-00272
Project team member
Link a message to an activity or issue, and open the linked item from the message
So that discussions are tied to the work they are about
M
Phase 2
ITPH-00273
Project team member
Start a discussion directly from an activity row
So that raising a question takes one click
M
Phase 2
ITPH-00274
Project team member
See the number of unread messages per project channel
So that I know where there is new activity
M
Phase 2
ITPH-00275
Project team member
Receive new messages in real time without refreshing the page
So that conversations flow naturally
M
Phase 2
ITPH-00276
Authorized User
Have discussion messages retained and recorded in the audit trail according to the Bank's retention policy
So that collaboration is part of the project record
M
Phase 2
8.18 LEAF AI Assistant – Basic (new in v1.1)
ID
As a
Requirement
Pri
Phase
ITPH-00277
User
Open LEAF, the AI assistant, from any screen, and have it know the screen, project and role I am working in
So that help is always in context
M
Phase 2
ITPH-00278
User
Ask how to do something in the Project Hub and get step-by-step instructions with a link that opens the right screen
So that I can learn the system without a manual
M
Phase 2
ITPH-00279
User
Ask LEAF to open a screen, such as the Gantt chart or My Tasks
So that I can navigate by asking
M
Phase 2
ITPH-00280
User
Ask LEAF for facts such as who owns an activity, dates, % complete, my assignments and the PSR due date
So that I get answers without searching
M
Phase 2
ITPH-00281
User
Have LEAF prepare simple changes (assign an activity, update progress, move a start date, add an action item or risk, post a message) that I apply or dismiss
So that routine updates are faster while I stay in control
M
Phase 2
ITPH-00282
User
Be told by LEAF Basic when a question needs analysis, and be pointed to LEAF Advanced
So that the two modes are clear
M
Phase 2
8.19 LEAF AI Assistant – Advanced (new in v1.1)
ID
As a
Requirement
Pri
Phase
ITPH-00283
Authorized role
Have LEAF explain a project's health, schedule variance and likely root causes (delivers ITPH-00160, 00162, 00165)
So that I understand why a project is at risk
M
Phase 3
ITPH-00284
Authorized role
Run what-if checks on an activity delay and see the new finish date, affected milestones and liquidated damages as a chart (delivers ITPH-00164, 00171)
So that I can judge the impact before deciding
M
Phase 3
ITPH-00285
Authorized role
Compare my projects in a ranked portfolio snapshot (delivers ITPH-00166)
So that I see which projects need attention first
M
Phase 3
ITPH-00286
Authorized role
Have LEAF interpret S-curve trends and the SPI (delivers ITPH-00167)
So that trends and anomalies are spotted early
M
Phase 3
ITPH-00287
Project Manager
Have LEAF draft the PSR narrative from project data, which I review before it is inserted (delivers ITPH-00168)
So that status reporting takes less time
M
Phase 3
ITPH-00288
Project Manager
Have LEAF suggest risks that may be missing from the register (delivers ITPH-00161, 00176)
So that risks are identified earlier
M
Phase 3
ITPH-00289
Authorized role
Have LEAF summarize a project discussion
So that I can catch up quickly
M
Phase 3
ITPH-00290
Authorized role
See the confidence level and key factors behind every LEAF prediction or recommendation (delivers ITPH-00172, 00173)
So that I can judge how far to rely on it
M
Phase 3
8.20 LEAF Governance (new in v1.1)
ID
As a
Requirement
Pri
Phase
ITPH-00291
Application Administrator
Choose which roles can use LEAF Advanced
So that access to AI analysis follows the Bank's policy
M
Phase 2
ITPH-00292
Application Administrator
Turn LEAF's suggested changes on or off
So that the Bank controls how far the assistant can act
M
Phase 2
ITPH-00293
Authorized User
Have every LEAF suggestion that is accepted or rejected logged with the user, time and content, and view the recent AI decisions (delivers ITPH-00174, 00175)
So that AI use is auditable
M
Phase 2
ITPH-00294
User
Have LEAF apply a change only after I click Apply, and only if my role allows that change
So that the assistant never acts on its own or beyond my authority
M
Phase 2
ITPH-00295
User
Have LEAF answer only from Project Hub data, and fall back to built-in answers when the AI service is unavailable
So that answers stay grounded and the assistant keeps working
M
Phase 2
9. Non-Functional Requirements
Security and audit requirements are in the MVP because the system cannot go live without them. Items flagged ⚑ need clarification (see Section 15). Section 9.8 is new in v1.1.
9.1 Interface/Usability Requirements
ID
Requirement
Pri
Phase
⚑ ITPH-00177
The system shall be able to interface to the bank's SIEM
M
Phase 2
9.2 Performance Requirements
ID
Requirement
Pri
Phase
⚑ ITPH-00178
The system shall allow only one (1) active session per user.
M
MVP
⚑ ITPH-00179
The system shall be available except during system and database back-up
M
MVP
ITPH-00180
The system shall be able to support multiple screens without affecting the speed performance.
R
MVP
9.3 Operational Requirements
ID
Requirement
Pri
Phase
⚑ ITPH-00181
The system shall be compatible with the updated/latest IT hardware, database and operating systems architecture of the Bank.
For example:
- Hardware for voice – LINUX
- Hardware for transactions - Windows , AIX
- Database- Oracle 19c, MS SQL
M
MVP
ITPH-00182
The system shall be web-based enabled accessible via intranet.
M
MVP
ITPH-00183
The system shall be able to run on all types of browsers and with their latest versions available in the market (e.g. Mozilla, Chrome, Microsoft Edge)
M
MVP
ITPH-00184
The system shall use secure http for browser-based application with the deployment of SSL Certificate.
M
MVP
ITPH-00185
The system shall have a facility to back up and restore all files including user profiles and databases.

The system shall have a facility to back up and restore defined files including user profiles and databases (e.g., files, logs, tables, database, etc.)
M
MVP
ITPH-00186
The system shall be capable of being triggered manually to run a batch process in case running automatically is not available.
M
Phase 2
9.4 Portability Requirements
ID
Requirement
Pri
Phase
ITPH-00187
The system shall adapt to changes in LBP IT architecture, hardware, software, and database platforms that are currently supported by the Bank
 (e.g., Windows server 2019, Oracle 19c, MS SQL,etc.).
M
MVP
9.5 Reportorial Requirements
ID
Requirement
Pri
Phase
ITPH-00188
The system shall allow dashboards, reports and raw data to be extracted in the following formats:
 • .pdf
 • .doc / .docx
 • .csv
 • .xlsx
M
MVP
ITPH-00189
The system shall have options for filtering dates (e.g. as of date , Date from)
M
MVP
⚑ ITPH-00190
The system shall be able to generate the following reports on scoring process results as follows
a. PSR
M
MVP
ITPH-00191
b. Budget and Financial Reports (total utilized contingency fund, liquidated damages)
1. Liquidated Damages
 a. Total liquidated Damages
 b. Total collected LD (including deducted from the DO, offset)
 c. Total cancelled LD
M
Phase 2
ITPH-00192
c. Summary of Issues and log reports across all projects
M
Phase 2
ITPH-00193
d. Summary of Lessons Learned across all projects
M
Phase 2
ITPH-00194
Aging of Uncompleted Task per project (reflect the assigned Responsible Person/s and Reason for delay)
M
MVP
9.6 Security Requirements
ID
Requirement
Pri
Phase
ITPH-00195
The system shall be accessed through a valid user ID and at least one (1) of the following authentication methods is needed in order to gain system access:
a. Something the user knows, such as a password
b. Something the user has, such as a token device or a smart card
c. Something the user is, such as a biometric
M
MVP
ITPH-00196
The numeric parameters concerning User ID, password and logon control properties shall be parameterized/not hard-coded. An admin user shall be able to set and modify the values.
M
MVP
ITPH-00197
The user ID shall be unique
M
MVP
ITPH-00198
The user ID shall be not case-sensitive
M
MVP
ITPH-00199
The user ID shall have a minimum length of four (4) alphabetic, numeric, or alphabetic characters
(LANDBANK ID number or approved ID naming convention/format for specific
system)
M
MVP
ITPH-00200
The password shall have a minimum length of twelve (12) characters or if the system does not support 12 characters, a minimum length of 8 characters shall
be used.
M
MVP
ITPH-00201
The password shall be different from user ID
M
MVP
ITPH-00202
The password shall be case-sensitive
M
MVP
ITPH-00203
The password shall not be readable when entered/displayed and stored
M
MVP
ITPH-00204
The password shall be encrypted during transmission and storage
M
MVP
ITPH-00205
The password shall have a combination of alphabetic and numeric characters
M
MVP
ITPH-00206
The password shall be required to be changed at initial logon (unless user-nominated) and after resetting by an administrator
M
MVP
ITPH-00207
The password can be changed by the owner of the User ID anytime, when desired
M
MVP
ITPH-00208
The password expires and needs to be changed by the the user in 90 calendar days from the date of last change
M
MVP
⚑ ITPH-00209
The password shall have a password re-use/history:
- different from last one (1) password (for Non-CDE)
M
MVP
ITPH-00210
Invalid authentication attempts are limited by:
- Locking out of the user ID after 3 consecutive invalid attempts and
- Setting the lockout duration to a minimum of 30 minutes or until the user’s identity is confirmed.
M
MVP
ITPH-00211
Re-logon is required if a session or terminal has been idle for more than 15 minutes to reactivate the session or terminal.
M
MVP
⚑ ITPH-00212
The system shall have a setting for the multi-factor authentication for all remote and non-console access of both individuals and third-party
M
MVP
⚑ ITPH-00213
The audit trail entries for each of the 7 identified log events shall record the following:
a. System Code 
(alphanumeric; e.g. CRES)
M
MVP
ITPH-00214
b.1. User ID 
(alphanumeric; e.g., A001)
M
MVP
ITPH-00215
b.2. Name 
(as applicable, in alphanumeric; e.g., John Doe)
R
MVP
ITPH-00216
c. Type of Event
(alphanumeric; e.g, Inquire, View, Add, Delete, Modify)
M
MVP
ITPH-00217
d. Date and time
(e.g., MM/DD/YY HH:MM:SS; 24-hour format)
M
MVP
ITPH-00218
e. Success or failure indication
(alphanumeric; e.g., Success or Failed)
M
MVP
ITPH-00219
f. Origination of Event 
(alphanumeric; e.g, IP address, Terminal ID, Host name)
M
MVP
ITPH-00220
g. Identity or name of affected data, system component, or resource
(alphanumeric; e.g., Security Parameter)
M
MVP
⚑ ITPH-00221
For non-Cardholder Data Environment (CDE), the audit trail entries shall record the following:
- User identification
M
MVP
⚑ ITPH-00222
- Date
M
MVP
⚑ ITPH-00223
- Time
M
MVP
⚑ ITPH-00224
- Transaction Type/Menu/Transaction Code/Action

Note: Transactions would pertain to the actions made in the Credit Risk Engine.
M
MVP
ITPH-00225
The system shall have an access control system that restricts access based on a user's need to know (i.e., individual personnel's job function) and is set to "deny all" unless specifically allowed
M
MVP
ITPH-00226
The system shall have facility for the following security administration functions:
- Addition, modification and deletion of User Role/Group. The User Role or Group refers to a collection of permissions to view/update/delete transactions and reports
M
MVP
ITPH-00227
- Addition, assignment to a user Role/Group and deletion of user
M
MVP
ITPH-00228
- Modification of user record (e.g., Name or assigned User Role/ Group)
M
MVP
ITPH-00229
- Search/query/find – to facilitate locating specific user ID or User Profile/Group
M
MVP
ITPH-00230
- Resetting of user password
M
MVP
ITPH-00231
- Unlocking of User ID
M
MVP
ITPH-00232
- Lifting of suspension/unlocking of access and password resetting can be assigned as a sole capability of a specific user profile/role
M
MVP
ITPH-00233
- Manual deactivation of user ID
R
MVP
ITPH-00234
List of System Users in report format. Report shall include:
- User ID
M
MVP
ITPH-00235
- User Name
M
MVP
ITPH-00236
- User Role/Group
M
MVP
ITPH-00237
- User Unit/Location
M
MVP
ITPH-00238
- Status
M
MVP
ITPH-00239
- Date of last logon
R
MVP
ITPH-00240
Admin should be able to filter the list by User Unit/location
M
MVP
⚑ ITPH-00241
The proposed solution shall work with the Bank’s existing security infrastructure (Active Directory)
R
Phase 2
⚑ ITPH-00242
The System shall be able to integrate with bank's existing Active Directory (AD) or LDAP for user authentication and management
R
Phase 2
⚑ ITPH-00243
The system shall be available except during system and database back-up and maintenance.
Note: The service providers shall recommend resource requirements to ensure 24/7 system availability.
M
MVP
9.7 Audit Requirements
ID
Requirement
Pri
Phase
ITPH-00244
The system shall be able to log all users (i.e., Application Administrator, Security Administrator, System Administrator and Transaction processors) activities and information such as but not limited to the following:
a. Date and Time of user log-in and log-off
M
MVP
ITPH-00245
b. User ID and name
M
MVP
⚑ ITPH-00246
c. Date and time of activity done in the system

Example: 
a. change on the model history
b. Track promotion of models
c. decomissioning of models
M
MVP
ITPH-00247
d. Type of Event
M
MVP
ITPH-00248
e. Date/Time
M
MVP
ITPH-00249
f. Success or Failure Indication
M
MVP
ITPH-00250
g. Remarks/Status (e.g., successful login, locked ID)
M
MVP
ITPH-00251
The system shall be able to log transactions, meaning all successful, cancelled and rejected transactions should be accounted for.
M
MVP
ITPH-00252
The system shall have the facility to store and retrieve Audit Trail data of all user activities.
M
MVP
9.8 Usability, Branding and AI Platform
ID
Requirement
Pri
Phase
ITPH-00296
The system shall use the Bank's visual identity (logo and green colour palette) and allow the Application Administrator to upload or change the Bank logo.
M
MVP
ITPH-00297
The system shall offer light, dark and match-system display themes, remembered for each user.
M
MVP
ITPH-00298
The system shall use a three-panel layout (navigation, list, detail) and remain usable at tablet and phone widths.
M
MVP
ITPH-00299
The system shall meet WCAG 2.1 AA for colour contrast, keyboard access and screen-reader labels.
M
MVP
ITPH-00300
Real-time features (discussions, notifications) shall run over encrypted WebSocket connections within the Bank's intranet.
M
Phase 2
ITPH-00301
The AI service behind LEAF shall run on Bank-approved infrastructure; project data shall not be used to train external models, and prompts and responses shall be logged.
M
Phase 3
10. Reports and Exports
All reports can be filtered by date (as-of date, date from–to) and exported to PDF, DOCX, CSV and XLSX (ITPH-00188, 00189).
Report
Content
Phase
Ref
Project Status Report (PSR)
Schedule, milestones, issues, risks, financials, actions, narrative, next-period plan
MVP
0094–00108, 00190
Portfolio PSR (PPSR)
Consolidated status of all projects in a portfolio
MVP
00101
Gantt chart
Planned vs actual vs forecast with dependencies and milestones; drag to reschedule (P2)
MVP
0024, 00260
Progress S-curve
Cumulative planned, actual and forecast % complete; SPI and variance; weekly data table
MVP
00266–00269
My Tasks
Each user's open activities and action items across projects
MVP
00258
Issue and action log (per project)
Open/closed issues, owners, aging, actions
MVP
0031–0040
Risk register
Risks, ratings, owners, mitigation, residual rating
MVP
0041–0050
Budget and financial status
Budget, actual, committed, forecast, variance, contingency
MVP
0062–0070
Aging of uncompleted tasks
Per project, with responsible person and reason for delay
MVP
00194
User list
User ID, name, role, unit/location, status, last logon; filter by unit
MVP
00234–00240
Audit trail
All user activity and transactions
MVP
00244–00252
Liquidated damages report
Per milestone and total; collected, offset/deducted and cancelled
P2
0083, 00191
Change request log
Consolidated CRs with status, impact and cost
P2
0091
Cross-project issue summary
Issues and logs across all projects
P2
00192
Lessons learned summary
Across all projects, searchable
P2
00193, 00134
LEAF decision log
AI suggestions accepted or rejected, by user, time and content
P2
00293
Management summary (AI-assisted)
Portfolio performance narrative, validated by PSC
P3
00169
11. User Experience and LEAF Design
This section records the design choices made and validated in the prototype (Appendix B). The prototype is the UI reference for the build.
11.1 Design principles
	•	Clear at a glance: health is shown with colour, a label and position together, never colour alone. Summary comes before detail.
	•	Work where the data is: people update progress, discuss and ask LEAF without leaving the screen they are on.
	•	One consistent frame: every screen uses the same navigation, list and detail layout, so users learn it once.
	•	Humans decide: the system calculates and LEAF suggests; people approve, apply and sign off.
11.2 Layout and navigation
Area
Design
Left navigation
Dark green sidebar with the Bank logo on a white panel, product name, and role-based menu: Portfolio, Projects, My Tasks, Approvals, Discussions, Notifications, Configuration or Users and security. Counts show as badges.
Top bar
Breadcrumb (for example Projects / Loan Origination System Upgrade), project search, theme switch (light, dark, match system), notifications bell and the signed-in user.
List panel
The items of the current area (projects, approvals, channels, admin sections) with health dots and progress bars.
Detail panel
The selected item with a header, key figures and tabs: Overview, Schedule, Issues and actions, Risks, Financials, S-curve, Status reports, Discussion, Liquidated damages, History.
Phones and tablets
The sidebar becomes a top bar and the list and detail panels stack, with a Back button. No sideways page scrolling.

11.3 Visual identity
Token
Value
Use
Brand green
#74BC44
From the Bank logo: selected menu marker, badges, progress bars, LEAF accents
Primary green
#2F7D32
Buttons, links and focus rings on white (meets text contrast)
Sidebar green
#123A1C
Navigation background
Status colours
Green #17803F · Amber #A96A00 · Red #B8321F
On track / At risk / Critical, always with a text label
Chart series
Planned #3A62B8 · Actual #2F7D32
S-curve; checked for colour-blind separation
Typeface
IBM Plex Sans; IBM Plex Mono for IDs and codes
Clear at small sizes, tabular numbers in tables

Dark mode has its own tuned palette rather than an inverted one. The Bank logo keeps its white panel in both themes.
11.4 LEAF AI assistant
LEAF (LANDBANK Enhanced AI Framework) opens from an "Ask LEAF" button on every screen as a side panel. It knows the current screen, project and the user's role, offers suggested questions, and shows its answers in plain language. The LEAF mascot is used on the button, the panel header and the welcome screen.

LEAF Basic
LEAF Advanced
Purpose
Helps people use the app
Analyses project data
Who
All users
Roles chosen by the Application Admin (default: PM, DH, PS, PSC, QA, App Admin)
Can do
How-to steps with "Take me there"; open screens; look up owners, dates, % done, assignments, PSR due date; prepare simple changes (assign, progress, start date, action item, risk, message)
Everything in Basic, plus: explain health and root causes; what-if delay simulation with a chart of finish date, milestones and LD; portfolio comparison chart; S-curve and SPI reading; draft PSR narratives; suggest missing risks; summarise discussions
Will not
Analyse, forecast or draft; it points the user to Advanced
Change anything without the user's Apply
Phase
Phase 2
Phase 3 (delivers Annex C 4.1.13)

How LEAF works
	•	LEAF reads Hub data through a small set of controlled functions (overview, project detail, my tasks, what-if simulation, portfolio comparison, S-curve, help and navigation). It sees only what the user is allowed to see.
	•	Changes are prepared as suggestion cards with Apply and Dismiss. The Hub re-checks the user's role when they click Apply, then records the decision.
	•	Answers must come from Hub data. Predictions show a confidence level and the factors behind them.
	•	If the AI service is unavailable, LEAF gives built-in answers ("Offline answers") for help, navigation and the standard analyses.
	•	The Application Admin controls which roles get Advanced and can turn suggestions off. All accepted and rejected suggestions are listed on the LEAF settings page and in the audit trail.
12. Key Data Entities
Entity
Key attributes
Project
Code, name, business unit, portfolio, PM, DH, PS, status, health, approved budget, contingency, contract value
Procurement / Contract
Vendor, NOA date, PO no./date, NTP date, contract start/expiry, contract price
Activity
WBS code, name, parent, planned start/finish, baseline start/finish, forecast start/finish, actual start/finish, % complete, responsible person
Dependency
Predecessor, successor, type (FS/SS/FF/SF), lag
Milestone
Name, due date, deliverable, price of deliverable (for LD), delivered date, status
Baseline
Version, approval date, approver, snapshot of activities and budget
Issue / Action / Decision
Category, priority, owner, target date, status, actions, assignees, decision log
Risk
Category, probability, impact, rating, owner, response strategy, mitigation, residual rating, status history
Budget change / Contingency draw
Amount, effective date, reason, approver
Cost / Invoice
Type (actual/committed/forecast), amount, date; invoice no./date, DO no./date, vendor, date paid, status, remarks
Vendor rate
Vendor, position, cost per man-day, effective date
LD record (P2)
Milestone, undelivered value, delay days, rate, computed LD, adjustment, disposition
Change request (P2)
Description, reason, requestor, date raised, impact, man-days per position, cost, status, approvals
PSR
Period, status, snapshot data, narrative, attachments, approval steps, comments
Lesson learned / MoM (P2)
Category, description, recommendation, project; meeting date, attendees, decisions, action items
Configuration
Holidays, LD rate and cap, thresholds, aging periods, alert recipients, password policy parameters
Activity assignment
Activity, assignee, assigned by, assigned at, previous assignee (history)
Discussion message (P2)
Project, author, timestamp, text, linked activity or issue, mentions, read markers per user
Notification
Recipient, type (assignment, mention, approval, alert), message, link, read status
LEAF interaction log
User, role, mode (Basic/Advanced), question, suggestion made, decision (applied/dismissed), timestamp
LEAF settings
Roles allowed Advanced, suggestions on/off
User / Role / Permission / Audit log
As required by Security and Audit requirements (Section 9)
13. Integrations and Technical Environment
Interface
Purpose
Method (proposed)
Phase
Email (SMTP relay)
Notifications, reminders, escalations
Bank SMTP relay; in-app notification centre as well
MVP
SIEM
Security event forwarding
Syslog / CEF over TLS; format to match the Bank's SIEM
P2
Active Directory / LDAP
Login and user provisioning
LDAPS bind; roles still managed in the Hub
P2
MFA
Second factor for login
Authenticator-app OTP (TOTP) or email OTP, switchable by setting
MVP
Real-time messaging
Live discussions and notifications
WebSocket server inside the intranet over TLS (e.g. Laravel Reverb)
P2
AI service (LEAF)
Answers, analysis, drafting and suggestions
Large language model with tool calling (e.g. Claude) through a Bank-approved hosting option; LEAF functions run inside the Hub; no training on Bank data; prompts and responses logged
P2 / P3

13.1 Target environment
	•	Web application reachable only on the LANDBANK intranet over HTTPS with the Bank's SSL certificate (ITPH-00182, 00184).
	•	Supported databases: Oracle 19c or MS SQL Server (ITPH-00181, 00187). Application server on Windows Server 2019 or Linux, per Bank standard.
	•	Supported browsers: latest Chrome, Edge and Firefox (ITPH-00183).
	•	Separate development, UAT and production environments.
14. Assumptions, Constraints and Dependencies
Assumptions
	•	Project data is encoded in the Hub; there are no automatic feeds from procurement or finance in the MVP.
	•	LANDBANK supplies its current PSR and PPSR templates so the generated reports match the approved format.
	•	Ongoing projects will be migrated by importing Excel templates provided by the Hub (MS Project import to be confirmed).
	•	Each project follows a schedule-based (waterfall or hybrid) plan. Agile boards are not in scope.
	•	The prototype reviewed in v1.1 is the agreed UI reference. It uses sample data and simulates multi-user features in one browser; the build adds the server side.
	•	Project discussions support collaboration and are not the official record of decisions; decisions are still recorded in the Decisions log and PSR.
Constraints
	•	Intranet-only deployment; must comply with BSP IT risk management rules, the Data Privacy Act (RA 10173) and LANDBANK information security policies.
	•	Password, lockout and session rules in Section 9 are fixed Bank standards.
Dependencies
	•	Infrastructure (servers, database, SSL, SMTP) ready by week 4.
	•	ITPMD process owner available for weekly sprint reviews and UAT.
	•	IT Security available for VAPT in weeks 10–11.
15. Open Issues and Clarifications for LANDBANK
Items marked MVP need answers by the end of week 2 to hold the 3-month timeline.
#
Needed for
Topic
Question
Ref
1
MVP
Phased acceptance
Will LANDBANK accept phased delivery (MVP, then Phase 2 and 3), or must all Mandatory items be delivered and accepted together?
All
2
MVP
PSR template
Please share the current PSR and PPSR templates and a sample of a completed report.
0094–00101
3
MVP
PS routing rule
When does a PSR need Project Sponsor approval? (BR-10 has a proposal.)
00118
4
MVP
Reporting period
Is the PSR monthly for all projects? What is the submission deadline?
0097, 00148
5
MVP
Health and attention criteria
Confirm thresholds for project health and "requiring management attention" (BR-03 to BR-06).
00130, 00132
6
MVP
Escalation matrix
Aging periods, escalation levels and recipients for issues, actions and risks.
003, 0039, 0048, 00158
7
MVP
Audit log events
ITPH-00213 refers to "7 identified log events". Please list them.
00213
8
MVP
Template carry-overs
Some items mention "Credit Risk Engine", "models", "scoring process", cardholder data environment (CDE) and "hardware for voice". Please confirm which apply to the Project Hub.
00181, 00190, 00209, 00221–00224, 00246
9
MVP
Platform
Target database (Oracle 19c or MS SQL), OS and app server; who provides and manages the infrastructure?
00181, 00187
10
MVP
MFA method
Preferred second factor: authenticator app, email OTP, hardware token or smart card?
00195, 00212
11
MVP
Single session
On a second login, should the old session be ended or the new login blocked?
00178
12
MVP
Volumes and retention
Number of users, concurrent users, active projects per year, attachment size limits, and retention periods for PSRs and audit logs.
00252
13
MVP
Availability and DR
Required uptime, backup schedule, RTO and RPO. ITPH-00179 and 00243 overlap.
00179, 00185, 00243
14
MVP
Data migration
How many ongoing projects must be loaded at go-live, and in what format (Excel, MS Project)?
—
15
MVP
Brand usage
Confirm use of the LANDBANK logo, colours and the LEAF name and mascot in the Hub, and who approves brand use.
00296
16
MVP
Assignees
Can activities be assigned to people outside ITPMD (for example vendor staff or business users)? If yes, what access do they get?
00253 – 00257
17
MVP
S-curve weighting
Weight progress by activity duration (proposed) or by cost/value? Should the S-curve appear in the PSR from the MVP?
00266 – 00269
18
Phase 2
LD computation
Confirm LD rate, basis (price of undelivered portion), calendar vs working days, warning level and 10% cap behaviour.
002, 0073–0083
19
Phase 2
LD disposition
Who records collection, offset (deduction from DO) and cancellation of LD?
00191
20
Phase 2
Project Work Plan (PWP)
What is the PWP? Is it the activity schedule, or a separate action plan? MoM action items feed into it.
00111
21
Phase 2
Forecast approval
Who is the "Authorized Approver" for forecasts? Does an approved forecast replace the baseline?
0019–0021
22
Phase 2
"Material change"
What changes should trigger automatic forecast recalculation?
0017
23
Phase 2
SIEM
Which SIEM product, and which log format and transport?
00177
24
Phase 2
AD / LDAP
Will login use AD/LDAP? If yes, the password rules apply only to local accounts.
00241, 00242
25
Phase 2
Integrations
Should NOA, PO, NTP, invoice or DO data come from an existing Bank system instead of manual entry?
0008, 0071
26
Phase 2
Discussion retention
How long are discussion messages kept? Can messages be edited or deleted, and should they be moderated?
00275
27
Phase 2
Gantt editing rights
Should only the PM move the schedule on the Gantt, or may delegates do so? Should big moves need approval?
00260 – 00265
28
Phase 2
LEAF access
Which roles should get LEAF Advanced, and should Team Members have it? Should LEAF suggestions be on at go-live?
00291, 00292
29
Phase 2
LEAF service
Which AI hosting option and model does the Bank approve, and what usage budget applies?
00301
30
Phase 3
AI hosting
May the Hub use an external AI service, or must models run on-premises? What data classifications are allowed?
00159–00176
31
Phase 3
AI acceptance
What accuracy or confidence level makes a prediction acceptable for UAT?
00159, 00173
32
Phase 3
Historical data
Are past PSRs, risk registers and lessons learned available to seed the predictions and repositories?
0052, 00112, 00176

15.1 Observations on the source matrix
	•	ID formats are inconsistent (ITPH-0010 vs ITPH-00100). We suggest a single 3-digit format (ITPH-010, ITPH-100) with a mapping table, to avoid confusion in testing and acceptance.
	•	Section number 5.2.5 is used twice (Portability and Reportorial). 5.2.4 Maintainability is marked Not Applicable.
	•	ITPH-00179 and 00243 (availability) and ITPH-00241 and 00242 (AD/LDAP) overlap and can be merged.
	•	ITPH-00200 allows an 8-character fallback. The Hub will support 12 characters, so the fallback is not needed.
	•	ITPH-00209 requires only 1 previous password to be remembered. Please confirm this is the intended standard for non-CDE systems.
	•	Classification values are mixed case (Mandatory / MANDATORY). No change in meaning.
Appendix A. Requirement Count by Module and Phase
Module
MVP
Phase 2
Phase 3
Total
Project Hub Set-up and Administration
2
1
0
3
Project & Schedule Management
21
6
0
27
Project Issue Management
10
0
0
10
Project Risk Management
10
1
1
12
Project Financial Management
15
5
0
20
Liquidated Damages
0
11
0
11
Change Requests
0
10
0
10
Project Status Reporting
14
5
0
19
Workflow & Approvals
11
0
0
11
Portfolio / Governance Management
5
6
0
11
User & Access Management
12
1
0
13
Notifications & Alerts
5
6
0
11
Project Intelligence and Predictive Analytics
0
0
18
18
Activity Assignment and My Tasks (new)
7
0
0
7
Interactive Gantt Chart (new)
0
6
0
6
Progress S-curve (new)
4
0
0
4
Project Discussions (new)
0
7
0
7
LEAF AI Assistant – Basic (new)
0
6
0
6
LEAF AI Assistant – Advanced (new)
0
0
8
8
LEAF Governance (new)
0
5
0
5
NFR – Interface/Usability Requirements
0
1
0
1
NFR – Performance Requirements
3
0
0
3
NFR – Operational Requirements
5
1
0
6
NFR – Portability Requirements
1
0
0
1
NFR – Reportorial Requirements
4
3
0
7
NFR – Security Requirements
47
2
0
49
NFR – Audit Requirements
9
0
0
9
NFR – Usability, Branding and AI Platform (new)
4
1
1
6
Total
189
84
28
301

Appendix B. Prototype Walkthrough
The prototype runs on sample projects and lets the reviewer switch users to see each role. Use this script to demonstrate the requirements.
#
Sign in as
Do this
Shows
1
Ramon (PM)
Open Loan Origination System Upgrade: Overview, then Schedule
Health rules, milestones, assignment column (00253), forecast recalculation (0017)
2
Ramon (PM)
Assign UAT to Paolo; open the Gantt and drag System integration testing later
Assignment notice (00255); dependent activities move, baseline stays (00260 – 00264)
3
Ramon (PM)
Open the S-curve tab and hover the chart
Planned vs actual vs forecast, SPI (00266 – 00268)
4
Ramon (PM)
Press the chat button on an activity and mention @pgarcia
Linked message and mention (00271 – 00273)
5
Paolo (Team)
Open My Tasks and Notifications; update % done
Assignee-only updates (00256 – 00258)
6
Ramon (PM)
Status reports: Generate PSR, Draft with LEAF, Apply, Submit
PSR from live data (0094), LEAF draft with approval (00287, 00294)
7
Jose (DH) then Ana (PS)
Approvals: approve the Branch Network PSR
Routing to the Sponsor, approval history (00113 – 00123)
8
Liza (PSC)
Portfolio dashboard; Generate PPSR; Ask LEAF "Compare my projects"
Needs-attention list (00130), PPSR (00101), portfolio chart (00285)
9
Any
Ask LEAF in Basic: "How do I submit a PSR?"; switch to Advanced: "What if A6 slips 15 working days?"
Help with Take me there (00278); what-if chart (00284)
10
Nina (App Admin)
Configuration: Holiday calendar, Alert thresholds, LEAF assistant
Calendar recalculation (001), thresholds (003), LEAF governance (00291 – 00293)
11
Karlo (Sys Admin)
Users and security: unlock Elena, view the audit trail
Security administration (00226 – 00233), audit (00244 – 00252)

Appendix C. Sign-off
By signing below, the parties confirm that this BRD, together with the answers to Section 15, is the agreed baseline for the design and build of the ITPMD Project Hub.
Name
Position
Signature
Date

ITPMD Department Head



PSC Representative



Information Security Officer


Joms
Solution Lead


