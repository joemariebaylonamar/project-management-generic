# Solutioning — Requirements Elicitation

> Updated during Solutioning — Requirements Elicitation

## Requirement metadata

All requirements below share these values from the source:

| Field | Value |
| --- | --- |
| Requirement Type | Functional |
| POC | Y |
| Primary Stakeholder | TPMO |
| Importance | 1-Essential |
| Priority | P1 |

The source leaves the following tracking fields blank for every requirement: **Verification Activity**, **Test Procedure Steps**, **Expected Results**, **Actual Results**, **Results Remarks (mandatory for Partially Met)**, **Status**, and **Final Release Plan**. They are retained in the verification tracker at the end of this document.

## Requirements

### Workplan

#### WP001 — Input Capabilities

The tool shall allow users to input project schedule tasks with the following information:
- Task Description
- Task Duration
- Project Start Date
- Assigned Resource for the Task

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP002 — Input Capabilities

The tool shall have the capability to define project schedule tasks at either parent or child level, allowing for hierarchical tasks.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP003 — Input Capabilities

The tool shall allow users to tag a predecessor and successor for each project schedule task.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP004 — Input Capabilities

The tool shall allow users to tag leads and lags per project schedule task.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP006 — Input Capabilities

The tool shall allow users to update the percentage completion of each task.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP007 — Input Capabilities

The tool shall automatically capture the actual start and end dates of the task once initiated/completed.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP008 — Input Capabilities

The tool shall allow users to add milestones to the project schedule.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP010 — Critical Path Capabilities

The tool shall identify the critical path of the project given the different tasks.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP015 — Hygiene Navigational Capabilities

The tool shall contain a holiday calendar that will automatically apply to the entire workplan.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP017 — Baseline Capabilities

The tool shall allow users to set baseline tasks by saving the task, duration, task start and task finish.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP018 — Baseline Capabilities

The tool shall store at least 10 rebaseline records for historical purposes.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP022 — Baseline Capabilities

The tool shall allow users to select the baseline that will be the basis of %Planned, %Actual and RAG Status of the project.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP023 — Computation Capabilities

The tool shall compute Planned and Earned Value for each project schedule task.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP027 — Computation Capabilities

The tool shall compute the overall schedule KPI as `%Actual / %Planned`.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP035 — Capabilities for Program Schedule

The tool shall consolidate multiple project schedules/workplans for all sub-initiatives of a program into one mother program schedule.

For context: One program can have four sub-initiatives, each with its own project schedule.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WP036 — Capabilities for Program Schedule

The tool shall roll up information from sub-initiatives to programs, or from multiple MVPs or projects, to produce the overall workplan and KPIs.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

### Project Binder

#### PB003 — Risks and Issues

The tool shall allow users to create risks and issues with fields including, but not limited to:
- Item No
- Event Type (predefined choices)
- Event Category (predefined choices)
- Event Description
- Additional Info
- Priority Level
- Milestone where the dependency was initially identified (predefined choices)
- Raised By
- Date Assigned
- Initial Notification Source
- Planned Actions
- Assigned To
- Org. Unit
- Target Date
- Date Executed
- Action Item
- Action Item Status
- Results of Action Item
- Aging
- Overall Status per Event Description Action Items
- Last Status Update

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### PB004 — Risks and Issues

The tool shall track aging of each risk and issue based on Current Date, Target Date and Action Item Status.

Aging count:
- Red: equal to or more than 8 days
- Amber: 2 to 7 days
- Green: equal to or less than 2 days

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### PB010 — Change Request

The tool shall tally the number of approved reschedules and timeline rebaselines from the CRs logged by users, based on CR approval date.

Example: Three timeline rebaselines happened for Project A during July.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### PB013 — Metrics Log

The tool shall consolidate the following statistics across dependencies, risks, issues, defects and CRs:
1. Aging tally of dependencies with RAG status
2. Aging tally of risks with RAG status
3. Aging tally of issues with RAG status
4. Aging tally of defects with RAG status
5. Aging tally of CRs with RAG status

Example — dependency aging tally as of August 28:
- Red: 3 open dependencies
- Amber: 5 open dependencies
- Green: 7 open dependencies

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### PB014 — Metrics Log

The tool shall compute the overall RAG status of all leading indicators by selecting the most severe RAG status across risks and issues.

Example: Risk = Red; Issue = Amber. Overall status = Red.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

### Weekly Status Report (WSR)

#### WSR001.2 — WSR Generation

The tool shall automatically pull data from source fields into the Weekly Status Report (WSR).

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WSR002 — WSR Generation

The tool shall autofit contents to the provided WSR template.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WSR004 — WSR Generation Page 1

The tool shall display and compute the overall schedule KPI RAG status:
- Red: equal to or below 0.70
- Amber: between 0.70 and 0.90
- Green: equal to or above 0.90

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WSR010 — WSR Generation Page 2

The tool shall allow users to input qualitative WSR information in the following fields:
- Weekly Summary Highlights
- Schedule Highlights
- Budget Highlights
- Risks and Issues Highlights
- Scope Highlights
- Defects Highlights
- Items for Management Attention
- Key Accomplishments for the Week
- Activities for Next Week

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### WSR016 — Report Download

The tool shall allow users to download the generated three-page WSR in PPT and PDF once all required inputs are populated.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

### Overall Project Dashboard

#### DAS002 — Dashboard Publishing

The tool shall automatically generate a dashboard showing the monthly trend of overall project count segmented by Project Status, including key-value comparisons versus the previous month.

Project Status: Completed, Implemented, Ongoing (On-Track), Ongoing (At Risk), Ongoing (Not Met), On Hold, Cancelled.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### DAS003 — Dashboard Publishing

The tool shall automatically generate a dashboard showing weekly trends in project count per RAG Status, with comparisons against the last reporting date.

Example: 5 projects are Red this week, 6 were Red last week, and 8 were Red two weeks ago.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### DAS004 — Dashboard Publishing

The tool shall automatically generate a dashboard showing quarterly statistics for committed milestones: how many will be on time, at risk, or delayed (Milestone Forecast Analysis). For delayed milestones, the tool shall display the realistic forecast implementation date.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### DAS008 — Dashboard Publishing

The tool shall automatically generate a dashboard showing MVPs or Releases committed for implementation per quarter and classify them as On Time, At Risk of Delay, or Delayed.

Metrics:
- Planned MVP/Release Count per Quarter
- Actual MVP/Release Count Implemented
- MVP/Release Count At Risk or Delayed

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### DAS010 — Dashboard Publishing

The tool shall provide a dynamic dashboard with filters including, but not limited to, Date, Segment and RAG Status.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### DAS011 — Dashboard Publishing

The tool shall automatically update the dashboard in real time based on changes in WSR inputs across all projects.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

### Administration

#### ADM004 — Admin Access

The tool shall allow an admin user to create a new project profile.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### ADM006 — Admin Access

The tool shall allow an admin user to create or update project templates including, but not limited to, workplan, WSR reporting and dashboards.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

#### ADM012 — Admin Access

The tool shall allow an admin user to create new reports or dashboards.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

### Reporting

#### REP001 — Data Export

The tool shall allow data export in standard formats including, but not limited to, Excel, PPT, CSV and PDF.

**Metadata:** Functional · POC: Y · TPMO · 1-Essential · P1

## Verification and release tracker

The cells are intentionally blank to match the supplied requirements sheet.

| Req. # | Verification Activity | Test Procedure Steps | Expected Results | Actual Results | Results Remarks (mandatory for Partially Met) | Status | Final Release Plan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WP001 |  |  |  |  |  |  |  |
| WP002 |  |  |  |  |  |  |  |
| WP003 |  |  |  |  |  |  |  |
| WP004 |  |  |  |  |  |  |  |
| WP006 |  |  |  |  |  |  |  |
| WP007 |  |  |  |  |  |  |  |
| WP008 |  |  |  |  |  |  |  |
| WP010 |  |  |  |  |  |  |  |
| WP015 |  |  |  |  |  |  |  |
| WP017 |  |  |  |  |  |  |  |
| WP018 |  |  |  |  |  |  |  |
| WP022 |  |  |  |  |  |  |  |
| WP023 |  |  |  |  |  |  |  |
| WP027 |  |  |  |  |  |  |  |
| WP035 |  |  |  |  |  |  |  |
| WP036 |  |  |  |  |  |  |  |
| PB003 |  |  |  |  |  |  |  |
| PB004 |  |  |  |  |  |  |  |
| PB010 |  |  |  |  |  |  |  |
| PB013 |  |  |  |  |  |  |  |
| PB014 |  |  |  |  |  |  |  |
| WSR001.2 |  |  |  |  |  |  |  |
| WSR002 |  |  |  |  |  |  |  |
| WSR004 |  |  |  |  |  |  |  |
| WSR010 |  |  |  |  |  |  |  |
| WSR016 |  |  |  |  |  |  |  |
| DAS002 |  |  |  |  |  |  |  |
| DAS003 |  |  |  |  |  |  |  |
| DAS004 |  |  |  |  |  |  |  |
| DAS008 |  |  |  |  |  |  |  |
| DAS010 |  |  |  |  |  |  |  |
| DAS011 |  |  |  |  |  |  |  |
| ADM004 |  |  |  |  |  |  |  |
| ADM006 |  |  |  |  |  |  |  |
| ADM012 |  |  |  |  |  |  |  |
| REP001 |  |  |  |  |  |  |  |

## Clarifications for validation

- **PB004:** The original aging thresholds overlap at 2 days (Amber starts at 2; Green includes 2). Confirm which status takes precedence at exactly 2 days.
- **WSR004:** The original wording gives ambiguous boundaries at 0.70 and 0.90. Confirm whether Amber should be strictly above 0.70 and strictly below 0.90, since Red includes 0.70 and Green includes 0.90.
- **WP023:** Confirm the definitions, units, and formulas for Planned Value and Earned Value.
- **WP027:** Define handling of `%Planned = 0` to avoid division by zero.
- **PB014:** The example implies Red takes precedence over Amber, but the complete status precedence should be confirmed.

*Note: Minor grammatical improvements and clearer Markdown structure have been applied without intentionally changing the functional scope.*
