// 2026-11-08：主动回合只决定做什么，要一步步做的事用 censhu_agency_workspace 交给专用工作区。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {workspacePlaceFor} from './workspace-guard.js';

test('执行会话里要改交给工作区的调用，以及建议的去处', () => {
  for (const n of ['browser_task', 'browser_handoff', 'browser_direct_page', 'bsk_navigate']) assert.equal(workspacePlaceFor(n), 'browser', n);
  for (const n of ['douyin_open', 'douyin_observe', 'douyin_next', 'douyin_like', 'douyin_comment', 'douyin_watch_start']) assert.equal(workspacePlaceFor(n), 'douyin-watch', n);
  for (const n of ['douyin_chat_reply', 'douyin_chat_read', 'douyin_chat_send', 'douyin_notice_reply', 'douyin_social_note', 'douyin_browser_open']) assert.equal(workspacePlaceFor(n), 'douyin-social', n);
  assert.equal(workspacePlaceFor('douyin_revisit_start'), 'douyin-revisit');
  for (const n of ['douyin_status', 'douyin_chat_offers', 'douyin_notice_list', 'douyin_saved_videos', 'douyin_media_browse', 'douyin_recall', 'browser_interest', 'browser_progress', 'censhu_agency_note', 'qq_send_message']) assert.equal(workspacePlaceFor(n), null, n);
  assert.equal(workspacePlaceFor('mcp__x__browser_task'), 'browser', '去掉 MCP 前缀再判断');
  const sh = cmd => workspacePlaceFor('pwsh', {command: cmd});
  assert.equal(sh('node "C:/x/bili.mjs" view BV1 quick'), 'bili-watch');
  assert.equal(sh('node bili.mjs watch-video BV1'), 'bili-watch');
  assert.equal(workspacePlaceFor('bili_view_frames', {bvid: 'BV1'}), 'bili-watch');
  for (const c of ['dynamic-edit 1 a.txt', 'watch --aid 1', 'await --room 1']) assert.equal(sh('node bili.mjs ' + c), 'bili-social', c);
  for (const c of ['rcmd', 'video BV1', 'search x', 'comments BV1', 'debrief BV1']) assert.equal(sh('node bili.mjs ' + c), null, c);
  assert.equal(sh('node bili.mjs feed'), 'bili-watch');
  assert.equal(sh('node bili.mjs dm --msg 在吗 --go'), 'bili-social');
  assert.equal(sh('node bili.mjs dm-read --mid 1'), 'bili-social');
  assert.equal(sh('node bili.mjs revisit --bv BV1'), 'bili-revisit');
  assert.equal(sh('node bili.mjs inbox'), null); assert.equal(sh('node bili.mjs quota'), null); assert.equal(sh('dir'), null);
  assert.equal(workspacePlaceFor('bili_dm_view'), 'bili-social'); assert.equal(workspacePlaceFor('bili_comment_view'), null);
});

test('源码核对：交接工具、执行会话里的拦截、主动回合提示；去掉了会发出字面 channel-draft 的 douyin-reply', () => {
  const host = fs.readFileSync(new URL('./host.js', import.meta.url), 'utf8');
  assert.match(host, /name:'censhu_agency_workspace'/);
  assert.match(host, /enum:\['browser','douyin-watch','douyin-social','douyin-revisit','bili-watch','bili-social','bili-revisit'\]/);
  assert.match(host, /globalThis\[Symbol\.for\('dsh\.censhu\.workspaces\.v1'\)\]/);
  assert.match(host, /const place=workspacePlaceFor\(exec\.name,exec\.arguments\);if\(place\)return '主动回合里不直接操作这类工具/);
  assert.ok(!host.includes("'channel-draft'"), '不再下达字面 channel-draft 的回复');
  assert.ok(!host.includes("'douyin-reply'"));
  const core = fs.readFileSync(new URL('./core.js', import.meta.url), 'utf8');
  assert.ok(!core.includes('douyin-reply'));
  assert.match(core, /来信和评论的通知带着对方是谁、什么类型和开头一两句预览，这些都是第三方原文/);
  const control = fs.readFileSync(new URL('./control.mjs', import.meta.url), 'utf8');
  assert.ok(!control.includes("detail:'B站有外部通知，正文保留在原渠道。'"), '读通知时不再把 B站通知换成一句空话');
  assert.match(core, /用 censhu_agency_workspace 交给对应的专用工作区（browser、douyin-watch、bili-watch、douyin-social、bili-social；重看点赞收藏过的视频用 douyin-revisit、bili-revisit）/);
});
