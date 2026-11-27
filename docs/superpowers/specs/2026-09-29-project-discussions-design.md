# Project Discussions — design

Date: 2026-09-29 · App: `ITPMD_Project_Hub_A00` (development-landbank-ai) · BRD §8.17 (ITPH-00270 – 00276)

## Goal

Make the prototype's existing Discussions feature real: messages, @mentions and unread counts are
stored in Kissflow and shared between users, with the prototype UI unchanged.

Today the UI is complete (channel per project in the sidebar and the project Discussion tab, @mentions,
activity/issue links, unread badges, Enter to send), but `src/bridge.js` loads `chat: {}` / `reads: {}`
and never writes them, and `S.notes` (notifications) are not persisted either. Messages vanish on reload.

This reverses part of decision D1 (Project Discussions was deferred to Phase 2); the user chose to
start it on 2026-09-29.

## Scope (first version)

In:
- ITPH-00270 post messages in a channel per accessible project
- ITPH-00271 @mention a colleague, who receives a notification
- ITPH-00272 link a message to an activity or issue and open it from the message
- ITPH-00273 start a discussion from an activity row (existing prototype behaviour, now persisted)
- ITPH-00274 unread count per project channel, per user, across devices
- ITPH-00275 new messages appear without a page refresh — by polling every 20 s, not WebSocket

Out (later):
- ITPH-00276 retention policy — blocked on BRD open question 27 (retention, edit/delete, moderation)
- Editing or deleting messages (messages are append-only for now)
- WebSocket delivery
- Persisting assignment/approval/alert notifications (the Notification form is designed to hold them)

## Data model — three new Kissflow forms

### Discussion Message
| Field | Type | Notes |
|---|---|---|
| Project | Reference → Project | required |
| Author | User | required |
| Sent at | Date-time | required |
| Text | Long text | required |
| Linked item type | Select: Activity, Issue | optional |
| Linked item | Text | the Activity or Issue Kissflow record id |
| Mentions | User (multiple) | from the `@uid` tokens in the text |

The linked item is plain text, not a Reference, because one field must point at either an Activity or
an Issue. It maps to the prototype's `ref` string (`act:<id>` / `issue:<id>`).

### Notification
| Field | Type | Notes |
|---|---|---|
| Recipient | User | required |
| Type | Select: Mention (later: Assignment, Approval, Alert) | required |
| Title | Text | prototype `m` |
| Detail | Text | prototype `s` |
| Link target | Text | prototype `go`, serialised, e.g. `chat:<projectId>` |
| Project | Reference → Project | optional |
| Read | Yes/No | |

### Discussion Read
| Field | Type | Notes |
|---|---|---|
| User | User | required |
| Project | Reference → Project | required |
| Last read at | Date-time | one row per user × project |

Unread count = messages in the project with `Sent at` later than the user's `Last read at`.

### Access
All hub roles get create and view on the three forms. Channel visibility is enforced in the UI: a user
sees a project's channel only if that project is in their `myProjects()` list — the same approach as the
Department Head project filter. Known limitation: Kissflow cannot restrict these records by project
membership, so a user calling the API directly could read any channel.

## Bridge (`itpm-ui/src/bridge.js`)

### Load (startup)
- Read the three forms with the existing `list()` helper.
- Build `S.chat[projectId]` (oldest first) in the prototype shape `{ id, who, at, text, ref, _kfId }`.
- Build `S.notes` from the signed-in user's Notification records (`{ to, m, s, go, at, read, _kfId }`).
- Build `S.reads[me][projectId]` as the count of that project's messages with `Sent at` ≤ `Last read at`,
  so the prototype's `unreadFor()` works unchanged.
- The loader's status line mentions discussions.

### Save (inside the existing debounced `sync()`)
- Message without `_kfId` → create a Discussion Message; store the returned id. Mentions are the users
  whose `uid` matches an `@token` in the text.
- Notification without `_kfId` whose recipient is not the signed-in user → create a Notification.
  Notifications the panel marks read → update `Read`.
- Opening a channel (the prototype raises `S.reads[me][pid]`) → upsert that user's Discussion Read row with
  `Last read at` = now. At most one write per project per 10 s.
- On failure: existing error toast; the item keeps no `_kfId`, so the next sync retries it.

### Poll (ITPH-00275)
- Every 20 s, while `document.hidden` is false: re-read Discussion Message and the user's Notification
  records, and merge records whose `_kfId` is not already in `S`, keeping unsent local items.
- If anything was added, re-render — unless the message box has focus (the draft is kept in `ui.draft`
  either way).
- Needs `window.__ITPH.render = render` exposed by `scripts/make-index.mjs`. The prototype HTML itself is
  not edited.

## Build and deploy
- Add the three forms through the app-spec pipeline (`/add-flow`), with role grants for all hub roles.
- No full re-apply (it orphans dashboard pages); if a re-apply is needed use `cli.mjs apply --no-pages
  --force`, then re-send the role grants sequentially.
- `node scripts/make-index.mjs`, `npm run zip`, then `node engine/cli.mjs deploy-ui itpm-ui/itpm-ui.zip
  --app ITPMD_Project_Hub_A00`.

## Testing
- Local: the dev preview (Playwright on http://localhost:3003) against live dev data — post, link, mention,
  reload, and confirm everything persists.
- In Kissflow, two real users (Joemarie and Charu, both in all roles):
  1. Both post in the same channel; each sees the other's message within 20 s without refreshing.
  2. An @mention creates a notification for the other user; opening it jumps to the channel.
  3. Unread counts clear after opening a channel and stay cleared on another device.
  4. A message linked to an activity opens that activity.
