import { clientFromEnv } from "../../../engine/client.mjs";
export const c = clientFromEnv();
export const A = "ITPMD_Project_Hub_A00";
export const ME = { _id: "UsEGq2SRCohs", Name: "Joemarie", Kind: "User" };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function call(m, p, b, tries = 4) {
  for (let i = 0; ; i++) {
    const r = await c.call(m, p, b);
    if ((r.status === 429 || r.status === 423 || r.status >= 500) && i < tries) { await sleep(2000 * (i + 1)); continue; }
    return r;
  }
}
export const q = `_application_id=${A}`;
