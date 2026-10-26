// Where the UI language comes from: ?lang → remembered choice → browser; remembered in
// localStorage (and mirrored to a cookie so the server can render the right <html lang>).
import { DEFAULT_LOCALE, isLocale, localeInfo, matchLocale, normLocale } from './locales.js';
export const LANG_KEY = 'cinemap.ui.language';
export const LANG_PICKED_KEY = 'cinemap.ui.language.picked';
export const LANG_COOKIE = 'cm_ui_lang';
const has = (name) => typeof globalThis[name] !== 'undefined';
const asLocale = (v) => (v == null || v === '' ? null : matchLocale([String(v)]));
export function browserLocale() {
  if (!has('navigator')) return DEFAULT_LOCALE;
  try {
    return matchLocale(navigator.languages?.length ? navigator.languages : [navigator.language || '']) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
export function pickedLocale() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return isLocale(v) && localStorage.getItem(LANG_PICKED_KEY) === '1' ? v : null;
  } catch {
    return null;
  }
}
export function queryLocale() {
  try {
    return has('location') ? asLocale(new URLSearchParams(location.search).get('lang')) : null;
  } catch {
    return null;
  }
}
export const initialLocale = () => queryLocale() ?? pickedLocale() ?? browserLocale();
export function writeLangCookie(code) {
  try {
    if (has('document')) document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax${has('location') && location.protocol === 'https:' ? '; secure' : ''}`;
  } catch {
    /* cookies blocked */
  }
}
export function rememberLocale(code) {
  const n = normLocale(code);
  try {
    localStorage.setItem(LANG_KEY, n);
    localStorage.setItem(LANG_PICKED_KEY, '1');
  } catch {
    /* storage blocked */
  }
  writeLangCookie(n);
  return n;
}
export function syncLangCookie() {
  const p = pickedLocale();
  if (p) writeLangCookie(p);
}
export function setUiLang(code, { remember = false } = {}) {
  const n = normLocale(code);
  try {
    document.documentElement.lang = localeInfo(n).htmlLang;
    document.documentElement.dataset.uiLang = n;
  } catch {
    /* no document */
  }
  if (remember) rememberLocale(n);
  return n;
}
