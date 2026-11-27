// Redraw the prototype for polled discussion data without losing what the person is typing.
// render() replaces the whole #app, so:
//   • the message box is safe to redraw (its draft lives in ui.draft) — we restore focus and caret;
//   • any other focused field, or a form with unsaved typing, defers the redraw until it's safe;
//   • an IME composition (e.g. accented or CJK input) always defers.
// request() asks for a redraw; tick() (called every couple of seconds) retries a deferred one.
export function makeRenderSoon({ doc, render }) {
  let pending = false, composing = false;
  doc.addEventListener("compositionstart", () => { composing = true; });
  doc.addEventListener("compositionend", () => { composing = false; });

  const editable = (el) => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || "");
  const dirty = (el) => (el.tagName === "SELECT" ? [...(el.options || [])].some((o) => o.selected !== o.defaultSelected) : el.value !== el.defaultValue);

  function safe() {
    if (composing) return false;
    const a = doc.activeElement;
    if (editable(a) && a.id !== "chatbox") return false;
    for (const el of doc.querySelectorAll("#app [data-form] input, #app [data-form] textarea, #app [data-form] select")) if (dirty(el)) return false;
    return true;
  }

  function tryRender() {
    if (!pending || !safe()) return;
    pending = false;
    const box = doc.activeElement?.id === "chatbox" ? doc.activeElement : null;
    const sel = box ? [box.selectionStart, box.selectionEnd] : null;
    render();
    if (sel) { const nb = doc.getElementById("chatbox"); if (nb) { nb.focus(); nb.setSelectionRange(...sel); } }
  }

  return { request() { pending = true; tryRender(); }, tick: tryRender };
}
