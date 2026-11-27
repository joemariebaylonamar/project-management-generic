import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The generated index.html must stamp messages with the live Asia/Manila clock, not the page-load date.
test("nowStamp is the live Manila clock", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const line = html.match(/const nowStamp = [^\n]*/)[0];
  const RealDate = Date;
  const fixed = RealDate.parse("2026-09-29T16:05:00Z"); // 00:05 on 30 Sep in Manila
  globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  try {
    const TODAY = "2026-09-29"; // what a page opened before midnight still holds
    const nowStamp = new Function("TODAY", `${line}\nreturn nowStamp;`)(TODAY);
    assert.equal(nowStamp(), "2026-09-30 00:05:00");
  } finally { globalThis.Date = RealDate; }
});
