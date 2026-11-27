# Kissflow app context (auto-generated)

App `ITPMD_Project_Hub_A00` · generated 2026-10-28T12:06:37.355Z · run `npm run kf:sync` to refresh.

> Source of truth for the **data models**, **roles**, **pages**, and **per-role access** in this app. Build pages against these. Do not edit by hand — re-run `kf-sync` instead.

## Pages

| Page | Id | Input parameters |
| --- | --- | --- |
| Home Page | `Home_Page_A07` | — |
| itpmd issue Board | `itpmd_issue_Board` | — |
| itpmd action item Board | `itpmd_action_item_Board` | — |

## Data models

### ITPMD Binder Item — `ITPMD_Binder_Item_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Project | `project` | Reference | yes |
| Item_Type | `item_type` | Select | yes |
| Linked_Id | `linked_id` | Text | no |
| Item_No | `item_no` | Text | no |
| Event_Description | `description` | Textarea | no |
| Event_Category | `event_category` | Select | no |
| Additional_Info | `additional_info` | Textarea | no |
| Priority_Level | `priority` | Select | no |
| Milestone_Identified | `milestone` | Text | no |
| Raised_By | `raised_by` | User | no |
| Date_Assigned | `date_assigned` | Date | no |
| Initial_Notification_Source | `notification_source` | Text | no |
| Planned_Actions | `planned_actions` | Textarea | no |
| Assigned_To | `assigned_to` | User | no |
| Org_Unit | `org_unit` | Text | no |
| Target_Date | `target_date` | Date | no |
| Date_Executed | `date_executed` | Date | no |
| Action_Item | `action_item` | Text | no |
| Action_Item_Status | `action_item_status` | Select | no |
| Results_Of_Action_Item | `action_result` | Textarea | no |
| Overall_Status | `overall_status` | Select | no |
| Last_Status_Update | `last_status_update` | Date | no |
| CR_Kind | `cr_kind` | Select | no |
| CR_Status | `cr_status` | Select | no |
| CR_Approval_Date | `cr_approval_date` | Date | no |

Roles with access: Project Manager (Delete), Project Sponsor (Delete), PSC Member (Delete), Hub Administrator (Delete).

### ITPMD Program — `ITPMD_Program_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Program_Name | `program_name` | Text | yes |
| Segment | `segment` | Text | no |
| Description | `description` | Textarea | no |
| Program_Manager | `program_manager` | User | no |

Roles with access: Project Manager (Delete), Team Member (Delete), Department Head (Delete), Project Sponsor (Delete), PSC Member (Delete), Hub Administrator (Delete), TPMO (Delete).

### ITPMD Baseline — `ITPMD_Baseline_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Project | `project` | Reference | yes |
| Version | `version` | Number | yes |
| Set_Date | `set_date` | Date | yes |
| Set_By | `set_by` | User | no |
| Note | `note` | Text | no |
| Rows_Json | `rows_json` | Textarea | no |

Roles with access: Project Manager (Delete), Team Member (Delete), Department Head (Delete), Project Sponsor (Delete), PSC Member (Delete), Hub Administrator (Delete), TPMO (Delete).

### ITPMD Discussion Read — `ITPMD_Discussion_Read_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Reader | `reader` | User | yes |
| Project | `project` | Reference | yes |
| Last_Read_At | `last_read_at` | DateTime | yes |

Roles with access: Project Manager (Delete), Team Member (Delete), Department Head (Delete), Project Sponsor (Delete), PSC Member (Delete), Hub Administrator (Delete), TPMO (Delete).

### ITPMD Notification — `ITPMD_Notification_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Recipient | `recipient` | User | yes |
| Notification_Type | `notification_type` | Select | yes |
| Title | `title` | Text | yes |
| Detail | `detail` | Textarea | no |
| Link_Target | `link_target` | Text | no |
| Project | `project` | Reference | no |
| Is_Read | `is_read` | Boolean | no |

Roles with access: Project Manager (Delete), Team Member (Delete), Department Head (Delete), Project Sponsor (Delete), PSC Member (Delete), Hub Administrator (Delete), TPMO (Delete).

### ITPMD Discussion Message — `ITPMD_Discussion_Message_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Project | `project` | Reference | yes |
| Author | `author` | User | yes |
| Sent_At | `sent_at` | DateTime | yes |
| Message_Text | `message_text` | Textarea | yes |
| Linked_Item_Type | `linked_item_type` | Select | no |
| Linked_Item | `linked_item` | Text | no |
| Mentioned_Users | `mentioned_users` | Text | no |

Roles with access: Project Manager (Delete), Team Member (Delete), PSC Member (Delete), Hub Administrator (Delete), Department Head (Delete), Project Sponsor (Delete), TPMO (Delete).

### ITPMD Portfolio Status Report — `ITPMD_Portfolio_Status_Report_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Report_Period | `report_period` | Date | yes |
| Portfolio_Narrative | `portfolio_narrative` | Textarea | no |
| Total_Projects_Reported | `total_projects_reported` | Number | no |

Roles with access: PSC Member (Delete), Department Head, TPMO (Delete), Project Sponsor.

### ITPMD Project Status Report — `ITPMD_Project_Status_Report_A00` (Process)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Reporting_Period_Month | `reporting_period_month` | Date | yes |
| Project | `project` | Reference | yes |
| Project_Manager | `RoERtv3vbU79` | User | no |
| Department_Head | `RoERtv4trgpx` | User | no |
| Project_Sponsor | `RoERtv5LLAbI` | User | no |
| PS_Approval_Required | `ps_approval_required` | Boolean | no |
| Overall_Health | `overall_health` | Text | no |
| Schedule_Health | `schedule_health` | Text | no |
| Cost_Health | `cost_health` | Text | no |
| Risk_Health | `risk_health` | Text | no |
| Issue_Health | `issue_health` | Text | no |
| Weighted_Percent_Complete | `weighted_percent_complete` | Number | no |
| Current_Approved_Budget | `current_approved_budget` | Currency | no |
| Total_Actual_Cost | `total_actual_cost` | Currency | no |
| Total_Committed_Cost | `total_committed_cost` | Currency | no |
| Total_Forecast_Cost | `total_forecast_cost` | Currency | no |
| Contingency_Remaining | `contingency_remaining` | Currency | no |
| Baseline_Or_Budget_Change_Requested | `baseline_or_budget_change_requested` | Boolean | no |
| Sponsor_Approval_Required | `sponsor_approval_required` | Select | no |
| Narrative_Update | `narrative_update` | Textarea | no |
| Supporting_Documents | `supporting_documents` | Attachment | no |

Roles with access: Project Manager (InitiateItems), Department Head (InitiateItems), Team Member (View), PSC Member (InitiateItems), Project Sponsor (InitiateItems), TPMO (InitiateItems).

System fields (always present on a process item): `_status`, `_current_step`, `_current_assigned_to`, `_submitted_at`, `_request_number`, `_progress`, `_counter`.

### ITPMD Action Item — `ITPMD_Action_Item_A00` (Case)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Action_Description | `action_description` | Text | yes |
| Project | `project` | Reference | yes |
| Related_Issue | `related_issue` | Reference | no |
| Assignee | `assignee` | User | yes |
| Due_Date | `due_date` | Date | no |
| Overdue_Flag | `overdue_flag` | Number | no |

Roles with access: Project Manager, Team Member, Department Head, PSC Member, TPMO.

### ITPMD Cost Entry — `ITPMD_Cost_Entry_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Cost_Entry_Title | `cost_entry_title` | Text | yes |
| Project | `project` | Reference | yes |
| Entry_Date | `entry_date` | Date | yes |
| Cost_Description | `cost_description` | Textarea | no |
| Actual_Amount | `actual_amount` | Currency | no |
| Committed_Amount | `committed_amount` | Currency | no |
| Forecast_Amount | `forecast_amount` | Currency | no |

Roles with access: Department Head, Project Sponsor, PSC Member, Project Manager (Delete), TPMO (Delete).

### ITPMD Issue — `ITPMD_Issue_A00` (Case)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Issue_Title | `issue_title` | Text | yes |
| Project | `project` | Reference | yes |
| Issue_Category | `issue_category` | Select | yes |
| Priority | `priority` | Select | yes |
| Issue_Owner | `issue_owner` | User | yes |
| Target_Resolution_Date | `target_resolution_date` | Date | no |
| Description | `description` | Textarea | no |
| Hub_Settings | `hub_settings` | Reference | no |
| Issue_Aging_Period_Days | `issue_aging_period_days` | Number | no |
| Days_Open | `days_open` | Number | no |
| Critical_Flag | `critical_flag` | Number | no |
| Escalation_Flag | `escalation_flag` | Number | no |

Roles with access: Team Member, Project Manager, Department Head, PSC Member, TPMO, Project Sponsor.

### ITPMD Holiday Calendar — `ITPMD_Holiday_Calendar_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Holiday_Name | `holiday_name` | Text | yes |
| Holiday_Date | `holiday_date` | Date | yes |
| Coverage | `coverage` | Select | no |
| Is_Recurring_Annually | `is_recurring_annually` | Boolean | no |

Roles with access: Hub Administrator (Delete), TPMO (Delete).

### ITPMD Risk — `ITPMD_Risk_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Risk_Title | `risk_title` | Text | yes |
| Project | `project` | Reference | yes |
| Risk_Category | `risk_category` | Select | yes |
| Probability | `probability` | Number | yes |
| Impact | `impact` | Number | yes |
| Risk_Rating | `risk_rating` | Number | no |
| Risk_Band_Code | `risk_band_code` | Number | no |
| Risk_Rating_Band | `risk_rating_band` | Text | no |
| Risk_Owner | `risk_owner` | User | yes |
| Mitigation_Actions | `mitigation_actions` | Textarea | no |
| Response_Strategy | `response_strategy` | Select | no |
| Residual_Probability | `residual_probability` | Number | no |
| Residual_Impact | `residual_impact` | Number | no |
| Residual_Risk_Rating | `residual_risk_rating` | Number | no |
| Residual_Band_Code | `residual_band_code` | Number | no |
| Residual_Risk_Rating_Band | `residual_risk_rating_band` | Text | no |
| Status | `status` | Select | yes |
| Escalation_Flag | `escalation_flag` | Number | no |
| Critical_Flag | `critical_flag` | Number | no |

Roles with access: Project Manager (Delete), Department Head, Project Sponsor, TPMO (Delete), PSC Member.

### ITPMD Activity — `ITPMD_Activity_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Activity_Name | `activity_name` | Text | yes |
| Project | `project` | Reference | yes |
| WBS_Code | `wbs_code` | Text | yes |
| Is_Summary | `is_summary` | Boolean | no |
| Is_Milestone | `is_milestone` | Boolean | no |
| Responsible_Person | `responsible_person` | User | no |
| Assigned_By | `assigned_by` | User | no |
| Assigned_At | `assigned_at` | DateTime | no |
| Planned_Start | `planned_start` | Date | yes |
| Planned_Finish | `planned_finish` | Date | yes |
| Planned_Duration_Days | `planned_duration_days` | Number | no |
| Baseline_Start | `baseline_start` | Date | no |
| Baseline_Finish | `baseline_finish` | Date | no |
| Forecast_Start | `forecast_start` | Date | no |
| Forecast_Finish | `forecast_finish` | Date | no |
| Actual_Start | `actual_start` | Date | no |
| Actual_Finish | `actual_finish` | Date | no |
| Percent_Complete | `percent_complete` | Number | no |
| Weighted_Complete_Value | `weighted_complete_value` | Number | no |
| Missed_Milestone_Flag | `missed_milestone_flag` | Number | no |
| Schedule_Variance_Days | `schedule_variance_days` | Number | no |
| Status_Code | `status_code` | Number | no |
| Status | `status` | Text | no |
| Predecessor_Codes | `predecessor_codes` | Text | no |
| Item_Type | `item_type` | Select | no |
| Parent_Code | `parent_code` | Text | no |
| Deliverable_Accepted | `deliverable_accepted` | Boolean | no |
| Accepted_Date | `accepted_date` | Date | no |
| Sort_Order | `sort_order` | Number | no |
| Planned_Cost | `planned_cost` | Currency | no |
| Actual_Cost | `actual_cost` | Currency | no |

Roles with access: Project Manager (Delete), Project Sponsor, TPMO (Delete), Team Member (Delete), PSC Member.

### ITPMD Project — `ITPMD_Project_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Project_Name | `project_name` | Text | yes |
| Business_Unit | `business_unit` | Select | yes |
| Portfolio | `portfolio` | Select | yes |
| Project_Manager | `RoERtv3vbU79` | User | yes |
| Department_Head | `RoERtv4trgpx` | User | yes |
| Project_Sponsor | `RoERtv5LLAbI` | User | no |
| PS_Approval_Required | `ps_approval_required` | Boolean | no |
| Status | `status` | Select | yes |
| Approved_Budget | `approved_budget` | Currency | yes |
| Contingency_Fund | `contingency_fund` | Currency | yes |
| Project_Start_Date | `project_start_date` | Date | no |
| Project_Planned_End_Date | `project_planned_end_date` | Date | no |
| Project_Code | `project_code` | SequenceNumber | no |
| Contract_Value | `contract_value` | Currency | no |
| Total_Budget_Changes | `total_budget_changes` | Currency | no |
| Total_Contingency_Draws | `total_contingency_draws` | Currency | no |
| Sum_Weighted_Complete | `sum_weighted_complete` | Number | no |
| Sum_Planned_Duration | `sum_planned_duration` | Number | no |
| Max_Forecast_Finish | `max_forecast_finish` | Date | no |
| Max_Baseline_Finish | `max_baseline_finish` | Date | no |
| Missed_Milestone_Count | `missed_milestone_count` | Number | no |
| Total_Actual_Cost | `total_actual_cost` | Currency | no |
| Total_Committed_Cost | `total_committed_cost` | Currency | no |
| Total_Forecast_Cost | `total_forecast_cost` | Currency | no |
| Escalated_Risk_Count | `escalated_risk_count` | Number | no |
| Critical_Risk_Count | `critical_risk_count` | Number | no |
| Escalated_Issue_Count | `escalated_issue_count` | Number | no |
| Critical_Issue_Count | `critical_issue_count` | Number | no |
| Overdue_Action_Count | `overdue_action_count` | Number | no |
| Weighted_Percent_Complete | `weighted_percent_complete` | Number | no |
| Schedule_Variance_Days | `schedule_variance_days` | Number | no |
| Current_Approved_Budget | `current_approved_budget` | Currency | no |
| Contingency_Remaining | `contingency_remaining` | Currency | no |
| Contingency_Utilization_Percent | `contingency_utilization_percent` | Number | no |
| Cost_Performance_Percent | `cost_performance_percent` | Number | no |
| Schedule_Health_Code | `schedule_health_code` | Number | no |
| Schedule_Health | `schedule_health` | Text | no |
| Cost_Health_Code | `cost_health_code` | Number | no |
| Cost_Health | `cost_health` | Text | no |
| Risk_Health_Code | `risk_health_code` | Number | no |
| Risk_Health | `risk_health` | Text | no |
| Issue_Health_Code | `issue_health_code` | Number | no |
| Issue_Health | `issue_health` | Text | no |
| Overall_Health_Code | `overall_health_code` | Number | no |
| Overall_Health | `overall_health` | Text | no |
| Needs_Management_Attention_Flag | `needs_management_attention_flag` | Number | no |
| Vendor | `vendor` | Text | no |
| NOA_Issued | `noa_issued` | Date | no |
| PO_No | `po_no` | Text | no |
| PO_Issued | `po_issued` | Date | no |
| NTP_Issued | `ntp_issued` | Date | no |
| Contract_Expiry | `contract_expiry` | Date | no |
| Approved_Changes_Total | `approved_changes_total` | Currency | no |
| Contingency_Drawn | `contingency_drawn` | Currency | no |
| Contract_Total | `contract_total` | Currency | no |
| Program | `program` | Reference | no |
| Active_Baseline | `active_baseline` | Number | no |

Roles with access: Project Manager (Delete), Project Sponsor, Department Head, TPMO (Delete).

### ITPMD Hub Settings — `ITPMD_Hub_Settings_A00` (Form)

| Field | Id | Type | Required |
| --- | --- | --- | --- |
| Setting_Name | `setting_name` | Text | yes |
| PSR_Due_Working_Day | `psr_due_working_day` | Number | yes |
| PSR_Reminder_Days_Before | `psr_reminder_days_before` | Number | no |
| PSR_Reminder_Final_Day_Before | `psr_reminder_final_day_before` | Number | no |
| Issue_Aging_Period_Days | `issue_aging_period_days` | Number | yes |
| Escalation_Recipients | `escalation_recipients` | User | no |

Roles with access: Hub Administrator (Delete), TPMO (Delete).

## Roles

| Role | Id | Description | Users |
| --- | --- | --- | --- |
| Admin | `RoERtv2nw9K7` | Administrator role with full privileges for this application. | 1 |
| Department Head | `RoERtv4trgpx` |  | 1 |
| Hub Administrator | `RoERtv6QxCr3` |  | 1 |
| PSC Member | `RoERtv5mi3Vj` |  | 1 |
| Project Manager | `RoERtv3vbU79` |  | 1 |
| Project Sponsor | `RoERtv5LLAbI` |  | 1 |
| TPMO | `RoERxcFh7cFv` |  | 1 |
| Team Member | `RoERtv4PD2Y9` |  | 1 |
| User | `RoERtv31xXL3` | An end-user role with limited privileges. | 0 |
