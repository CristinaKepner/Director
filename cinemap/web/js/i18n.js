// Page-level translation: English markup is the source; text nodes and a few attributes are
// swapped in place from an en→zh dictionary (ja/ko come from /i18n/web/<code>.json packs).
import { LOCALES, isLocale, localeInfo, normLocale } from './locales.js';
import { LANG_KEY, initialLocale, queryLocale, rememberLocale, setUiLang, syncLangCookie } from './lang.js';

const listeners = new Set();
let current = initialLocale();
if (queryLocale()) rememberLocale(current);
syncLangCookie();

const packs = (globalThis.__cmWebPacks ??= Object.create(null));
const loading = new Map();
const needsPack = (code) => !localeInfo(code).source;
function loadPack(code) {
  if (!needsPack(code) || packs[code]) return Promise.resolve(packs[code]);
  if (!loading.has(code)) {
    loading.set(
      code,
      fetch(`/i18n/web/${code}.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}))
        .then((p) => (packs[code] = p)),
    );
  }
  return loading.get(code);
}
const ready = needsPack(current) ? loadPack(current) : null;

export const packText = (en, code = current, key) => {
  const pack = packs[code];
  if (!pack) return undefined;
  return (key != null ? pack[`${en}@@${key}`] : undefined) ?? pack[en];
};
setUiLang(current);
export const lang = () => current;
export const intlLang = () => localeInfo(current).intl;
export const T = (en, zh) => (current === 'zh' ? zh : current === 'en' ? en : packText(en, current) ?? en);
export const onLang = (fn) => (listeners.add(fn), () => listeners.delete(fn));

const DICT = {
  'Privacy Policy': '隐私政策',
  'Terms of Service': '服务条款',
  'Community Guidelines': '社区准则',
  'Generated Content License': '生成内容许可',
  'Every world starts': '每个世界，',
  'with an idea.': '都始于一个念头。',
  'Sign in to make it yours.': '登录，开始你的世界。',
  Email: '邮箱',
  Password: '密码',
  'Account or email': '账号或邮箱',
  Continue: '继续',
  'What world should we create?': '想创造什么样的世界？',
  'Describe a world you’d like to build…': '描述你想搭建的世界…',
  'Describe your world': '描述你的世界',
  'Add images or a document': '添加图片或文档',
  'Starting point': '起点',
  Blank: '空白',
  Model: '模型',
  'Create world': '创建世界',
  'Agent model': '助手模型',
  'Choose a template': '选择模板',
  'Search templates': '搜索模板',
  'Your library': '我的作品',
  Projects: '项目',
  Templates: '模板',
  Assets: '素材',
  Tutorial: '新手教程',
  Search: '搜索',
  'Search your projects': '搜索项目',
  'List view': '列表视图',
  'Grid view': '网格视图',
  'Account menu': '账户菜单',
  'Cinemap home': 'Cinemap 首页',
  'Back to projects': '返回项目',
  'Rename project': '重命名项目',
  'Opening your world': '正在打开你的世界',
  'Preparing your 3D canvas…': '正在准备 3D 画布…',
  'All projects': '全部项目',
  'New project': '新建项目',
  'Save a copy': '另存副本',
  'Save as template': '存为模板',
  'Activity history': '操作记录',
  'Sign out': '退出登录',
  'Switch account': '切换账号',
  'Name your world': '给世界起个名字',
  Close: '关闭',
  'Project name': '项目名称',
  'Untitled world': '未命名世界',
  Cancel: '取消',
  Language: '语言',
  Enter: '进入',
  Preview: '预览',
  'Cinemap — Build 3D worlds from words': 'Cinemap — 用文字搭出 3D 世界',
  Loading: '加载中',
};
const originalTitle = document.title;
const ATTRS = ['placeholder', 'aria-label', 'title'];
const skip = (el) => el.closest('#starterGrid,#projectGrid,#activityList,#toast,.account-heading,#projectTitle,.lang-seg,[data-i18n-ignore]');

function apply() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement || skip(node.parentElement)) continue;
    if (node.__en === undefined) {
      const key = node.nodeValue.trim();
      if (!DICT[key]) continue;
      node.__en = node.nodeValue;
    }
    const key = node.__en.trim();
    node.nodeValue = current === 'en' ? node.__en : node.__en.replace(key, T(key, DICT[key]));
  }
  for (const el of document.querySelectorAll('[placeholder],[aria-label],[title]')) {
    if (el.parentElement && skip(el.parentElement)) continue;
    for (const attr of ATTRS) {
      const dataKey = 'en' + attr.replace(/-./, (m) => m[1].toUpperCase()).replace(/^./, (m) => m.toUpperCase());
      if (el.dataset[dataKey] === undefined) {
        const v = el.getAttribute(attr);
        if (!v || !DICT[v]) continue;
        el.dataset[dataKey] = v;
      }
      const en = el.dataset[dataKey];
      el.setAttribute(attr, T(en, DICT[en]));
    }
  }
  document.title = DICT[originalTitle] ? T(originalTitle, DICT[originalTitle]) : originalTitle;
  setUiLang(current);
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === current));
}

export function setLang(code, { store = true } = {}) {
  code = normLocale(code);
  if (store) rememberLocale(code);
  if (code === current) return;
  const commit = () => {
    current = code;
    apply();
    for (const fn of listeners) fn(current);
  };
  if (needsPack(code) && !packs[code]) {
    loadPack(code).then(commit);
    return;
  }
  commit();
}

window.__localization = { setLocale: (c) => setLang(c), locale: () => current };
window.addEventListener('storage', (e) => {
  if (e.key === LANG_KEY && isLocale(e.newValue)) setLang(e.newValue, { store: false });
});

function fillSegments() {
  for (const seg of document.querySelectorAll('.lang-seg')) {
    const first = seg.querySelector('[data-lang]');
    if (!first) continue;
    const present = [...seg.querySelectorAll('[data-lang]')].map((b) => b.dataset.lang);
    if (LOCALES.every((l) => present.includes(l.code))) continue;
    seg.replaceChildren(
      ...LOCALES.map((l) => {
        const b = first.cloneNode(false);
        b.dataset.lang = l.code;
        b.lang = l.htmlLang;
        b.textContent = l.name;
        if (first.dataset.testid) b.dataset.testid = `locale-${l.code}`;
        return b;
      }),
    );
  }
}
export function mountLanguage() {
  fillSegments();
  for (const b of document.querySelectorAll('[data-lang]'))
    b.onclick = (e) => {
      e.stopPropagation();
      setLang(b.dataset.lang);
    };
  apply();
}
if (ready) await ready;
