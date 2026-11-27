import { call, c } from "./kf.mjs";
const r = await call("GET", `/user/2/${c.acc}?page_size=200`);
const list = Array.isArray(r.body) ? r.body : r.body?.Data || [];
console.log(r.status, list.length); for (const u of list) console.log(u._id, u.Email, u.Name, u.Status || "");
