// 2026-11-09：青枔这台电脑此刻的状态：键鼠空闲多久、前台是否全屏、前台是什么程序。不截屏，不读窗口标题和内容。
// 只作为事实放进主动回合，要不要联系由她判断，程序不据此拦截。
// 级别写在 <DSH 主目录>/censhu-agency/presence.json：{"level":"app"} 含前台程序名（默认），"activity" 只有空闲和全屏，"off" 完全不读。
import {execFile} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = String.raw`
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
public static class CenshuPresence{
[StructLayout(LayoutKind.Sequential)]public struct L{public uint s;public uint t;}
[StructLayout(LayoutKind.Sequential)]public struct R{public int l,t,r,b;}
[StructLayout(LayoutKind.Sequential)]public struct M{public int s;public R m;public R w;public int f;}
[DllImport("user32.dll")]static extern bool GetLastInputInfo(ref L i);
[DllImport("kernel32.dll")]static extern uint GetTickCount();
[DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
[DllImport("user32.dll")]static extern bool GetWindowRect(IntPtr h,out R r);
[DllImport("user32.dll")]static extern IntPtr MonitorFromWindow(IntPtr h,uint f);
[DllImport("user32.dll",CharSet=CharSet.Auto)]static extern bool GetMonitorInfo(IntPtr h,ref M i);
public static uint Idle(){L l=new L();l.s=(uint)Marshal.SizeOf(l);if(!GetLastInputInfo(ref l))throw new Exception("idle");return unchecked(GetTickCount()-l.t)/1000;}
public static bool Full(IntPtr h){if(h==IntPtr.Zero)return false;R r;if(!GetWindowRect(h,out r))return false;M m=new M();m.s=Marshal.SizeOf(m);if(!GetMonitorInfo(MonitorFromWindow(h,2),ref m))return false;return r.l<=m.m.l&&r.t<=m.m.t&&r.r>=m.m.r&&r.b>=m.m.b;}
}
"@
$h=[CenshuPresence]::GetForegroundWindow();$p=[uint32]0;[void][CenshuPresence]::GetWindowThreadProcessId($h,[ref]$p)
$n='';if($p -gt 0){try{$n=(Get-Process -Id $p).ProcessName}catch{}}
$shell=@('explorer','ShellExperienceHost','SearchHost','LockApp') -contains $n
[Console]::Out.Write((@{idleSeconds=[CenshuPresence]::Idle();fullscreen=((-not $shell) -and [CenshuPresence]::Full($h));process=$n}|ConvertTo-Json -Compress))
`;
const encoded = Buffer.from(SOURCE, 'utf16le').toString('base64');
export const beijingNow = (now = Date.now()) => new Intl.DateTimeFormat('zh-CN', {timeZone: 'Asia/Shanghai', dateStyle: 'full', timeStyle: 'short', hourCycle: 'h23'}).format(now);
export function runProbe() {
  return new Promise((resolve, reject) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {windowsHide: true, timeout: 8000, maxBuffer: 65536}, (error, stdout) => error ? reject(error) : resolve(String(stdout))));
}
export function presenceLevel(home) {
  try { const level = JSON.parse(fs.readFileSync(path.join(home, 'censhu-agency', 'presence.json'), 'utf8')).level; if (['off', 'activity', 'app'].includes(level)) return level; } catch {}
  return 'app';
}
/** Turns the probe's output into what her turn sees. Anything malformed means no fact, never a guess. */
export function presenceFacts(text, level = 'app') {
  let raw; try { raw = JSON.parse(text); } catch { return null; }
  if (!Number.isFinite(raw?.idleSeconds) || raw.idleSeconds < 0 || typeof raw.fullscreen !== 'boolean') return null;
  const name = typeof raw.process === 'string' && /^[\w .+-]{1,60}$/.test(raw.process) ? raw.process : null;
  return {键鼠空闲分钟: Math.floor(raw.idleSeconds / 60), 前台全屏: raw.fullscreen, ...(level === 'app' && name ? {前台程序: name} : {}), 说明: '只是这台电脑上的信号。青枔可能在用手机或别的设备，空闲不等于人不在，全屏也不等于不想被打扰。要不要联系由你判断。'};
}
/** Null when switched off, not on Windows, or the probe fails: the turn simply goes on without it. */
export async function readPresence(home, {run = runProbe, platform = process.platform} = {}) {
  const level = presenceLevel(home);
  if (level === 'off' || platform !== 'win32') return null;
  try { return presenceFacts(await run(), level); } catch { return null; }
}
