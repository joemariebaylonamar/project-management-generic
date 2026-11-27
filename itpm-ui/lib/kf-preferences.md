# kf-preferences — learned UI preferences (newest wins)

## Theme & identity
- [HARD] [global] (2026-09-28) The custom UI must reproduce the approved prototype `../ITPMD_Project_Hub_Prototype_LANDBANK (4).html` — its layout, navigation, screens, widgets and LANDBANK look. The prototype is the UI reference (BRD §4.6: "screens are built rather than designed from scratch").
- [HARD] [global] (2026-09-28) Colours come from the prototype's exact tokens, pinned in `src/app-theme.css` (primary #2F7D32, brand #74BC44, sidebar #123A1C, bg #F3F5F4; light + dark). Use semantic tokens only; never hardcode hex.
- [HARD] [global] (2026-09-28) Font: IBM Plex Sans (BRD §11.3). Show the LANDBANK logo in the shell.

## Data
- [HARD] [global] (2026-09-28) Every value comes from the live Kissflow app `ITPMD_Project_Hub_A00` via the SDK. Where the prototype shows demo numbers, bind them to real fields/aggregates; never ship prototype sample data.

## Tooling
- [HARD] [global] (2026-09-28) Local preview: opening the app outside Kissflow boots a DEV-ONLY standalone mode (`src/dev/preview-*.js*`) with live dev data via the `/__kf` proxy, a Preview role switcher (bottom-right, localStorage `kf-preview-role`) and `kf.app.getRoles().currentRoles` = the switched role. Test pages with Playwright at http://localhost:3003 (HTTP twin of :3002). Don't edit `src/dev/*`, `vite.config.js`, `src/main.jsx`, `src/app-theme.css` from page work.
- [global] (2026-09-28) In preview, `getMyTasksItems()` is approximated by in-progress items, and `openForm`/`sendbackItem` show a "native only" toast — design pages so they still render sensibly.
