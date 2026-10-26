// IME-aware Enter: ignore Enter while an input method is composing (keyCode 229 / isComposing /
// a compositionend within the last 100 ms) so CJK users can confirm candidates safely.
const GRACE_MS = 100;
const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
let lastCompositionEnd = -Infinity;
if (typeof globalThis.addEventListener === 'function') {
  try {
    globalThis.addEventListener('compositionend', (e) => (lastCompositionEnd = typeof e.timeStamp === 'number' ? e.timeStamp : now()), true);
  } catch {
    /* ignore */
  }
}
const justEnded = (e) => {
  const d = (typeof e?.timeStamp === 'number' ? e.timeStamp : now()) - lastCompositionEnd;
  return d >= 0 && d < GRACE_MS;
};
export const isImeEvent = (e) => !!e && (e.isComposing || e.keyCode === 229 || e.key === 'Process' || justEnded(e));
export const imeSafeEnter = (e) => !!e && (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') && !isImeEvent(e);
