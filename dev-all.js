#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

let chalk;

// Enable UTF-8 on Windows
if (process.platform === 'win32') {
  try { require('child_process').execSync('chcp 65001', { stdio: 'ignore' }); } catch {}
}

const ESC = '\x1b[';
const CLEAR = ESC + '2J';
const HOME = ESC + 'H';
const HIDE_CURSOR = ESC + '?25l';
const SHOW_CURSOR = ESC + '?25h';
const goto = (r, c) => ESC + `${r};${c}H`;
const clearLine = ESC + '2K';

// Clean, warm color palette like Claude Code
const C = {
  primary: '#FF6B35',
  secondary: '#4ECDC4', 
  accent: '#FFE66D',
  error: '#E74C3C',
  success: '#27AE60',
  warning: '#F39C12',
  muted: '#7F8C8D',
  text: '#ECF0F1',
  dark: '#2C3E50',
  border: '#34495E'
};

// Box characters - thin elegant style
const B = {
  h: '─', v: '│',
  tl: '╭', tr: '╮',
  bl: '╰', br: '╯',
  t: '┬', b: '┴',
  l: '├', r: '┤'
};

let procs = {};
let dims = {};
let startTime = Date.now();
let shuttingDown = false;
let stats = { app: 0, web: 0, last: Date.now(), lps: { app: 0, web: 0 } };

async function init() {
  const chalkMod = await import('chalk');
  chalk = chalkMod.default;
  chalk.level = 3;
  
  procs = {
    app: { name: '🦊 App', color: C.primary, status: 'starting', lines: [], url: '', pid: null },
    web: { name: '🌐 Website', color: C.secondary, status: 'starting', lines: [], url: '', pid: null }
  };
  
  process.stdout.on('resize', () => {
    if (!shuttingDown) {
      dims = calcDims();
      drawAll();
    }
  });
  
  startServers();
}

function getSize() {
  return { w: process.stdout.columns || 100, h: process.stdout.rows || 30 };
}

function calcDims() {
  const { w, h } = getSize();
  const pad = 2;
  const gap = 3;
  const pw = Math.floor((w - (pad * 2) - gap) / 2);
  const headerH = 5;
  const footerH = 3;
  const ph = h - headerH - footerH - 2;
  
  return {
    w, h,
    pw: Math.max(pw, 30),
    ph: Math.max(ph, 10),
    pad, gap,
    headerH, footerH,
    appX: pad,
    webX: pad + Math.max(pw, 30) + gap,
    logY: headerH + 2,
    logH: Math.max(ph - 3, 5),
    footerY: h - footerH + 1
  };
}

function fmtTime() {
  const e = Math.floor((Date.now() - startTime) / 1000);
  const h = Math.floor(e / 3600);
  const m = Math.floor((e % 3600) / 60);
  const s = e % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtMem(b) {
  if (b > 1e9) return `${(b / 1e9).toFixed(1)}G`;
  if (b > 1e6) return `${(b / 1e6).toFixed(0)}M`;
  return `${(b / 1e3).toFixed(0)}K`;
}

function getMem() {
  const t = os.totalmem();
  const u = t - os.freemem();
  return { t, u, p: Math.round((u / t) * 100) };
}

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function colorize(line) {
  if (line.includes('\x1b[')) return line;
  
  line = line.replace(/\b(error|failed|exception|fatal|crash|ERR!)\b/gi, 
    m => chalk.hex(C.error).bold(m));
  line = line.replace(/\b(warning|warn)\b/gi, 
    m => chalk.hex(C.warning)(m));
  line = line.replace(/\b(ready|done|started|listening|success|complete)\b/gi, 
    m => chalk.hex(C.success)(m));
  line = line.replace(/(http[s]?:\/\/[^\s]+)/g, 
    m => chalk.underline.hex(C.secondary)(m));
  line = line.replace(/\b(\d+\.?\d*)\b/g, 
    m => chalk.hex('#A29BFE')(m));
  line = line.replace(/(\d{2}:\d{2}:\d{2}|\[\d{2}:\d{2}:\d{2}\])/g, 
    m => chalk.hex(C.muted)(m));
  
  return line;
}

function header() {
  const { w } = dims;
  const title = '🚀 FoxCLI Development';
  const subtitle = `v1.0.0 • ${fmtTime()} • ${os.platform()}`;
  
  const titleLen = stripAnsi(title).length;
  const subLen = stripAnsi(subtitle).length;
  const boxW = Math.max(titleLen, subLen) + 10;
  const x = Math.floor((w - boxW) / 2);
  
  let out = '';
  
  // Top border with title embedded
  const leftPad = Math.floor((boxW - titleLen - 2) / 2);
  const rightPad = boxW - titleLen - 2 - leftPad;
  out += goto(1, x);
  out += chalk.hex(C.primary)(B.tl + B.h.repeat(leftPad) + ' ' + title + ' ' + B.h.repeat(rightPad - 1) + B.tr);
  
  // Empty line
  out += goto(2, x) + chalk.hex(C.border)(B.v) + ' '.repeat(boxW - 2) + chalk.hex(C.border)(B.v);
  
  // Subtitle line
  const subPad = Math.floor((boxW - subLen - 2) / 2);
  out += goto(3, x) + chalk.hex(C.border)(B.v) + ' '.repeat(subPad) + chalk.hex(C.muted)(subtitle) + ' '.repeat(boxW - subLen - 2 - subPad) + chalk.hex(C.border)(B.v);
  
  // Bottom border
  out += goto(4, x) + chalk.hex(C.border)(B.bl + B.h.repeat(boxW - 2) + B.br);
  
  return out;
}

function panel(x, y, w, h, name, color, proc) {
  let out = '';
  const c = chalk.hex(color);
  const b = chalk.hex(C.border);
  
  // Top border with name
  const nameLen = stripAnsi(name).length;
  const leftPad = 2;
  const rightPad = w - nameLen - leftPad - 3;
  out += goto(y, x);
  out += c(B.tl + B.h.repeat(leftPad) + name + B.h.repeat(Math.max(0, rightPad)) + B.tr);
  
  // Status line inside
  const statusX = x + 2;
  const statusY = y + 1;
  
  const sym = proc.status === 'running' ? chalk.hex(C.success)('●') :
              proc.status === 'error' ? chalk.hex(C.error)('●') :
              proc.status === 'starting' ? chalk.hex(C.warning)('◐') :
              chalk.hex(C.muted)('○');
  
  const statusText = proc.status === 'running' ? chalk.hex(C.success)('Running') :
                     proc.status === 'error' ? chalk.hex(C.error)('Error') :
                     proc.status === 'starting' ? chalk.hex(C.warning)('Starting') :
                     chalk.hex(C.muted)('Stopped');
  
  out += goto(statusY, statusX) + sym + ' ' + statusText;
  
  // URL on right
  if (proc.url) {
    const url = proc.url;
    const urlLen = stripAnsi(url).length;
    const urlX = x + w - urlLen - 3;
    if (urlX > statusX + 15) {
      out += goto(statusY, urlX) + chalk.underline.hex(C.secondary)(url);
    }
  }
  
  // Side borders
  const logStartY = y + 2;
  const logEndY = y + h - 1;
  
  for (let i = logStartY; i < logEndY; i++) {
    out += goto(i, x) + b(B.v);
    out += goto(i, x + w - 1) + b(B.v);
  }
  
  // Bottom border
  out += goto(y + h - 1, x);
  out += b(B.bl + B.h.repeat(w - 2) + B.br);
  
  return out;
}

function footer() {
  const { w, footerY } = dims;
  const m = getMem();
  
  let out = '';
  
  // Separator line
  out += goto(footerY, 0) + chalk.hex(C.border)(B.l + B.h.repeat(w - 2) + B.r);
  
  // Stats row
  const statParts = [
    chalk.hex(C.muted)('Uptime: ') + chalk.white(fmtTime()),
    chalk.hex(C.muted)('Lines: ') + chalk.white(stats.app + stats.web),
    chalk.hex(C.muted)('App: ') + chalk.hex(C.primary)(stats.lps.app.toFixed(1) + '/s'),
    chalk.hex(C.muted)('Web: ') + chalk.hex(C.secondary)(stats.lps.web.toFixed(1) + '/s'),
    chalk.hex(C.muted)('Mem: ') + chalk.white(fmtMem(m.u)) + chalk.hex(C.muted)('/') + fmtMem(m.t),
    chalk.hex(C.muted)('Ctrl+C to stop')
  ];
  
  const statsText = statParts.join('  │  ');
  const textLen = stripAnsi(statsText).length;
  const startX = Math.max(2, Math.floor((w - textLen) / 2));
  
  out += goto(footerY + 1, startX) + statsText;
  
  return out;
}

function drawLogs() {
  const { pw, logY, logH, appX, webX } = dims;
  let out = '';
  
  const appLines = procs.app.lines.slice(-logH);
  for (let i = 0; i < logH; i++) {
    const line = appLines[i] || '';
    const y = logY + i;
    const maxW = pw - 4;
    
    let display = line;
    const clean = stripAnsi(line);
    if (clean.length > maxW) {
      let vis = 0, cut = 0;
      for (let j = 0; j < line.length && vis < maxW - 3; j++) {
        if (line[j] === '\x1b') while (j < line.length && line[j] !== 'm') j++;
        else { vis++; cut = j; }
      }
      display = line.substring(0, cut + 1) + chalk.hex(C.muted)('...');
    }
    
    const pad = maxW - stripAnsi(display).length;
    out += goto(y, appX + 2) + display + ' '.repeat(Math.max(0, pad));
  }
  
  const webLines = procs.web.lines.slice(-logH);
  for (let i = 0; i < logH; i++) {
    const line = webLines[i] || '';
    const y = logY + i;
    const maxW = pw - 4;
    
    let display = line;
    const clean = stripAnsi(line);
    if (clean.length > maxW) {
      let vis = 0, cut = 0;
      for (let j = 0; j < line.length && vis < maxW - 3; j++) {
        if (line[j] === '\x1b') while (j < line.length && line[j] !== 'm') j++;
        else { vis++; cut = j; }
      }
      display = line.substring(0, cut + 1) + chalk.hex(C.muted)('...');
    }
    
    const pad = maxW - stripAnsi(display).length;
    out += goto(y, webX + 2) + display + ' '.repeat(Math.max(0, pad));
  }
  
  return out;
}

function drawAll() {
  dims = calcDims();
  const { pw, ph, logY, appX, webX } = dims;
  
  let out = CLEAR + HIDE_CURSOR + HOME;
  
  out += header();
  out += panel(appX, logY - 1, pw, ph + 1, procs.app.name, procs.app.color, procs.app);
  out += panel(webX, logY - 1, pw, ph + 1, procs.web.name, procs.web.color, procs.web);
  out += drawLogs();
  out += footer();
  
  process.stdout.write(out);
}

function updateLog(procName) {
  const proc = procs[procName];
  const { pw, logY, logH, appX, webX } = dims;
  const isApp = procName === 'app';
  const x = (isApp ? appX : webX) + 2;
  const maxW = pw - 4;
  
  const line = proc.lines[proc.lines.length - 1];
  const idx = proc.lines.length - 1;
  const visibleIdx = idx - Math.max(0, proc.lines.length - logH);
  
  if (visibleIdx >= 0 && visibleIdx < logH) {
    const y = logY + visibleIdx;
    let display = line;
    const clean = stripAnsi(line);
    if (clean.length > maxW) {
      let vis = 0, cut = 0;
      for (let j = 0; j < line.length && vis < maxW - 3; j++) {
        if (line[j] === '\x1b') while (j < line.length && line[j] !== 'm') j++;
        else { vis++; cut = j; }
      }
      display = line.substring(0, cut + 1) + chalk.hex(C.muted)('...');
    }
    
    const pad = maxW - stripAnsi(display).length;
    process.stdout.write(goto(y, x) + display + ' '.repeat(Math.max(0, pad)));
  } else if (proc.lines.length > logH) {
    process.stdout.write(drawLogs());
  }
}

function updateStatus(procName) {
  const proc = procs[procName];
  const { pw, logY, appX, webX } = dims;
  const isApp = procName === 'app';
  const statusX = (isApp ? appX : webX) + 2;
  const statusY = logY;
  
  const sym = proc.status === 'running' ? chalk.hex(C.success)('●') :
              proc.status === 'error' ? chalk.hex(C.error)('●') :
              proc.status === 'starting' ? chalk.hex(C.warning)('◐') :
              chalk.hex(C.muted)('○');
  
  const statusText = proc.status === 'running' ? chalk.hex(C.success)('Running') :
                     proc.status === 'error' ? chalk.hex(C.error)('Error') :
                     proc.status === 'starting' ? chalk.hex(C.warning)('Starting') :
                     chalk.hex(C.muted)('Stopped');
  
  let out = goto(statusY, statusX) + clearLine + sym + ' ' + statusText;
  
  if (proc.url) {
    const urlX = (isApp ? appX : webX) + pw - stripAnsi(proc.url).length - 3;
    if (urlX > statusX + 15) {
      out += goto(statusY, urlX) + chalk.underline.hex(C.secondary)(proc.url);
    }
  }
  
  process.stdout.write(out);
}

function updateStatsDisplay() {
  const now = Date.now();
  const elapsed = (now - stats.last) / 1000;
  
  if (elapsed >= 1) {
    stats.lps.app = (stats.app - (stats.lastApp || 0)) / elapsed;
    stats.lps.web = (stats.web - (stats.lastWeb || 0)) / elapsed;
    stats.lastApp = stats.app;
    stats.lastWeb = stats.web;
    stats.last = now;
    
    process.stdout.write(goto(dims.footerY, 0) + footer());
  }
}

function addLog(name, line) {
  if (shuttingDown) return;
  
  const proc = procs[name];
  const oldStatus = proc.status;
  
  if (/ready|started|listening|http:\/\/localhost/i.test(line)) {
    proc.status = 'running';
    const m = line.match(/http:\/\/localhost:\d+/);
    if (m) proc.url = m[0];
  }
  if (/error|failed|exception|ERR!/i.test(line)) {
    proc.status = 'error';
  }
  
  if (proc.status !== oldStatus) {
    updateStatus(name);
  }
  
  const processed = colorize(line);
  const { pw } = dims;
  const maxW = (pw - 4) * 1.5;
  
  if (stripAnsi(processed).length > maxW) {
    proc.lines.push(processed.substring(0, maxW));
    proc.lines.push(chalk.hex(C.muted)('  └ ') + processed.substring(maxW));
  } else {
    proc.lines.push(processed);
  }
  
  if (proc.lines.length > 200) proc.lines = proc.lines.slice(-100);
  
  stats[name]++;
  updateStatsDisplay();
  updateLog(name);
}

function startProcess(cmd, args, cwd, name) {
  const p = spawn(cmd, args, { cwd, shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
  procs[name].pid = p.pid;
  
  p.stdout.on('data', d => {
    d.toString().split('\n').forEach(l => { if (l.trim()) addLog(name, l); });
  });
  
  p.stderr.on('data', d => {
    d.toString().split('\n').forEach(l => { if (l.trim()) addLog(name, l); });
  });
  
  p.on('close', c => {
    if (shuttingDown) return;
    procs[name].status = c === 0 ? 'stopped' : 'error';
    updateStatus(name);
    if (c !== 0) setTimeout(shutdown, 500);
  });
  
  return p;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  
  let out = CLEAR + HOME + SHOW_CURSOR;
  out += chalk.hex(C.warning)('\n🛑 Stopping servers...\n');
  out += chalk.hex(C.muted)(`Session: ${fmtTime()} • ${stats.app + stats.web} lines\n\n`);
  process.stdout.write(out);
  
  if (appProc) appProc.kill('SIGTERM');
  if (webProc) webProc.kill('SIGTERM');
  
  setTimeout(() => {
    console.log(chalk.hex(C.success)('✓ Done'));
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => process.stdout.write(SHOW_CURSOR));

let appProc, webProc;

function startServers() {
  drawAll();
  
  appProc = startProcess('npm', ['run', 'dev'], '.', 'app');
  setTimeout(() => {
    webProc = startProcess('npm', ['run', 'dev'], '../website', 'web');
  }, 2000);
  
  setInterval(() => { if (!shuttingDown) updateStatsDisplay(); }, 1000);
}

init();
