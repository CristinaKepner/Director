# cinemap/ — Cinemap client replica

A from-scratch rebuild of the Cinemap web client — login surface, TapNow SSO flow, the
"horizon" home page (turntable, starting points, composer, template browser), and the
workspace (shell → assistant panel → white-model editor) — that runs entirely on localhost.

```bash
npm run cinemap          # http://localhost:5180/login
npm run test:cinemap     # node --test cinemap/tests
cd cinemap/desktop && npm ci && npm run dist   # Cinemap.app + DMG (arm64 + x64, unsigned) in desktop/dist
```

- `server.mjs` — static host + the JSON routes the client expects. TapNow SSO is answered by a
  local mock authorize page; sessions are in memory; projects persist to `cinemap/data/` (ignored).
- `web/` — native ES modules, no build step. `css/tokens.css` carries the `--cm-*` design tokens.
  `home.html` is the signed-in home, `app.html` → `agent.html` → `editor.html` is the workspace
  (same three-frame layering as the original); `js/editor/` is our own Three.js workshop
  (kits, per-template world generation, clock/weather lighting, placing, inspector, voice bar).
- `harness/` — the Action Registry, world runtime, planners and host that every edit goes through
  (editor, assistant, CLI); see `docs/harness.md`. Set `CINEMAP_LLM_KEY` to plan with a model.
- `tools/simready.mjs` + `tools/usd2glb.py` — import NVIDIA SimReady assets (CC-BY-4.0) as GLB kits.
- `bin/cinemap.mjs` — CLI over the same actions.
- `desktop/` — the macOS client: Electron shell that starts this same server on a loopback port,
  signs the window in with a one-time token (no TapNow), and keeps keys in its own support folder.
- `docs/teardown.md` — how the original client is put together and what this replica mirrors.

Nothing from the original deployment is copied: shaders, fonts, images and copy are our own.
