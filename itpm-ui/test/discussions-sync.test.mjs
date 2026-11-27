import { test } from "node:test";
import assert from "node:assert/strict";
import { createDiscussions, DM } from "../src/discussions-sync.js";

function stubApi(data = {}) {
  const calls = []; let n = 0;
  const api = async (method, path, body) => {
    calls.push({ method, path, body });
    if (data.fail) throw new Error("network down");
    if (method === "GET") { const k = Object.keys(data).find((m) => path.includes(`/${m}/list`)); return { Data: data[k] || [] }; }
    if (path.includes("/batch")) return [{ _id: `NEW${++n}` }];
    return {};
  };
  return { api, calls, writes: () => calls.filter((c) => c.method === "POST") };
}
function state() {
  return {
    users: [{ id: "UA:PM", uid: "joemarie", name: "Joemarie", role: "PM", _kfUser: "UA" }, { id: "UA:DH", uid: "joemarie", name: "Joemarie", role: "DH", _kfUser: "UA" },
      { id: "UB:TEAM", uid: "charumathi", name: "Charu", role: "TEAM", _kfUser: "UB" }],
    projects: [{ id: "P1", _kfId: "P1", code: "ITP-0001", activities: [], issues: [] }],
    __myUserIds: ["UA:PM", "UA:DH"], reads: { "UA:PM": { P1: 0 }, "UA:DH": { P1: 0 }, "UB:TEAM": { P1: 0 } }, chat: {}, notes: [],
  };
}
const msg = (id, at) => ({ _id: id, project: { _id: "P1" }, author: { _id: "UB" }, sent_at: at, message_text: id });
const opts = { acc: "ACC", q: "_application_id=APP", meId: "UA" };

test("load fills chat, my notifications and read counts for every role I hold", async () => {
  const { api } = stubApi({
    [DM.message]: [msg("M1", "2026-09-29T01:00:00Z"), msg("M2", "2026-09-29T02:00:00Z")],
    [DM.note]: [{ _id: "N1", recipient: { _id: "UA" }, title: "t", link_target: '["chat","P1"]' }, { _id: "N2", recipient: { _id: "UB" }, title: "not mine" }],
    [DM.read]: [{ _id: "R1", reader: { _id: "UA" }, project: { _id: "P1" }, last_read_at: "2026-09-29T01:00:00Z" }, { _id: "R2", reader: { _id: "UB" }, project: { _id: "P1" }, last_read_at: "2026-09-29T09:00:00Z" }],
  });
  const S = state(); const d = createDiscussions({ api, ...opts });
  await d.load(S);
  assert.deepEqual(S.chat.P1.map((m) => m.id), ["M1", "M2"]);
  assert.deepEqual(S.notes.map((n) => [n.to, n._kfId]), [["UA:PM", "N1"], ["UA:DH", "N1"]]);
  assert.equal(S.reads["UA:PM"].P1, 1);
  assert.equal(S.reads["UA:DH"].P1, 1);
});

test("sync creates an unsent message exactly once", async () => {
  const { api, writes } = stubApi();
  const S = state(); const d = createDiscussions({ api, ...opts }); await d.load(S);
  S.chat.P1.push({ id: "local", who: "UA:PM", at: "2026-09-29 09:00:00", text: "hello @charumathi", ref: "" });
  await d.sync(S); await d.sync(S);
  const creates = writes().filter((c) => c.path.includes(`/${DM.message}/batch`));
  assert.equal(creates.length, 1);
  assert.equal(creates[0].body[0].mentioned_users, "UB");
  assert.equal(S.chat.P1[0]._kfId, "NEW1");
});

test("sync sends a mention to another user once and never to myself", async () => {
  const { api, writes } = stubApi();
  const S = state(); const d = createDiscussions({ api, ...opts }); await d.load(S);
  S.notes.push({ to: "UB:TEAM", m: "Joemarie mentioned you in ITP-0001", s: "hi", go: ["chat", "P1"], at: "2026-09-29 09:00:00", read: false });
  S.notes.push({ to: "UA:DH", m: "self", s: "", go: ["chat", "P1"], at: "2026-09-29 09:00:00", read: false });
  S.notes.push({ to: "UB:TEAM", m: "assigned", s: "", go: ["mytasks"], at: "2026-09-29 09:00:00", read: false });
  await d.sync(S); await d.sync(S);
  const creates = writes().filter((c) => c.path.includes(`/${DM.note}/batch`));
  assert.equal(creates.length, 1);
  assert.deepEqual(creates[0].body[0].recipient, { _id: "UB" });
});

test("sync marks my notification read once, across role copies", async () => {
  const { api, writes } = stubApi({ [DM.note]: [{ _id: "N1", recipient: { _id: "UA" }, title: "t", link_target: '["chat","P1"]', is_read: false }] });
  const S = state(); const d = createDiscussions({ api, ...opts }); await d.load(S);
  S.notes.find((n) => n.to === "UA:PM").read = true;
  await d.sync(S); await d.sync(S);
  const updates = writes().filter((c) => c.path.includes(`/${DM.note}/N1`));
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].body, { is_read: true });
});

test("sync writes the read marker when the count rises, then updates the same row", async () => {
  const { api, writes } = stubApi({ [DM.message]: [msg("M1", "2026-09-29T01:00:00Z"), msg("M2", "2026-09-29T02:00:00Z")] });
  const S = state(); const d = createDiscussions({ api, ...opts }); await d.load(S);
  S.reads["UA:PM"].P1 = 1; await d.sync(S);
  await d.sync(S); // no change → no write
  S.reads["UA:DH"].P1 = 2; await d.sync(S);
  const w = writes().filter((c) => c.path.includes(DM.read));
  assert.equal(w.length, 2);
  assert.ok(w[0].path.includes("/batch"));
  assert.equal(w[0].body[0].last_read_at, "2026-09-29T01:00:00Z");
  assert.ok(w[1].path.includes(`/${DM.read}/NEW1`));
  assert.equal(w[1].body.last_read_at, "2026-09-29T02:00:00Z");
  assert.equal(S.reads["UA:PM"].P1, 2); // every role context shows the same unread count
});

test("poll adds new messages and my new notifications, then renders once", async () => {
  const data = { [DM.message]: [], [DM.note]: [] };
  const { api } = stubApi(data);
  const S = state(); const d = createDiscussions({ api, ...opts }); await d.load(S);
  data[DM.message] = [msg("M9", "2026-09-29T05:00:00Z")];
  data[DM.note] = [{ _id: "N9", recipient: { _id: "UA" }, title: "t", link_target: '["chat","P1"]' }];
  let renders = 0;
  assert.equal(await d.poll(S, { busy: () => false, render: () => renders++ }), 3);
  assert.equal(renders, 1);
  assert.equal(await d.poll(S, { busy: () => false, render: () => renders++ }), 0);
  assert.equal(renders, 1);
});

test("poll skips while a save is running", async () => {
  const { api, calls } = stubApi();
  const S = state(); const d = createDiscussions({ api, ...opts }); await d.load(S);
  const before = calls.length;
  assert.equal(await d.poll(S, { busy: () => true, render: () => {} }), 0);
  assert.equal(calls.length, before);
});

test("poll does nothing while the tab is hidden", async () => {
  const { api, calls } = stubApi();
  const S = state(); const d = createDiscussions({ api, ...opts }); await d.load(S);
  const before = calls.length;
  globalThis.document = { hidden: true };
  try { assert.equal(await d.poll(S, { busy: () => false, render: () => {} }), 0); } finally { delete globalThis.document; }
  assert.equal(calls.length, before);
});

test("poll swallows API errors", async () => {
  const data = {};
  const { api } = stubApi(data);
  const S = state(); const d = createDiscussions({ api, ...opts }); await d.load(S);
  data.fail = true;
  assert.equal(await d.poll(S, { busy: () => false, render: () => { throw new Error("should not render"); } }), 0);
});

test("sync never throws: a failed write is retried on the next sync", async () => {
  const data = {};
  const { api, writes } = stubApi(data);
  const errors = [];
  const S = state(); const d = createDiscussions({ api, ...opts, onError: (e) => errors.push(e.message) }); await d.load(S);
  S.chat.P1.push({ id: "local", who: "UA:PM", at: "2026-09-29 09:00:00", text: "hello", ref: "" });
  data.fail = true;
  assert.equal(await d.sync(S), 0);
  assert.equal(S.chat.P1[0]._kfId, undefined);
  assert.deepEqual(errors, ["network down"]);
  data.fail = false;
  assert.equal(await d.sync(S), 1);
  assert.equal(S.chat.P1[0]._kfId, "NEW1");
  assert.equal(writes().length, 2); // the failed attempt + the successful retry
});

test("load reads every page, not just the first 1000", async () => {
  const many = Array.from({ length: 1005 }, (_, i) => msg("M" + String(i).padStart(4, "0"), "2026-09-29T01:00:00Z"));
  const calls = [];
  const api = async (method, path) => {
    calls.push(path);
    if (!path.includes(DM.message)) return { Data: [] };
    const page = +path.match(/page_number=(\d+)/)[1];
    return { Data: many.slice((page - 1) * 1000, page * 1000) };
  };
  const S = state(); const d = createDiscussions({ api, ...opts }); await d.load(S);
  assert.equal(S.chat.P1.length, 1005);
  assert.equal(calls.filter((c) => c.includes(DM.message)).length, 2);
});

test("injected writers (the SDK path inside Kissflow) replace every REST POST", async () => {
  const { api, writes } = stubApi();
  const made = [], changed = [];
  const writer = { create: async (model, row) => { made.push({ model, row }); return `SDK${made.length}`; }, update: async (model, kfId, row) => { changed.push({ model, kfId, row }); } };
  const S = state(); const d = createDiscussions({ api, ...opts, ...writer }); await d.load(S);
  S.chat.P1.push({ id: "local", who: "UA:PM", at: "2026-09-29 09:00:00", text: "hello @charumathi", ref: "" });
  S.notes.push({ to: "UB:TEAM", m: "Joemarie mentioned you in ITP-0001", s: "hi", go: ["chat", "P1"], at: "2026-09-29 09:00:00", read: false });
  S.reads["UA:PM"].P1 = 1;
  await d.sync(S);
  assert.deepEqual(made.map((x) => x.model), [DM.message, DM.note, DM.read]);
  assert.equal(S.chat.P1[0]._kfId, "SDK1");
  assert.equal(writes().length, 0);
  S.chat.P1.push({ id: "local2", who: "UA:PM", at: "2026-09-29 09:05:00", text: "again", ref: "" });
  S.reads["UA:PM"].P1 = 2;
  await d.sync(S);
  assert.deepEqual(changed.map((x) => [x.model, x.kfId]), [[DM.read, "SDK3"]]);
  assert.equal(writes().length, 0);
});
