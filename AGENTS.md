# Repository Guidelines

## Project Structure & Module Organization

This workspace contains the BPI ITPMD Project Hub application and its requirements and delivery artifacts.

- `itpm-ui/`: React 19, Vite, and Tailwind custom UI. Routes live in `src/pages/`, shared components in `src/components/`, hooks in `src/hooks/`, and application helpers and styles in `src/`.
- `itpm-ui/test/`: automated regression tests; `public/`: static assets; `scripts/`: packaging and validation utilities.
- `runs/`: application specifications, decisions, seed data, and QA evidence organized by run.
- `docs/` and `reference/`: project documentation and reference material.
- Root BRD and HTML prototype files provide requirements and visual context.

## Build, Test, and Development Commands

Run commands from `itpm-ui/`:

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server; use the URL it prints.
- `npm test`: run `test/*.test.mjs` with Node’s built-in test runner.
- `npm run check:theme`: validate theme usage.
- `npm run build`: run the theme check and build production assets.
- `npm run zip`: rebuild and package `itpm-ui.zip` for Custom UI upload.
- `npm run kf:sync`: refresh the connected app’s schema and context in `lib/`.

## Coding Style & Naming Conventions

Follow `.prettierrc`: two-space indentation, semicolons, double quotes, and no trailing commas. Preserve surrounding conventions when editing existing files. Use PascalCase for React component exports, `use` prefixes for hooks, and descriptive helper names. Follow existing route filenames, such as `src/pages/index.jsx`. Reuse shared components and theme styles.

## Testing Guidelines

Name regression tests `<feature>.test.mjs` under `itpm-ui/test/`. Cover changed business rules, edge cases, and failure paths using the existing Node test patterns. No numeric coverage threshold is configured. Before submitting UI changes, run `npm test` and `npm run build`, then inspect affected screens in the browser.

## Commit & Pull Request Guidelines

This checkout has no Git history available to establish a commit convention. Use concise, imperative subjects, such as `Fix weekly report totals`. PRs should explain the behavior change, link relevant requirements or issues, record validation results, and include screenshots for visible changes.

## Security & Configuration

Use `.env.example` to configure local access. Keep credentials, private keys, and sensitive QA data out of commits. Refresh generated `lib/kf-context.md` and `lib/kf-schema.json` through `kf:sync` rather than editing them manually. Keep source changes separate from generated ZIPs and build output.
