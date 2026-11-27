// Project Discussions — Kissflow load / save / poll for the three discussion forms.
// Mapping lives in discussions.js; this file only moves records. The bridge owns when it runs.
import { makeCtx, buildChat, mergeMessages, messageToKf, readCountsFromKf, readMarker, isMention, noteToKf, notesFromKf, mergeNotes } from "./discussions.js";

export const DM = { message: "ITPMD_Discussion_Message_A00", note: "ITPMD_Notification_A00", read: "ITPMD_Discussion_Read_A00" };

const PAGE = 1000;

// create/update default to REST; inside Kissflow the bridge passes its SDK writers instead, because
// kf.api's POST bodies do not reach Kissflow there (batch create → 500, update → 403).
export function createDiscussions({ api, acc, q, meId, onError = () => {}, create: sdkCreate, update: sdkUpdate }) {
  // every page — these forms only grow, and page 1 alone would silently cut history or new messages off
  const list = async (model) => {
    const all = [];
    for (let page = 1; ; page++) {
      const rows = (await api("GET", `/form/2/${acc}/${model}/list?page_number=${page}&page_size=${PAGE}&${q}`))?.Data || [];
      all.push(...rows);
      if (rows.length < PAGE) return all;
    }
  };
  const create = sdkCreate || (async (model, row) => (await api("POST", `/form/2/${acc}/${model}/batch?${q}`, [{ _is_created: true, ...row }]))?.[0]?._id);
  const update = sdkUpdate || ((model, kfId, row) => api("POST", `/form/2/${acc}/${model}/${kfId}?${q}`, row));
  const mine = (recs, field) => recs.filter((r) => r[field]?._id === meId);
  const readRow = {}; // pid → { _kfId, count } — the marker last written for me

  async function load(S) {
    const ctx = makeCtx(S);
    const [msgs, notes, reads] = await Promise.all([list(DM.message), list(DM.note), list(DM.read)]);
    S.chat = buildChat(S.projects, msgs, ctx);
    S.notes = notesFromKf(mine(notes, "recipient"), S.__myUserIds);
    const myReads = mine(reads, "reader");
    const counts = readCountsFromKf(S.chat, myReads, ctx);
    for (const r of myReads) { const p = S.projects.find((x) => x._kfId === r.project?._id); if (p) readRow[p.id] = { _kfId: r._id, count: counts[p.id] || 0 }; }
    for (const id of S.__myUserIds) { S.reads[id] = S.reads[id] || {}; for (const p of S.projects) S.reads[id][p.id] = counts[p.id] || 0; }
  }

  // Never throws: a failed write leaves the item unsaved (no _kfId / marker unchanged) so the next sync
  // retries it, and the first error of the pass goes to onError. Other hub saves are not held up.
  async function sync(S) {
    const done = { writes: 0 };
    try { await syncPass(S, done); } catch (e) { onError(e); }
    return done.writes;
  }
  async function syncPass(S, done) {
    const ctx = makeCtx(S); const me = new Set(S.__myUserIds);
    for (const p of S.projects) for (const m of S.chat[p.id] || []) {
      if (m._kfId) continue;
      m._kfId = await create(DM.message, messageToKf(p, m, ctx)); done.writes++;
    }
    for (const n of S.notes || []) {
      if (!isMention(n)) continue;
      if (!n._kfId) {
        if (me.has(n.to)) continue; // a mention of myself (another of my role contexts) stays local
        const to = ctx.kfUserOf(n.to); if (!to) continue;
        n._kfId = await create(DM.note, noteToKf(n, S.projects.find((p) => p.id === n.go[1]), to)); n._sentRead = false; done.writes++;
      } else if (me.has(n.to) && n.read && !n._sentRead) {
        await update(DM.note, n._kfId, { is_read: true }); done.writes++;
        for (const x of S.notes) if (x._kfId === n._kfId) { x._sentRead = true; x.read = true; }
      }
    }
    for (const p of S.projects) {
      const count = Math.max(0, ...S.__myUserIds.map((id) => S.reads[id]?.[p.id] || 0));
      const w = readRow[p.id] || (readRow[p.id] = { count: 0 });
      if (count <= w.count) continue;
      const iso = readMarker(S.chat[p.id] || [], count); if (!iso) continue;
      const row = { reader: { _id: meId }, project: { _id: p._kfId }, last_read_at: iso };
      if (w._kfId) await update(DM.read, w._kfId, row); else w._kfId = await create(DM.read, row);
      w.count = count; done.writes++;
      for (const id of S.__myUserIds) S.reads[id][p.id] = count;
    }
  }

  async function poll(S, { busy, render }) {
    if (globalThis.document?.hidden || busy()) return 0;
    try {
      const [msgs, notes] = await Promise.all([list(DM.message), list(DM.note)]);
      if (busy()) return 0; // a save started mid-read: its message may not have its id yet — try next tick
      const added = mergeMessages(S.chat, msgs, makeCtx(S)) + mergeNotes(S.notes, mine(notes, "recipient"), S.__myUserIds);
      if (added) render();
      return added;
    } catch (e) {
      console.warn("[itph] discussion poll failed — retrying next tick", e?.message || e);
      return 0;
    }
  }

  const startPolling = (S, opts, ms = 20000) => setInterval(() => poll(S, opts), ms);
  return { load, sync, poll, startPolling };
}
