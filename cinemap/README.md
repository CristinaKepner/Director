# cinemap/ — Cinemap client replica

A from-scratch rebuild of the Cinemap web client (login surface, TapNow SSO flow, project
routing, project overview and workspace shell) that runs entirely on localhost.

```bash
npm run cinemap          # http://localhost:5180/login
npm run test:cinemap     # node --test cinemap/tests
```

- `server.mjs` — static host + the JSON routes the client expects. TapNow SSO is answered by a
  local mock authorize page; sessions are in memory; projects persist to `cinemap/data/` (ignored).
- `web/` — native ES modules, no build step. `css/tokens.css` carries the `--cm-*` design tokens.
- `docs/teardown.md` — how the original client is put together and what this replica mirrors.

Nothing from the original deployment is copied: shaders, fonts, images and copy are our own.
