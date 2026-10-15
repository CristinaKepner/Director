# Director project

- `core/` owns project state and actions. `server/` hosts HTTP/SSE, adapters and media jobs. `web/` is native browser ES modules; `desktop/` packages Electron.
- Read `docs/workflow-canvas.md` before changing workflow nodes, conditions or integrated workspace behavior. Keep behavior documentation and tests aligned.
- Existing tooling is Node.js (`>=18`), `node --test`, static CSS and Three.js. Do not migrate the full app to React/TypeScript merely because a project skill has a different default baseline.
- Run `npm run test:all` for domain/backend regressions; `npm run build:web` checks distribution assembly. Real Electron checks are separate from unit tests. Network tests need local loopback listening.
- Desktop build: `cd desktop && npm ci && npm run dist`. Both FFmpeg architectures must exist in `desktop/build/bin`; `npm run bin` fetches pinned binaries. DMGs are unsigned unless a signing identity is configured.
- Reuse the action layer for UI and external-agent operations. Workflow graphs currently plan only; do not present semantic scoring, image repair or video generation as automatically executed.
- `.agents/skills/moss-desktop-development` supplies desktop engineering guidance. `flova-*` entries preserve creative reference workflows; original Flova tool names are not installed APIs. Inspect available actions/adapters before mapping them.
- Keep credentials, local projects, output media and DMGs out of Git. Use `tmp/` for isolated smoke data. Commit project skills and their references, not global user settings.
