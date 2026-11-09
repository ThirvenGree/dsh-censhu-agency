// 2026-11-08：主动回合（执行会话）里哪些工具调用要改为交给专用工作区，返回建议的 place；不用拦时返回 null。
// 只读的状态和资料工具不拦。重看也交给工作区：接管时 douyin_revisit_start / node bili.mjs revisit 只会留通知，不会真的交给重看会话。
const DOUYIN_READ_OK = new Set(['douyin_status', 'douyin_chat_status', 'douyin_chat_offers', 'douyin_notice_list', 'douyin_saved_videos', 'douyin_media_browse', 'douyin_recall', 'douyin_watched_search', 'douyin_watched_ask', 'douyin_remember', 'douyin_persona_status', 'douyin_diagnostics', 'douyin_video_limits_status', 'douyin_report_status', 'douyin_spark_status', 'douyin_media_status']);
const DOUYIN_SOCIAL = /^douyin_(chat_|notice_|social_note|spark_|browser_open)/;
// 2026-11-09：这里要写 bili.mjs 的命令名，不是脚本文件名。只读的 rcmd、search、video、comments、debrief 不拦。
const BILI_WATCH_CMDS = new Set(['view', 'watch-video', 'feed', 'like', 'fav', 'video-danmaku']);
const BILI_SOCIAL_CMDS = new Set(['dm', 'dm-read', 'dm-await', 'comment', 'comment-del', 'comment-await', 'watch', 'danmaku', 'await', 'dynamic', 'dynamic-image', 'dynamic-edit', 'ai-share']);
export function workspacePlaceFor(name, args = {}) {
  const base = String(name || '').replace(/^mcp__.+?__/, '');
  if (/^browser_(task|handoff|direct_)/.test(base) || /^bsk_/.test(base)) return 'browser';
  if (base === 'douyin_revisit_start') return 'douyin-revisit';
  if (/^douyin_/.test(base)) return DOUYIN_READ_OK.has(base) ? null : DOUYIN_SOCIAL.test(base) ? 'douyin-social' : 'douyin-watch';
  if (/^bili_(dm_view|media_save|media_remove)$/.test(base)) return 'bili-social';
  if (base === 'bili_view_frames') return 'bili-watch';
  const cmd = typeof args?.command === 'string' ? args.command : typeof args?.cmd === 'string' ? args.cmd : Array.isArray(args?.argv) ? args.argv.join(' ') : '';
  const m = /bili\.mjs["']?\s+([a-z][a-z-]*)/i.exec(cmd);
  if (m) { const sub = m[1].toLowerCase(); if (sub === 'revisit') return 'bili-revisit'; if (BILI_WATCH_CMDS.has(sub)) return 'bili-watch'; if (BILI_SOCIAL_CMDS.has(sub)) return 'bili-social'; }
  return null;
}
