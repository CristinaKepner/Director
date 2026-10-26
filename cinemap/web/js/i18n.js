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
  Start: '开始',
  'All templates': '全部模板',
  'All projects': '全部项目',
  'Starting point': '起点',
  Home: '首页',
  'Search templates': '搜索模板',
  'Cinemap Beta': 'Cinemap Beta',
  'Welcome, early creator': '欢迎成为首批创作者',
  'Free during the beta': '内测期间限时免费',
  'Creating does not spend Tapies right now': '当前创作不消耗 Tapies',
  'Everything you make is kept': '所有作品完整保留',
  'Beta worlds stay in your account': '内测期间的创作都会留在账号中',
  'Metered later': '后续将按用量计费',
  'Priced by task difficulty, announced ahead of launch': '依任务难度计费，上线前提前通知',
  'Start creating': '开始创作',
  'Free for now': '限时免费',
  'Send feedback': '反馈问题',
  'Tell us what went wrong or what you expected.': '告诉我们哪里出了问题，或者你原本期望什么。',
  'What happened?': '发生了什么？',
  'Describe what happened…': '描述一下发生了什么…',
  Send: '发送',
  'Voice input': '语音输入',
  'Account and project menu': '账户与项目菜单',
  'Previous template': '上一个',
  'Next template': '下一个',
  'Close preview': '关闭预览',
  'All changes saved': '已全部保存',
  'Saving…': '正在保存…',
  Assistant: '助手',
  Connected: '已连接',
  Collapse: '收起',
  Auto: '自动',
  Ask: '直接问',
  'Let the agent do it': '让 agent 做',
  Strong: '强力档',
  Standard: '标准档',
  Fast: '快速档',
  Deep: '深度档',
  None: '不想',
  Low: '快',
  Medium: '中',
  High: '深',
  'Batch calls': '批量调用',
  'With view': '带画面',
  'Undo this': '撤销这次',
  'New chat': '新对话',
  Stop: '停止',
  'e.g. three trees and a cabin by the lake': '比如：在湖边放三棵树和一栋小房子',
  'This session $0': '本次会话 $0',
  Build: '搭世界',
  Direct: '拍戏',
  Export: '出片',
  Terrain: '地形',
  Buildings: '建筑',
  People: '人物',
  Script: '剧本',
  Actor: '人',
  Path: '动线',
  Camera: '机位',
  More: '更多',
  Help: '帮助',
  Shortcuts: '快捷键',
  'Hold to talk': '按住说话',
  'Type a request': '打字下指令',
  'Select · Actor · Path · Camera': '选择 · 人 · 动线 · 机位',
  'Cancel placing, close panels': '取消放置，关闭面板',
  Undo: '撤销',
  'Keep placing after a drop': '放下后继续放',
  'Orbit · Right drag pans · Wheel zooms': '旋转 · 右键拖动平移 · 滚轮缩放',
  Share: '分享',
  'A read-only link to this world. Anyone with the link can look around.': '这个世界的只读链接，拿到链接的人可以四处看看。',
  Copy: '复制',
  World: '世界',
  Preferences: '偏好',
  Light: '光照',
  Morning: '清晨',
  Noon: '正午',
  Afternoon: '午后',
  Dusk: '黄昏',
  Weather: '天气',
  Clear: '晴',
  Cloudy: '多云',
  Overcast: '阴',
  Rain: '雨',
  Storm: '雷雨',
  Snow: '雪',
  Fog: '雾',
  'Ask the agent': '让助手调',
  Backdrop: '远景',
  Grass: '草地',
  Forest: '林地',
  Sand: '沙地',
  Clay: '红土',
  Water: '水面',
  City: '城市',
  'Warm white': '暖白',
  White: '纯白',
  'Light grey': '浅灰',
  Ground: '地面',
  Sound: '声音',
  Effects: '音效',
  Ambience: '环境音',
  Quality: '画质',
  Hold: '按住',
  'to talk ·': '说话 ·',
  'to type': '打字',
  'Describe what to place…': '说说要放什么…',
  'Listening…': '在听…',
  Attach: '附件',
  Recentre: '回到中心',
  Rotate: '旋转',
  Scale: '缩放',
  Duplicate: '复制一个',
  'Look at': '看向它',
  Delete: '删除',
  'Version history': '版本记录',
  Library: '构件库',
  Settings: '设置',
  Save: '存档',
  'Opening your world': '正在打开你的世界',
  'Preparing your 3D canvas…': '正在准备 3D 画布…',
  'Activity history': '操作记录',
  'Edits and conversations, saved with this project.': '编辑和对话都随项目保存。',
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
