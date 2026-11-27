# AVA — Kissflow Custom Agent setup

AVA is the BPI Project Hub assistant for project health, missing-data checks, management briefings and PSR narrative drafts. The app integration uses the public Kissflow Custom Agent SDK: https://developers.kissflow.com/app/agent/.

## Published definition

Create the Custom Agent in the same Kissflow app as the Project Hub, name it **AVA**, and use the instructions in [ava-agent-instructions.txt](ava-agent-instructions.txt). Publish the definition with **MaxOutputItems = 1**.

Inputs (use these exact keys):

| Key | Name | Data type | Required |
| --- | --- | --- | --- |
| request | User request | Text | Yes |
| context | Project context JSON | Text | Yes |

Outputs (use these exact keys):

| Key | Data type | Purpose |
| --- | --- | --- |
| answer | string | Grounded response to the user |
| accomplishments | string | PSR accomplishments; empty for other requests |
| next_period | string | PSR next-period plan; empty for other requests |
| issues | string | PSR issues and management attention; empty for other requests |
| propose_psr | boolean | True only for a permitted, explicit PSR drafting request |

Do not give this first version write tools. The app supplies data the user can already see. AVA returns a recommendation or draft; app-side permissions and the existing Apply control govern narrative changes.

## Connect the app

Install dependencies using `npm ci` in `itpm-ui/`. The Custom Agent API requires a compatible SDK; this change pins `@kissflow/lowcode-client-sdk` to 1.0.52.

For a deployment, set `VITE_AVA_AGENT_ID=Ag...` in `itpm-ui/.env.local`, rebuild with `npm run build`, and follow the existing Custom UI deployment process. The ID is public configuration, not an access key. Do not put credentials in Vite variables.

Alternatively, a Hub Administrator can open **Configuration → AVA assistant**, enter the published Agent ID and select **Save and check connection**. The connection is saved only after the published contract validates. This is a browser-local override, isolated by account and app; it does not configure other users' browsers. Use the build variable for shared deployment.

The inherited Advanced-role and suggestion switches operate on the current loaded session; persistent agent execution permissions must be set in Kissflow. These controls do not replace platform authorization.

Custom Agent runs must be checked inside the Kissflow app as the signed-in user. Standalone development preview has no Custom Agent host. Without a configured agent, AVA explicitly labels deterministic project checks and template drafts as built-in checks, not AI responses. A configured agent failure is shown; the app does not silently substitute a built-in response.

## Execution and approval behavior

The app checks the published inputs, outputs and readiness; calls execute once; retains ExecutionId; then reads or observes the run. Completed output is validated before display. Failed runs show the platform error. Unknown/new statuses remain pending. If observation stops, **Check this execution** reads the same run without creating another. **Stop** stops waiting, not the Kissflow run. An unknown execute outcome is never automatically retried.

PSR proposals are offered only for explicit drafting requests in Advanced mode, with project-manager access and suggestions enabled. Apply rechecks project access, permissions, report status, reporting period and the source fingerprint. Source records and existing PSR narratives must not have changed. Applying does not submit or approve a PSR.

Source buttons open the relevant project register. Health and checks use the app's current data; AVA cannot infer an update timestamp that the source does not provide. The built-in review reports unknown freshness separately.

## Acceptance checks

1. Publish the contract, connect AVA and confirm the panel shows **Kissflow Custom Agent**.
2. Ask **Review this project before status reporting**; verify the answer against source records and open a source button.
3. Ask **Find missing updates in this project**; verify missing owners, overdue dates and mitigation gaps. Missing timestamps must not be called known stale updates.
4. Ask **Draft this month’s PSR narrative** as the project PM. Verify a preview is shown and no narrative changes before Apply. Apply, then inspect the Draft/Returned PSR. Confirm it was not submitted.
5. Try the same request as a viewer and verify no Apply proposal. Disable suggestions and verify pending proposals cannot apply.
6. Change source data or the draft narrative after a proposal, then Apply; it must ask for a new review.
7. Exercise Completed, Failed, observation-stopped and unknown-outcome cases. Status checks must not execute another run.
8. Verify a user cannot see another project's records through a code in the question.

## Current verification boundary

Automated tests exercise the review rules, reporting dates, public SDK lifecycle and approval guards. Browser fixture tests use sample records and a simulated Custom Agent contract; they do not prove a real published agent runs in Kissflow. Live acceptance requires the actual published Agent ID and access to the app builder/runtime. No agent has been created or published by the local code changes.

## Local verification evidence

- `npm test`: 146 passed, zero failures.
- `npm run build`: passed, including the theme check.
- Isolated sample-data browser: connected response, evidence cards, PSR preview and explicit Apply, unconnected checks; no browser console errors.
- Screenshots: [desktop](../output/playwright/ava-desktop.png), [mobile](../output/playwright/ava-mobile.png).

## Embedded PSR readiness review

The Status reports list and current Draft/Returned report detail now include **AVA reporting readiness** for the owning PM in Advanced mode. Select **Review with AVA** to run the configured agent without opening the chat panel. Results include all deterministic findings and links to the source registers. Missing update timestamps are explicitly unverified.

After review, **Draft with AVA** uses the existing proposal preview and Apply flow. Review itself never creates or updates a report. Apply fills only a draft; Submit to DH remains a separate PM action. Submitted/approved and historical report detail pages do not offer readiness execution. Source data, narrative, scope or period changes invalidate previous review results. Clearing the conversation resets the transient inline review.

Without an Agent ID, the card explicitly labels built-in checks as not an AI response. Configured execution errors are displayed rather than replaced with built-in results. Known executions can be checked without executing another run.

Verification: 168 tests passed; production build and theme check passed. Browser fixtures verified simulated-agent inline results, source navigation, draft proposal and explicit Apply, unsubmitted Draft status, readiness on Draft detail, and built-in labeling without a connected agent. Mobile layout checked at 390px with no page overflow. Screenshots: `output/playwright/psr-readiness-desktop.png` and `output/playwright/psr-readiness-mobile.png`.

Live boundary: no published Agent ID is configured in this checkout. The browser fixtures are local sample data, not live Kissflow acceptance. No hosted UI or process definition was published by this change.
