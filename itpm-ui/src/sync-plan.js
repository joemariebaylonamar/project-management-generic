// Which rows of one record list a save pass must write or delete (current vs last-saved snapshot).
// Rows loaded without a stored sort order (`_needsOrder`) only have an order implied by load position; that
// order is written the first time anything in the list changes, so WBS numbers can't drift between sessions.
// `known` (optional) = the ids that exist in Kissflow right now. The last snapshot can predate a record created
// by a pass that ended while another edit was queued, so deletes are worked out from `known` when it is given.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function planRows(cur, old, rowFn, known) {
  const o = Object.fromEntries((old || []).filter((x) => x._kfId).map((x) => [x._kfId, x]));
  const changed = (x) => !x._kfId || !o[x._kfId] || !same(rowFn(x), rowFn(o[x._kfId]));
  const keep = new Set(cur.map((x) => x._kfId));
  const del = known ? [...known].filter((id) => !keep.has(id)).map((id) => o[id] || { _kfId: id })
    : (old || []).filter((x) => x._kfId && !keep.has(x._kfId));
  const any = del.length > 0 || cur.some(changed);
  return { write: cur.filter((x) => changed(x) || (any && x._needsOrder)), del };
}
