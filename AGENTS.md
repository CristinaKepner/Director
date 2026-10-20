# Director project

- `core/` owns project state and actions. `server/` hosts HTTP/SSE, adapters and media jobs. `web/` is native browser ES modules; `desktop/` packages Electron.
- Read `docs/workflow-canvas.md` before changing workflow nodes, conditions or integrated workspace behavior. Keep behavior documentation and tests aligned.
- Existing tooling is Node.js (`>=18`), `node --test`, static CSS and Three.js. Do not migrate the full app to React/TypeScript merely because a project skill has a different default baseline.
- Run `npm run test:all` for domain/backend regressions; `npm run build:web` checks distribution assembly. Real Electron checks are separate from unit tests. Network tests need local loopback listening.
- Desktop build: `cd desktop && npm ci && npm run dist`. Both FFmpeg architectures must exist in `desktop/build/bin`; `npm run bin` fetches pinned binaries. DMGs are unsigned unless a signing identity is configured.
- Reuse the action layer for UI and external-agent operations. Workflow planning is reversible; execution requires explicit confirmation and a generation budget. Preserve branch gating, uncertain-verdict pauses, candidate outputs and project isolation; never treat mocked model tests as a real quality verdict.
- `.agents/skills/moss-desktop-development` supplies desktop engineering guidance. `flova-*` entries preserve creative reference workflows; original Flova tool names are not installed APIs. Inspect available actions/adapters before mapping them.
- Keep credentials, local projects, output media and DMGs out of Git. Use `tmp/` for isolated smoke data. Commit project skills and their references, not global user settings.

- `creation-ui/` is the small React Flow view inside the native main workspace, not a second application. Install its exact locked dependencies with `npm --prefix creation-ui ci`; run `npm run check:workflow` before changing workflow execution or its tracked `web/vendor/creation` output. Keep authoritative state in core/actions and project.workflow.
- Empty-project onboarding is derived from current project contents, not a persistent first-run flag. Keep creation media and assets linked; never write stale upload results into a newly opened project.

- Director 0.9.19 and Downloads/MossCreate Base are separate products. Director starts with the native project overview and a modal empty-project guide; node composition is an in-workspace view. Do not copy the Base application shell into Director.

- Feature ownership and documentation: read `docs/features/README.md` and the relevant feature folder before changes. Domain/server/browser implementations live under `core/features/<id>`, `server/src/features/<id>`, and `web/js/features/<id>`; keep the single store and shared registration/assembly entry points.
- Keep `docs/features/catalog.json` and each feature implementation list aligned when moving or adding modules/Actions. Run `npm run test:features`; browser import tests now recurse through feature directories. Migration and verified limits are in `docs/features/migration.md`.

- Skills are maintained in `skills-library/installed`; `.agents/skills` is a compatible discovery mirror. After edits run `npm run skills:sync`, and verify with `npm run check:skills`. Read `docs/features/skills/README.md` before changing `skills.*` Harness calls. Skills provide planning context, not permission to run scripts or bypass generation confirmation/budgets.
