import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRenderSoon } from "../src/render-soon.js";

// Minimal DOM stand-in: fields carry value/defaultValue like real inputs.
function fakeDoc({ active = null, formFields = [], chatbox = null } = {}) {
  const handlers = {};
  return {
    activeElement: active,
    addEventListener: (t, fn) => { handlers[t] = fn; },
    fire: (t) => handlers[t]?.(),
    querySelectorAll: () => formFields,
    getElementById: (id) => (id === "chatbox" ? chatbox : null),
  };
}
const field = (value, defaultValue = "", tagName = "INPUT") => ({ tagName, value, defaultValue });

test("renders straight away when nothing is being edited", () => {
  let n = 0; const r = makeRenderSoon({ doc: fakeDoc(), render: () => n++ });
  r.request(); assert.equal(n, 1);
  r.tick(); assert.equal(n, 1);
});

test("renders while typing in the message box and restores focus and caret", () => {
  const box = { id: "chatbox", tagName: "TEXTAREA", value: "hello wor", selectionStart: 5, selectionEnd: 7, focused: 0,
    focus() { this.focused++; }, setSelectionRange(a, b) { this.sel = [a, b]; } };
  const doc = fakeDoc({ active: box, chatbox: box });
  let n = 0; const r = makeRenderSoon({ doc, render: () => n++ });
  r.request();
  assert.equal(n, 1);
  assert.equal(box.focused, 1);
  assert.deepEqual(box.sel, [5, 7]);
});

test("waits while an IME composition is in progress", () => {
  const box = { id: "chatbox", tagName: "TEXTAREA", value: "", selectionStart: 0, selectionEnd: 0, focus() {}, setSelectionRange() {} };
  const doc = fakeDoc({ active: box, chatbox: box });
  let n = 0; const r = makeRenderSoon({ doc, render: () => n++ });
  doc.fire("compositionstart"); r.request(); assert.equal(n, 0);
  doc.fire("compositionend"); r.tick(); assert.equal(n, 1);
});

test("waits while another field has focus, then renders", () => {
  const doc = fakeDoc({ active: field("", "", "INPUT") });
  let n = 0; const r = makeRenderSoon({ doc, render: () => n++ });
  r.request(); assert.equal(n, 0);
  doc.activeElement = { tagName: "BODY" }; r.tick(); assert.equal(n, 1);
});

test("waits while a form has unsaved typing, even without focus", () => {
  const doc = fakeDoc({ active: { tagName: "BODY" }, formFields: [field("New CRM rollout", "")] });
  let n = 0; const r = makeRenderSoon({ doc, render: () => n++ });
  r.request(); assert.equal(n, 0);
  doc.querySelectorAll = () => [field("100", "100")]; // prefilled but untouched
  r.tick(); assert.equal(n, 1);
});

test("tick does nothing when no redraw was requested", () => {
  let n = 0; const r = makeRenderSoon({ doc: fakeDoc(), render: () => n++ });
  r.tick(); assert.equal(n, 0);
});
