import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import Pages from "vite-plugin-pages";
import path from "node:path";
import { writeFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";

// Live-data proxy for the DEV-ONLY standalone preview (src/dev/*): /__kf/* → Kissflow
// REST with the access key attached server-side. `apply: "serve"` — never in the build.
import { kfLiveProxy } from "./vite-kf-live.js";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // src/pages/**.jsx → routes. e.g. src/pages/items/[id].jsx → /items/:id
    Pages({ dirs: "src/pages" }),
    // /__kf/* → real Kissflow REST (admin key attached server-side). Dev only.
    kfLiveProxy(),
    {
      name: "emit-kf-manifest",
      writeBundle() {
        writeFileSync(
          path.resolve(__dirname, "dist/manifest.json"),
          JSON.stringify(
            { Category: "Application", Framework: "React" },
            null,
            2
          )
        );
      }
    }
  ],
  // Relative asset paths so the built bundle works from a zip or any mount point.
  base: "",
  // Force a single copy of react / react-router so @kissflow/app-core's MemoryRouter
  // and your pages' hooks share one RouterContext (otherwise the production build
  // bundles two copies → "Cannot destructure property 'future' of … null").
  resolve: {
    dedupe: ["react", "react-dom", "react-router-dom"],
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  build: { target: "es2022" },
  // Serve app-core unbundled in dev so the preview shares its context modules.
  optimizeDeps: { exclude: ["@kissflow/app-core"], include: ["@kissflow/lowcode-client-sdk"] },
  server: {
    port: 3002,
    host: "0.0.0.0",
    // HTTPS so the Kissflow (https) shell can iframe this without mixed-content blocks.
    https: {
      cert: path.resolve("./cert/localhost.crt"),
      key: path.resolve("./cert/localhost.key")
    }
  }
});
