// Project Discussions — pure mapping between the prototype's chat / notes / reads state and the three
// Kissflow forms (Discussion Message, Notification, Discussion Read). No API calls, so it runs under
// `node --test`. Prototype timestamps are Asia/Manila wall-clock "YYYY-MM-DD HH:MM:SS"; Kissflow is ISO UTC.

// Kissflow DateTime accepts only "YYYY-MM-DDTHH:MM:SSZ" — milliseconds or offsets are rejected (InvalidDateTimeString).
export const kfIso = (d) => new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
export const manilaToIso = (at) => kfIso(at.replace(" ", "T") + "+08:00");
export const isoToManila = (iso) => new Date(Date.parse(iso) + 8 * 3600e3).toISOString().slice(0, 19).replace("T", " ");
const byAt = (a, b) => a.at.localeCompare(b.at);

// Resolves Kissflow users ↔ the prototype's per-role user ids (`<kfUserId>:<ROLE>`).
export function makeCtx(S) {
  const byKf = {};
  for (const u of S.users) if (u._kfUser && !byKf[u._kfUser]) byKf[u._kfUser] = u.id;
  return {
    projects: S.projects,
    users: S.users,
    protoUserFor(kfUser) {
      if (!kfUser?._id) return "";
      if (!byKf[kfUser._id]) {
        const id = `${kfUser._id}:TEAM`;
        S.users.push({ id, uid: (kfUser.Email || kfUser.Name || kfUser._id).split("@")[0], name: kfUser.Name || kfUser._id, role: "TEAM", unit: "Team Member", status: "Active", last: "", _kfUser: kfUser._id });
        byKf[kfUser._id] = id;
      }
      return byKf[kfUser._id];
    },
    kfUserOf: (protoId) => S.users.find((u) => u.id === protoId)?._kfUser,
  };
}

function refFromKf(p, type, kfId) {
  if (!kfId) return "";
  if (type === "Activity") { const a = [...p.activities, ...(p.wbs || [])].find((x) => x._kfId === kfId); return a ? `act:${a.id}` : ""; }
  if (type === "Issue") { const i = p.issues.find((x) => x._kfId === kfId); return i ? `issue:${i.id}` : ""; }
  return "";
}
function refToKf(p, ref) {
  const [t, id] = (ref || "").split(":");
  if (t === "act") { const a = [...p.activities, ...(p.wbs || [])].find((x) => x.id === id); return a?._kfId ? { linked_item_type: "Activity", linked_item: a._kfId } : {}; }
  if (t === "issue") { const i = p.issues.find((x) => x.id === id); return i?._kfId ? { linked_item_type: "Issue", linked_item: i._kfId } : {}; }
  return {};
}

export function mentionedKfIds(text, ctx) {
  const tags = new Set([...String(text).matchAll(/@([a-z0-9._-]+)/gi)].map((x) => x[1].toLowerCase()));
  return [...new Set(ctx.users.filter((u) => u._kfUser && tags.has(String(u.uid).toLowerCase())).map((u) => u._kfUser))].sort();
}

export function messageFromKf(rec, ctx) {
  const p = ctx.projects.find((x) => x._kfId === rec.project?._id);
  if (!p || !rec.sent_at) return null;
  return { pid: p.id, msg: { id: rec._id, who: ctx.protoUserFor(rec.author), at: isoToManila(rec.sent_at), text: rec.message_text || "", ref: refFromKf(p, rec.linked_item_type, rec.linked_item), _kfId: rec._id } };
}

export function messageToKf(p, m, ctx) {
  const who = ctx.kfUserOf(m.who);
  return { project: { _id: p._kfId }, ...(who ? { author: { _id: who } } : {}), sent_at: manilaToIso(m.at), message_text: m.text,
    mentioned_users: mentionedKfIds(m.text, ctx).join(","), ...refToKf(p, m.ref) };
}

export function mergeMessages(chat, recs, ctx) {
  const have = new Set(Object.values(chat).flat().map((m) => m._kfId).filter(Boolean));
  let added = 0;
  for (const r of recs) {
    if (have.has(r._id)) continue;
    const x = messageFromKf(r, ctx);
    if (!x) continue;
    (chat[x.pid] = chat[x.pid] || []).push(x.msg);
    have.add(r._id); added++;
  }
  if (added) for (const k of Object.keys(chat)) chat[k].sort(byAt);
  return added;
}

export function buildChat(projects, recs, ctx) {
  const chat = Object.fromEntries(projects.map((p) => [p.id, []]));
  mergeMessages(chat, recs, ctx);
  return chat;
}

export function readCountsFromKf(chat, readRecs, ctx) {
  const out = {};
  for (const r of readRecs) {
    const p = ctx.projects.find((x) => x._kfId === r.project?._id);
    if (!p || !r.last_read_at) continue;
    const t = kfIso(r.last_read_at);
    out[p.id] = (chat[p.id] || []).filter((m) => manilaToIso(m.at) <= t).length;
  }
  return out;
}

export function readMarker(msgs, count) {
  const n = Math.min(count, msgs.length);
  return n > 0 ? manilaToIso(msgs[n - 1].at) : null;
}

export const isMention = (n) => Array.isArray(n?.go) && n.go[0] === "chat";

export function noteToKf(n, p, recipientKfId) {
  return { recipient: { _id: recipientKfId }, notification_type: "Mention", title: n.m, detail: n.s || "", link_target: JSON.stringify(n.go), is_read: false,
    ...(p?._kfId ? { project: { _id: p._kfId } } : {}) };
}

const parseGo = (s) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; } };

// One prototype note per role context I hold, so the bell shows it whichever role I'm viewing as.
export function notesFromKf(recs, myIds) {
  return recs.flatMap((r) => myIds.map((to) => ({ to, m: r.title || "", s: r.detail || "", go: parseGo(r.link_target),
    at: r._created_at ? isoToManila(r._created_at) : "", read: !!r.is_read, _kfId: r._id, _sentRead: !!r.is_read })));
}

export function mergeNotes(notes, recs, myIds) {
  const have = new Set(notes.map((n) => n._kfId).filter(Boolean));
  const fresh = notesFromKf(recs.filter((r) => !have.has(r._id)), myIds);
  notes.push(...fresh);
  return fresh.length;
}
