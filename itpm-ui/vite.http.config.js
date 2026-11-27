// Local test-only config: same app over plain HTTP on 3003 (for headless browser checks).
import base from "./vite.config.js";
export default { ...base, server: { ...base.server, port: 3003, https: false } };
