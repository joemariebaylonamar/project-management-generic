// Kissflow answers a request for a record that no longer exists with 404 / "could not be located".
// A save pass can re-send a delete that already went through (a pass that ends while another edit is
// queued keeps the old snapshot), so a delete of a missing record counts as done.
export const isGone = (e) => e?.status === 404 || e?.cause?.status === 404 || /could not be located|not found/i.test(String(e?.message || ""));

// run a DELETE; true when it deleted, false when the record was already gone; other errors still throw
export async function deleteIfPresent(del) {
  try { await del(); return true; }
  catch (e) { if (isGone(e)) return false; throw e; }
}
