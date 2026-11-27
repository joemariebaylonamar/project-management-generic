import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
const code = readFileSync(new URL("./proto-script.js", import.meta.url), "utf8");
const store = {};
const el = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => "" : el()), apply: () => el(), set: () => true });
const ctx = { console, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, document: el(), window: el(), matchMedia: () => ({ matches: false, addEventListener() {} }), navigator: {}, setTimeout, clearTimeout, fetch: async () => ({}), location: { hash: "" }, history: el(), requestAnimationFrame: () => 0, URL, Intl, Date, Math, JSON };
ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
try { vm.runInContext(code, ctx, { timeout: 10000 }); } catch (e) { console.error("run error (may be after S built):", e.message); }
if (!ctx.__S) throw new Error("S not captured");
writeFileSync(new URL("./proto-state.json", import.meta.url), JSON.stringify(ctx.__S, null, 1));
const S = ctx.__S;
console.log("projects", S.projects.length, "acts", S.projects.map(p => p.activities.length), "risks", S.projects.map(p => p.risks.length), "issues", S.projects.map(p => p.issues.length), "psrs", S.projects.map(p => p.psrs.length), "holidays", S.holidays.length, "users", S.users.length);
console.log(JSON.stringify(S.projects[0].activities[4]));
