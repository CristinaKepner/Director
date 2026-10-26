// Locale registry. `source` locales ship their copy inline (en/zh); the others load a JSON pack.
const INTER = '"Cinemap Sans", -apple-system, BlinkMacSystemFont, "Segoe UI"';
export const LOCALES = [
  { code: 'en', name: 'English', htmlLang: 'en', intl: 'en-US', source: true, fallback: null, quotes: ['“', '”'], listSep: null, fontStack: `${INTER}, sans-serif`, browserMatch: /^en\b/i },
  { code: 'zh', name: '中文', htmlLang: 'zh-CN', intl: 'zh-CN', source: true, fallback: null, quotes: ['「', '」'], listSep: '、', fontStack: `${INTER}, "PingFang SC", "Microsoft YaHei UI", sans-serif`, browserMatch: /^zh\b/i },
  { code: 'ja', name: '日本語', htmlLang: 'ja', intl: 'ja-JP', source: false, fallback: 'en', quotes: ['「', '」'], listSep: '、', fontStack: `${INTER}, "Hiragino Sans", "Yu Gothic UI", Meiryo, "Noto Sans JP", sans-serif`, browserMatch: /^ja\b/i },
  { code: 'ko', name: '한국어', htmlLang: 'ko', intl: 'ko-KR', source: false, fallback: 'en', quotes: ['“', '”'], listSep: null, fontStack: `${INTER}, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`, browserMatch: /^ko\b/i },
];
export const DEFAULT_LOCALE = 'en';
export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const SOURCE_LOCALES = LOCALES.filter((l) => l.source).map((l) => l.code);
export const PACK_LOCALES = LOCALES.filter((l) => !l.source).map((l) => l.code);
const BY_CODE = new Map(LOCALES.map((l) => [l.code, l]));
export const isLocale = (code) => BY_CODE.has(code);
export function normLocale(value) {
  const v = String(value ?? '').trim();
  for (const l of LOCALES) if (l.code === v || l.browserMatch.test(v)) return l.code;
  return DEFAULT_LOCALE;
}
export const localeInfo = (code) => BY_CODE.get(code) ?? BY_CODE.get(normLocale(code));
export function matchLocale(tags) {
  for (const tag of tags || []) {
    const t = String(tag).split(';')[0].trim();
    for (const l of LOCALES) if (l.browserMatch.test(t)) return l.code;
  }
  return null;
}
