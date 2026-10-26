// Art behind the copy. Two layers: a 2D poster still (fast, always available) and the live
// WebGL2 world. The still is drawn first; when the world has rendered its first frame the
// canvas fades in and the still is dropped.
let mounted = false;
let world = null;
let busy = false;
export function mountLoginMotion() {
  const login = document.getElementById('login');
  const host = login?.querySelector('.login-motion');
  if (!host || mounted) return;
  mounted = true;
  const panel = login.querySelector('.login-panel');
  const foot = login.querySelector('.login-legal');
  const ready = () => login.classList.add('login-motion-ready');
  let poster = null;
  let worldReady = false;
  const drawStill = () =>
    (poster ??= import('./login-poster.js')
      .then(({ drawPoster }) => (worldReady ? null : drawPoster(host, { panel, foot, className: 'login-still', onReady: ready })))
      .catch(() => null));
  const onWorldReady = () => {
    worldReady = true;
    ready();
    login.classList.add('login-world-ready');
    const done = (e) => {
      if (e.target.localName !== 'canvas' || e.target.classList.contains('login-still')) return;
      host.removeEventListener('transitionend', done);
      poster?.then((p) => p?.stop());
    };
    host.addEventListener('transitionend', done);
  };
  drawStill();
  requestAnimationFrame(() =>
    setTimeout(
      () =>
        import('./login-world.js')
          .then(({ mountWorld }) => {
            world = mountWorld(host, { panel, foot, onReady: onWorldReady, onFail: drawStill }) || null;
            if (!world) drawStill();
            world?.setPaused(busy);
          })
          .catch(drawStill),
      0,
    ),
  );
}
export const loginWorldStats = () => world?.stats?.() ?? null;
export function setLoginBusy(on) {
  busy = !!on;
  document.getElementById('login')?.classList.toggle('login-busy', busy);
  world?.setPaused(busy);
}
