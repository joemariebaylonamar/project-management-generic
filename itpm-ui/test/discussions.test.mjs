import { test } from "node:test";
import assert from "node:assert/strict";
import { manilaToIso, isoToManila, makeCtx, messageFromKf, messageToKf, mentionedKfIds, buildChat, mergeMessages,
  readCountsFromKf, readMarker, isMention, noteToKf, notesFromKf, mergeNotes } from "../src/discussions.js";

function fixture() {
  const S = {
    users: [
      { id: "UA:PM", uid: "joemarie", name: "Joemarie", role: "PM", _kfUser: "UA" },
      { id: "UA:DH", uid: "joemarie", name: "Joemarie", role: "DH", _kfUser: "UA" },
      { id: "UB:TEAM", uid: "charumathi", name: "Charu", role: "TEAM", _kfUser: "UB" },
      { id: "U05", uid: "psc-member", name: "PSC Member", role: "PSC" },
    ],
    projects: [{ id: "P1", _kfId: "P1", activities: [{ id: "1.1", _kfId: "ACT1" }], issues: [{ id: "ISS1", _kfId: "ISS1" }] }],
    __myUserIds: ["UA:PM", "UA:DH"], reads: { "UA:PM": { P1: 0 }, "UA:DH": { P1: 0 } }, chat: {}, notes: [],
  };
  return { S, ctx: makeCtx(S) };
}
const rec = (id, at, extra = {}) => ({ _id: id, project: { _id: "P1" }, author: { _id: "UB", Name: "Charu" }, sent_at: at, message_text: "hi " + id, ...extra });

test("Manila ↔ ISO round trip across midnight", () => {
  assert.equal(manilaToIso("2026-09-29 00:00:01"), "2026-09-28T16:00:01Z");
  assert.equal(isoToManila("2026-09-28T16:00:01Z"), "2026-09-29 00:00:01");
  assert.equal(isoToManila("2026-09-29T15:59:59Z"), "2026-09-29 23:59:59");
  assert.equal(isoToManila(manilaToIso("2026-12-31 23:59:59")), "2026-12-31 23:59:59");
});

test("messageFromKf maps author, time and linked activity/issue", () => {
  const { ctx } = fixture();
  const a = messageFromKf(rec("M1", "2026-09-29T01:00:00Z", { linked_item_type: "Activity", linked_item: "ACT1" }), ctx);
  assert.deepEqual(a, { pid: "P1", msg: { id: "M1", who: "UB:TEAM", at: "2026-09-29 09:00:00", text: "hi M1", ref: "act:1.1", _kfId: "M1" } });
  const i = messageFromKf(rec("M2", "2026-09-29T01:00:00Z", { linked_item_type: "Issue", linked_item: "ISS1" }), ctx);
  assert.equal(i.msg.ref, "issue:ISS1");
});

test("messageFromKf maps unknown linked item to no link", () => {
  const { ctx } = fixture();
  const m = messageFromKf(rec("M3", "2026-09-29T01:00:00Z", { linked_item_type: "Activity", linked_item: "GONE" }), ctx);
  assert.equal(m.msg.ref, "");
});

test("messageFromKf drops messages of projects I cannot see", () => {
  const { ctx } = fixture();
  assert.equal(messageFromKf({ ...rec("M4", "2026-09-29T01:00:00Z"), project: { _id: "OTHER" } }, ctx), null);
});

test("messageFromKf adds an unknown author as a Team user", () => {
  const { S, ctx } = fixture();
  const m = messageFromKf({ ...rec("M5", "2026-09-29T01:00:00Z"), author: { _id: "UZ", Name: "Zed", Email: "zed@x.com" } }, ctx);
  assert.equal(m.msg.who, "UZ:TEAM");
  assert.equal(S.users.find((u) => u.id === "UZ:TEAM").uid, "zed");
});

test("messageToKf writes project, author, ISO time, link and mentions", () => {
  const { S, ctx } = fixture();
  const row = messageToKf(S.projects[0], { id: "x", who: "UA:PM", at: "2026-09-29 09:00:00", text: "@charumathi @Joemarie see", ref: "act:1.1" }, ctx);
  assert.deepEqual(row, { project: { _id: "P1" }, author: { _id: "UA" }, sent_at: "2026-09-29T01:00:00Z", message_text: "@charumathi @Joemarie see",
    mentioned_users: "UA,UB", linked_item_type: "Activity", linked_item: "ACT1" });
  const plain = messageToKf(S.projects[0], { id: "y", who: "UA:PM", at: "2026-09-29 09:00:00", text: "no link", ref: "" }, ctx);
  assert.equal(plain.linked_item_type, undefined);
  assert.equal(plain.mentioned_users, "");
});

test("mentionedKfIds ignores unknown and placeholder users", () => {
  const { ctx } = fixture();
  assert.deepEqual(mentionedKfIds("@nobody @psc-member @charumathi @CHARUMATHI", ctx), ["UB"]);
});

test("mergeMessages dedupes by _kfId and keeps unsent local messages", () => {
  const { S, ctx } = fixture();
  const chat = buildChat(S.projects, [rec("M1", "2026-09-29T01:00:00Z")], ctx);
  chat.P1.push({ id: "local", who: "UA:PM", at: "2026-09-29 09:30:00", text: "unsent", ref: "" });
  const added = mergeMessages(chat, [rec("M1", "2026-09-29T01:00:00Z"), rec("M2", "2026-09-29T01:10:00Z")], ctx);
  assert.equal(added, 1);
  assert.deepEqual(chat.P1.map((m) => m.id), ["M1", "M2", "local"]);
  assert.equal(mergeMessages(chat, [rec("M2", "2026-09-29T01:10:00Z")], ctx), 0);
});

test("buildChat gives every visible project a channel", () => {
  const { S, ctx } = fixture();
  assert.deepEqual(buildChat(S.projects, [], ctx), { P1: [] });
});

test("readCountsFromKf counts messages up to Last read at", () => {
  const { S, ctx } = fixture();
  const chat = buildChat(S.projects, [rec("M1", "2026-09-29T01:00:00Z"), rec("M2", "2026-09-29T02:00:00Z"), rec("M3", "2026-09-29T03:00:00Z")], ctx);
  assert.deepEqual(readCountsFromKf(chat, [{ project: { _id: "P1" }, last_read_at: "2026-09-29T02:00:00Z" }], ctx), { P1: 2 });
});

test("readMarker returns the ISO time of the last read message", () => {
  const msgs = [{ at: "2026-09-29 09:00:00" }, { at: "2026-09-29 10:00:00" }];
  assert.equal(readMarker(msgs, 0), null);
  assert.equal(readMarker(msgs, 2), "2026-09-29T02:00:00Z");
  assert.equal(readMarker(msgs, 5), "2026-09-29T02:00:00Z");
});

test("notifications: mention detection, Kissflow row, load copies and merge", () => {
  const n = { to: "UB:TEAM", m: "Joemarie mentioned you in ITP-0001", s: "hello", go: ["chat", "P1"], at: "2026-09-29 09:00:00", read: false };
  assert.equal(isMention(n), true);
  assert.equal(isMention({ ...n, go: ["mytasks"] }), false);
  assert.deepEqual(noteToKf(n, { _kfId: "P1" }, "UB"), { recipient: { _id: "UB" }, notification_type: "Mention", title: n.m, detail: "hello",
    link_target: '["chat","P1"]', is_read: false, project: { _id: "P1" } });
  const recs = [{ _id: "N1", title: "t", detail: "d", link_target: '["chat","P1"]', is_read: true, _created_at: "2026-09-29T01:00:00Z" }];
  const notes = notesFromKf(recs, ["UA:PM", "UA:DH"]);
  assert.deepEqual(notes.map((x) => [x.to, x.read, x._kfId, x.go[0], x.at]), [["UA:PM", true, "N1", "chat", "2026-09-29 09:00:00"], ["UA:DH", true, "N1", "chat", "2026-09-29 09:00:00"]]);
  assert.equal(mergeNotes(notes, [...recs, { ...recs[0], _id: "N2", is_read: false }], ["UA:PM", "UA:DH"]), 2);
  assert.equal(notes.length, 4);
  assert.deepEqual(notesFromKf([{ _id: "N3", link_target: "not json" }], ["UA:PM"])[0].go, []);
});

test("activity links resolve summary rows (phases/deliverables) as well as work items", () => {
  const S = { users: [{ id: "UA:PM", uid: "j", name: "J", role: "PM", _kfUser: "UA" }], __myUserIds: ["UA:PM"], reads: {}, chat: {}, notes: [],
    projects: [{ id: "P1", _kfId: "P1", activities: [], wbs: [{ id: "P7", _kfId: "ACT7", name: "Initiation" }], issues: [] }] };
  const ctx = makeCtx(S);
  const row = messageToKf(S.projects[0], { id: "m1", who: "UA:PM", at: "2026-10-01 09:00:00", text: "hi", ref: "act:P7" }, ctx);
  assert.equal(row.linked_item, "ACT7");
  const back = messageFromKf({ _id: "K1", project: { _id: "P1" }, author: { _id: "UA" }, sent_at: "2026-10-01T01:00:00Z", message_text: "hi", linked_item_type: "Activity", linked_item: "ACT7" }, ctx);
  assert.equal(back.msg.ref, "act:P7");
});
