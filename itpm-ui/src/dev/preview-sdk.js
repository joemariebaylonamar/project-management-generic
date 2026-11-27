// DEV-ONLY stand-in for the Kissflow SDK, used when the app is opened directly
// (https://localhost:3002) instead of framed inside Kissflow. It exposes the same
// surface the pages use (kf.app.getDataform / getProcess / getBoard, kf.user,
// kf.client, kf.api …) and reads REAL dev data through the vite `/__kf` proxy,
// which attaches the access key server-side. Never part of the production build.
import schema from "../../lib/kf-schema.json";

const APP_ID = schema.app.id;
const ACC = schema.app.accountId;
const ROLE_KEY = "kf-preview-role";

async function call(method, path, body) {
  let res;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`/__kf${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    // the dev proxy answers 502/503/429 on a transient upstream hiccup — retry reads (and safe writes) briefly
    if (![429, 502, 503].includes(res.status) || attempt >= 3) break;
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.en_message || data?.message || `Kissflow ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

const qs = (o) =>
  new URLSearchParams(
    Object.fromEntries(
      Object.entries({ ...o, _application_id: APP_ID }).filter(([, v]) => v !== undefined && v !== "")
    )
  ).toString();

const listShape = (b) => ({ Data: b?.Data || [], count: b?.count ?? (b?.Data || []).length, Columns: b?.Columns || [] });
const fieldsOf = (id) => schema.dataModels.find((m) => m.id === id)?.fields || [];

function toast(message, kind = "info") {
  const el = document.createElement("div");
  el.textContent = message;
  el.setAttribute("role", "status");
  el.style.cssText =
    "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;padding:10px 16px;border-radius:10px;font:500 13px/1.4 'IBM Plex Sans',system-ui;box-shadow:0 8px 24px rgb(0 0 0/.18);color:#fff;background:" +
    (kind === "error" ? "#B8321F" : "#123A1C");
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

const nativeOnly = (what) => () => {
  toast(`${what} opens the native Kissflow form — available when the app runs inside Kissflow.`);
  return Promise.resolve(null);
};

function dataform(id) {
  const base = `/form/2/${ACC}/${id}`;
  return {
    getItems: async ({ searchValue, pageNumber = 1, pageSize = 50 } = {}) =>
      listShape(await call("GET", `${base}/list?${qs({ page_number: pageNumber, page_size: pageSize, q: searchValue })}`)),
    getItem: ({ itemId }) => call("GET", `${base}/${itemId}?${qs({})}`),
    createItem: async ({ data }) => (await call("POST", `${base}/batch?${qs({})}`, [{ _is_created: true, ...data }]))?.[0] ?? null,
    updateItem: ({ itemId, data }) => call("POST", `${base}/${itemId}?${qs({})}`, data),
    deleteItem: ({ itemId }) => call("DELETE", `${base}/${itemId}?${qs({})}`),
    submitItem: ({ itemId }) => call("POST", `${base}/${itemId}/submit?${qs({})}`, {}),
    discardItem: () => Promise.resolve(null),
    getFields: async () => fieldsOf(id),
    openForm: nativeOnly("This record")
  };
}

function board(id) {
  const base = `/case/2/${ACC}/${id}`;
  return {
    getItems: async ({ pageNumber = 1, pageSize = 50 } = {}) =>
      listShape(await call("GET", `${base}/list?${qs({ page_number: pageNumber, page_size: pageSize })}`)),
    getItem: ({ instanceId }) => call("GET", `${base}/${instanceId}?${qs({})}`),
    createItem: ({ data }) => call("POST", `${base}?${qs({})}`, data),
    updateItem: ({ instanceId, data }) => call("POST", `${base}/${instanceId}?${qs({})}`, data),
    deleteItem: ({ instanceId }) => call("DELETE", `${base}/${instanceId}?${qs({})}`),
    submitItem: ({ instanceId }) => call("POST", `${base}/${instanceId}/submit?${qs({})}`, {}),
    discardItem: () => Promise.resolve(null),
    getFields: async () => fieldsOf(id),
    openForm: nativeOnly("This card")
  };
}

function process(id) {
  const base = `/process/2/${ACC}/${id}`;
  const list = async (suffix, pageNumber = 1, pageSize = 50) =>
    listShape(await call("GET", `${base}/myitems${suffix}?${qs({ page_number: pageNumber, page_size: pageSize, apply_preference: false })}`));
  const act = (verb) => ({ instanceId, activityInstanceId, comment = "" }) =>
    call("POST", `${base}/${instanceId}/${activityInstanceId}/${verb}?${qs({})}`, { Comment: comment });
  return {
    getMyItems: ({ status = "all" } = {}) =>
      list(status === "draft" ? "/Draft" : status === "inprogress" ? "/InProgress" : ""),
    // Preview approximation: the REST API has no direct "my tasks" list, so in-progress items stand in.
    getMyTasksItems: () => list("/InProgress"),
    getParticipatedItems: () => list(""),
    getAdminItems: () => list(""),
    getItem: ({ instanceId }) => call("GET", `${base}/${instanceId}?${qs({})}`),
    getAdminItem: ({ instanceId }) => call("GET", `${base}/${instanceId}?${qs({})}`),
    createItem: async ({ data }) => (await call("POST", `${base}/batch?${qs({})}`, [{ _is_created: true, ...data }]))?.[0] ?? null,
    updateItem: ({ instanceId, activityInstanceId, data }) =>
      call("POST", `${base}/${instanceId}/${activityInstanceId}?${qs({})}`, data),
    submitItem: act("submit"),
    rejectItem: act("reject"),
    sendbackItem: nativeOnly("Send back"),
    withdrawItem: nativeOnly("Withdraw"),
    reassignItem: nativeOnly("Reassign"),
    restartItem: nativeOnly("Restart"),
    discardItem: nativeOnly("Discard"),
    deleteItem: ({ instanceId }) => call("DELETE", `${base}/${instanceId}?${qs({})}`),
    updateAdminItem: ({ instanceId, data }) => call("POST", `${base}/${instanceId}?${qs({})}`, data),
    getFields: async () => fieldsOf(id),
    getProgress: ({ instanceId }) => call("GET", `${base}/${instanceId}/progress?${qs({})}`).catch(() => []),
    openForm: nativeOnly("This report")
  };
}

export function getPreviewRole() {
  try {
    return localStorage.getItem(ROLE_KEY) || "Project Manager";
  } catch {
    return "Project Manager";
  }
}

export function setPreviewRole(name) {
  try {
    localStorage.setItem(ROLE_KEY, name);
  } catch {
    /* storage blocked — role resets on reload */
  }
}

export async function createPreviewSdk() {
  const me = await call("GET", `/user/2/${ACC}/me`).catch(() => ({ Name: "Preview user", Email: "" }));
  // /me has no _id; resolve it from the account user list by email.
  const people = await call("GET", `/user/2/${ACC}?page_size=500`).catch(() => []);
  const found = Array.isArray(people) ? people.find((p) => p.Email && p.Email === me.Email) : null;
  if (found) me._id = found._id;
  const roles = (schema.roles || []).map((r) => ({ _id: r.id, Name: r.name }));
  const current = roles.filter((r) => r.Name === getPreviewRole());
  const pageParams = Object.fromEntries(new URLSearchParams(window.location.search));
  const vars = {};
  return {
    preview: true,
    user: { _id: me._id || me.Email || "preview-user", Name: me.Name, Email: me.Email, FirstName: me.FirstName, LastName: me.LastName },
    account: { _id: ACC },
    api: (url, opts = {}) => call(opts.method || "GET", url, opts.body),
    client: {
      showInfo: (m) => toast(m),
      showError: (m) => toast(m, "error"),
      showConfirm: async () => true,
      getImageUrl: async () => ""
    },
    formatter: {
      toCurrency: (v, c = "PHP") => new Intl.NumberFormat("en-PH", { style: "currency", currency: c }).format(Number(v) || 0),
      toDate: (v) => (v ? new Date(v).toLocaleDateString("en-PH") : ""),
      toDateTime: (v) => (v ? new Date(v).toLocaleString("en-PH") : ""),
      toNumber: (v) => new Intl.NumberFormat("en-PH").format(Number(v) || 0)
    },
    app: {
      _id: APP_ID,
      getDataform: dataform,
      getProcess: process,
      getBoard: board,
      getDecisionTable: () => ({ evaluate: async () => ({}) }),
      getRoles: async () => ({ roles, currentRoles: current }),
      getVariable: async (k) => vars[k],
      updateVariables: async (o) => Object.assign(vars, o),
      page: {
        getParameter: async (k) => pageParams[k],
        getAllParameters: async () => pageParams,
        getVariable: async (k) => vars[k],
        updateVariables: async (o) => Object.assign(vars, o)
      }
    }
  };
}
