'use strict';

const GDG = { blue: '#4285F4', red: '#EA4335', yellow: '#FBBC04', green: '#34A853' };
const GDG_LIST = [GDG.blue, GDG.red, GDG.yellow, GDG.green];
const CANVAS_FONT = '"Google Sans","Segoe UI",Roboto,system-ui,sans-serif';
const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

const GAMES = [];

const Util = {
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  todayKey(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },
  esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
};

const Store = {
  KEY: 'gdg-arcade:scores:v1',
  SKEY: 'gdg-arcade:settings:v1',
  _mem: [],
  _memSet: {},
  all() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return this._mem.slice(); }
  },
  save(list) {
    this._mem = list;
    try { localStorage.setItem(this.KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  },
  add(entry) { const l = this.all(); l.push(entry); this.save(l); },
  remove(id) { this.save(this.all().filter(s => s.id !== id)); },
  cmp: (a, b) => b.score - a.score || a.ts - b.ts,
  day(gameId, day = Util.todayKey()) {
    return this.all().filter(s => s.game === gameId && s.day === day).sort(this.cmp);
  },
  resetDay(day = Util.todayKey()) { this.save(this.all().filter(s => s.day !== day)); },
  settings() {
    try { return Object.assign({ sound: true, pin: '2468' }, JSON.parse(localStorage.getItem(this.SKEY)) || {}); }
    catch (e) { return Object.assign({ sound: true, pin: '2468' }, this._memSet); }
  },
  set(key, val) {
    const s = this.settings(); s[key] = val; this._memSet = s;
    try { localStorage.setItem(this.SKEY, JSON.stringify(s)); } catch (e) {}
  }
};
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

const Sound = {
  ctx: null,
  enabled: true,
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur = 0.12, type = 'sine', vol = 0.15, delay = 0, slideTo = null) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.03);
  },
  click() { this.tone(720, 0.05, 'sine', 0.08); },
  good() { this.tone(660, 0.09, 'triangle', 0.16); this.tone(990, 0.12, 'triangle', 0.13, 0.06); },
  perfect() { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.15, i * 0.05)); },
  bad() { this.tone(220, 0.25, 'sawtooth', 0.09, 0, 110); },
  pop() { this.tone(420, 0.08, 'square', 0.07, 0, 950); },
  catch() { this.tone(880, 0.07, 'triangle', 0.12, 0, 1200); },
  tick() { this.tone(880, 0.09, 'sine', 0.16); },
  lowTick() { this.tone(1200, 0.05, 'square', 0.05); },
  go() { this.tone(1320, 0.3, 'triangle', 0.2); },
  pad(i) { this.tone([330, 415, 494, 622][i], 0.32, 'triangle', 0.2); },
  end() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.15, i * 0.1)); }
};

function makeCanvas(stage) {
  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const view = { canvas, ctx, w: 1, h: 1, onResize: null };
  function fit() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = Math.max(1, r.width); view.h = Math.max(1, r.height);
    canvas.width = Math.round(view.w * dpr); canvas.height = Math.round(view.h * dpr);
    canvas.style.width = view.w + 'px'; canvas.style.height = view.h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (view.onResize) view.onResize();
  }
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(stage);
  view.pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  view.destroy = () => { ro.disconnect(); canvas.remove(); };
  return view;
}

class FX {
  constructor() { this.parts = []; this.texts = []; }
  burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = Util.rand(120, 420);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, age: 0, life: Util.rand(0.4, 0.8), r: Util.rand(3, 7), color });
    }
  }
  text(x, y, str, color = '#fff', size = 36) { this.texts.push({ x, y, str, color, size, age: 0, life: 0.9 }); }
  update(dt) {
    for (const p of this.parts) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 700 * dt; }
    for (const t of this.texts) { t.age += dt; t.y -= 70 * dt; }
    this.parts = this.parts.filter(p => p.age < p.life);
    this.texts = this.texts.filter(t => t.age < t.life);
  }
  draw(c) {
    for (const p of this.parts) {
      c.globalAlpha = 1 - p.age / p.life;
      c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
    }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const t of this.texts) {
      c.globalAlpha = Math.min(1, 2 * (1 - t.age / t.life));
      c.font = `900 ${t.size}px ${CANVAS_FONT}`;
      c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.55)';
      c.strokeText(t.str, t.x, t.y);
      c.fillStyle = t.color; c.fillText(t.str, t.x, t.y);
    }
    c.globalAlpha = 1;
  }
}

function floatText(parent, x, y, text, color) {
  const el = document.createElement('div');
  el.className = 'float-pts';
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = color;
  parent.appendChild(el);
  setTimeout(() => el.remove(), 850);
}
