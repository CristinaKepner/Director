// Language switch motion: the highlight pill slides (clip-path), copy fades out → swaps →
// fades in, and anything that moved because of the new line lengths slides into place.
import { lang, onLang, setLang } from './i18n.js';
const EASE_OUT = 'cubic-bezier(.55,.055,.675,.19)';
const EASE_IN = 'cubic-bezier(.23,1,.32,1)';
const EASE_MOVE = 'cubic-bezier(.645,.045,.355,1)';
export function mountLangMotion() {
  const login = document.getElementById('login');
  const seg = login?.querySelector('.login-lang');
  const hl = seg?.querySelector('.lang-hl');
  if (!seg || !hl || !Element.prototype.animate) return;
  const panel = login.querySelector('.login-panel');
  const fading = () => [login.querySelector('.login-copy'), document.querySelector('#tapnowSignIn > span'), login.querySelector('.login-legal')].filter(Boolean);
  const shifting = () => [...panel.children].filter((el) => !el.classList.contains('login-copy') && !el.hidden);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const place = (code) => {
    const b = seg.querySelector(`button[data-lang="${code}"]`);
    if (b) hl.style.clipPath = `inset(0 ${seg.clientWidth - b.offsetLeft - b.offsetWidth}px 0 ${b.offsetLeft}px round 8px)`;
  };
  const snap = (code) => {
    hl.style.transition = 'none';
    place(code);
    requestAnimationFrame(() => requestAnimationFrame(() => (hl.style.transition = '')));
  };
  const cancelAll = (els) => els.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  let active = lang();
  let phase = 'idle';
  const switched = (code) =>
    new Promise((resolve) => {
      if (lang() === code) return resolve();
      const off = onLang((c) => {
        if (c === code) {
          off();
          resolve();
        }
      });
      setLang(code);
    });
  async function go(code, animate) {
    if (code === active) return;
    active = code;
    place(code);
    for (const b of seg.querySelectorAll('button[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === code));
    if (!animate || reduced.matches) {
      cancelAll(fading());
      cancelAll(shifting());
      setLang(code);
      return;
    }
    if (phase === 'exit') return;
    phase = 'exit';
    const exits = fading().map((el) => {
      const op = +getComputedStyle(el).opacity;
      cancelAll([el]);
      return el.animate([{ opacity: op, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-4px)', filter: 'blur(2px)' }], { duration: 110 * Math.max(op, 0.3), easing: EASE_OUT, fill: 'forwards' });
    });
    try {
      await Promise.all(exits.map((a) => a.finished));
    } catch {
      phase = 'idle';
      return;
    }
    const movers = shifting();
    const tops = movers.map((el) => el.getBoundingClientRect().top);
    cancelAll(movers);
    await switched(active);
    movers.forEach((el, i) => {
      const dy = tops[i] - el.getBoundingClientRect().top;
      if (Math.abs(dy) > 0.5) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 300, easing: EASE_MOVE });
    });
    const enters = fading().map((el, i) => el.animate([{ opacity: 0, transform: 'translateY(6px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 260, delay: 60 + i * 45, easing: EASE_IN, fill: 'backwards' }));
    exits.forEach((a) => a.cancel());
    phase = 'enter';
    place(active);
    Promise.all(enters.map((a) => a.finished)).then(
      () => phase === 'enter' && (phase = 'idle'),
      () => {},
    );
  }
  for (const b of seg.querySelectorAll('button[data-lang]'))
    b.onclick = (e) => {
      e.stopPropagation();
      go(b.dataset.lang, e.detail > 0);
    };
  onLang((code) => {
    if (code !== active) {
      active = code;
      snap(code);
    }
  });
  seg.classList.add('lang-motion');
  snap(active);
  document.fonts?.ready.then(() => snap(active));
  addEventListener('resize', () => snap(active));
}
