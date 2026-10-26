// UI copy for the sign-in surface: [en, zh] pairs, plus ja/ko through the locale packs.
import { packText } from './i18n.js';
const UI = {
  'continue-with-tapnow': ['Continue with TapNow', '使用 TapNow 登录'],
  'checking-tapnow-sign-in': ['Checking your TapNow sign-in…', '正在检查 TapNow 登录状态…'],
  'embed-loading': ['Loading…', '加载中…'],
  'embed-load-failed': ["Couldn't load", '加载失败'],
  'embed-updating': ['Cinemap is updating. Please reopen it in a moment.', 'Cinemap 正在更新，请稍后重新打开。'],
  'embed-retry': ['Retry', '重试'],
  'enter-cinemap': ['Enter Cinemap', '进入 Cinemap'],
  'entering-cinemap': ['Entering…', '正在进入…'],
  'invitation-code': ['Invitation code', '邀请码'],
  'no-tapnow-account': ['No TapNow account yet?', '还没有 TapNow 账号？'],
  'register-in-tapnow': ['Register in TapNow', '去 TapNow 注册'],
  'cinemap-account-or-email': ['Cinemap account or email', 'Cinemap 账号或邮箱'],
  'tapnow-email': ['TapNow email', 'TapNow 邮箱'],
  'tapnow-password': ['TapNow password', 'TapNow 密码'],
  'sign-in': ['Sign in', '登录'],
  'use-your-tapnow-account': ['Use your TapNow account.', '使用你的 TapNow 账号。'],
  'use-your-tapnow-or-invited-cinemap-account': ['Use your TapNow account, or an invited Cinemap account.', '使用你的 TapNow 账号，或受邀的 Cinemap 账号。'],
  'company-services-are-not-configured-yet': ['Sign-in services are not configured yet.', '登录服务尚未配置。'],
  'generic-failure': ["This action couldn't finish. Your saved work is kept — please try again.", '这个操作没能完成。已保存的内容还在，请重试。'],
};
const ERRORS = {
  TAPNOW_SSO_LOGIN_REQUIRED: ['Please sign in to TapNow to continue.', '请先登录 TapNow。'],
  TAPNOW_SSO_EXPIRED: ['The sign-in link expired. Please try again.', '登录链接已过期，请重试。'],
  TAPNOW_SSO_INVALID: ['The sign-in response was not valid. Please try again.', '登录响应无效，请重试。'],
  TAPNOW_SSO_UNAVAILABLE: ['TapNow sign-in is unavailable right now. Please try again shortly.', 'TapNow 登录暂时不可用，请稍后再试。'],
  TAPNOW_SSO_PENDING_EXPIRED: ['Your invitation step timed out. Start again from TapNow.', '邀请步骤已超时，请从 TapNow 重新开始。'],
  TAPNOW_RECONCILE_UNAVAILABLE: ["Couldn't refresh your TapNow connection. Your work is kept.", '无法刷新 TapNow 连接，你的内容还在。'],
  TAPNOW_ACCOUNT_SWITCHED: ['You are now signed in with a different TapNow account.', '你已切换到另一个 TapNow 账号。'],
  TAPNOW_ACCOUNT_MISMATCH: ['This TapNow account does not match the one connected here.', '这个 TapNow 账号与此处连接的账号不一致。'],
  TAPNOW_RECONNECT_REQUIRED: ['Please reconnect your TapNow account.', '请重新连接 TapNow 账号。'],
  TAPNOW_TEAM_FOLLOWED: ['Your TapNow team was followed into Cinemap.', '已跟随你的 TapNow 团队进入 Cinemap。'],
  TAPNOW_UNAUTHORIZED: ['TapNow did not authorize this sign-in.', 'TapNow 未授权此次登录。'],
  TAPNOW_CONNECTION_REQUIRED: ['Sign in with TapNow to continue.', '请使用 TapNow 登录。'],
  TAPNOW_BALANCE_INSUFFICIENT: ['Not enough TapNow balance for this action.', 'TapNow 余额不足。'],
  CINEMAP_INVITE_REQUIRED: ['Enter your invitation code to join Cinemap.', '请输入邀请码加入 Cinemap。'],
  CINEMAP_INVITE_INVALID: ['That invitation code is not valid.', '邀请码无效。'],
  CINEMAP_ACCESS_REVOKED: ['Your access to Cinemap was revoked.', '你的 Cinemap 访问权限已被收回。'],
  LOGIN_INPUT_INVALID: ['Please check your account and password.', '请检查账号和密码。'],
  LOGIN_RATE_LIMITED: ['Too many attempts. Please wait a moment.', '尝试次数过多，请稍候。'],
  BOT_DETECTED: ['We could not verify this request.', '无法验证这个请求。'],
  IDENTITY_STORE_UNAVAILABLE: ['Sign-in is not configured in this environment.', '当前环境尚未配置登录。'],
  PROJECT_NOT_FOUND: ['This project does not exist or was removed.', '项目不存在或已删除。'],
};
const pick = (lang, pair, key) => {
  if (!pair) return undefined;
  if (lang === 'en') return pair[0];
  if (lang === 'zh') return pair[1];
  return packText(pair[0], lang, key) ?? pair[0];
};
export const uiText = (lang, key) => pick(lang, UI[key], key) ?? key;
export const errorText = (lang, code) => pick(lang, ERRORS[code], code);
export const hasErrorCopy = (code) => code in ERRORS;
