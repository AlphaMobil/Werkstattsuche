/* FitDuell – App-Logik (läuft komplett im Browser, Daten in localStorage) */
(function () {
  'use strict';
  const { GOALS, ACTIVITY, LEVELS, CATS, EXERCISES, PLANS, CHALLENGES, POINTS, DUEL_TYPES, FOODS } = window.FitData;
  const EX = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
  const COLORS = ['#D7FF3A', '#38D1FF', '#FF8A3D', '#B98CFF', '#3DDC84', '#FF6FA8', '#FFD24A'];
  const MEALS = { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snacks' };

  /* ---------- Hilfsfunktionen ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (n, d = 0) => Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = n => String(n).padStart(2, '0');
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
  const today = () => dateKey();
  const mondayOf = k => { const d = parseKey(k); return addDays(k, -((d.getDay() + 6) % 7)); };
  const weekDays = mon => Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
  function isoWeekNo(k) {
    const d = parseKey(k); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const w1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  }
  const fmtDate = k => parseKey(k).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const fmtShort = k => parseKey(k).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const initials = n => (String(n || '?').replace(/\(.*?\)/g, '').trim() || '?').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const avatar = (name, color, cls = '') => `<span class="avatar ${cls}" style="background:${esc(color || COLORS[0])}">${esc(initials(name))}</span>`;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('Speichern fehlgeschlagen (Speicher voll?)'); return false; } };

  function toast(msg, ms = 2600) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms);
  }

  async function hashPw(pw, salt) {
    const data = new TextEncoder().encode(salt + ':' + pw);
    if (window.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'h' + hash(salt + pw).toString(16) + hash(pw + salt).toString(16);
  }

  /* ---------- Speicher ---------- */
  const S = { u: null, tab: 'home', sub: {}, session: null, pedo: null };
  const users = () => lsGet('fx.users', []);
  const loadUser = id => lsGet('fx.u.' + id, null);
  function save() {
    if (!S.u) return;
    lsSet('fx.u.' + S.u.id, S.u);
    const list = users(); const i = list.findIndex(x => x.id === S.u.id);
    const entry = { id: S.u.id, name: S.u.profile.name, color: S.u.profile.color, email: S.u.profile.email };
    if (i >= 0) list[i] = entry; else list.push(entry);
    lsSet('fx.users', list);
  }

  /* ---------- Körperwerte ---------- */
  function age(p) { if (!p.birth) return 30; const b = parseKey(p.birth), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; }
  function calc(p) {
    const kg = +p.weightKg || 75, cm = +p.heightCm || 175, a = age(p);
    const bmi = kg / ((cm / 100) ** 2);
    const bmr = Math.round(10 * kg + 6.25 * cm - 5 * a + (p.sex === 'f' ? -161 : p.sex === 'd' ? -78 : 5));
    const tdee = Math.round(bmr * (+p.activity || 1.375));
    const g = GOALS[p.goal] || GOALS.lose;
    const kcal = Math.max(p.sex === 'f' ? 1200 : 1500, tdee + g.kcal);
    const protein = Math.round(kg * g.protein), fat = Math.round(kg * g.fat);
    const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const water = Math.round(kg * 35 / 250) * 250;
    let bmiTxt = 'Normalgewicht'; if (bmi < 18.5) bmiTxt = 'Untergewicht'; else if (bmi >= 30) bmiTxt = 'Adipositas'; else if (bmi >= 25) bmiTxt = 'Übergewicht';
    return { kg, cm, age: a, bmi, bmiTxt, bmr, tdee, kcal, protein, fat, carbs, water };
  }

  /* ---------- Training: Kennzahlen ---------- */
  function setStats(ex, s, bodyKg) {
    const e = EX[ex]; if (!e) return { vol: 0, sec: 0, kcal: 0 };
    const reps = +s.reps || 0, kg = +s.kg || 0;
    const sec = e.type === 'time' ? (+s.sec || 0) : reps * 3.5;
    const vol = e.type === 'reps' ? reps * (kg + (e.bw || 0) * bodyKg) : 0;
    const kcal = e.met * bodyKg * sec / 3600 * (e.type === 'reps' ? 1.5 : 1);
    return { vol, sec, kcal };
  }
  const isCardio = e => e && e.type === 'time' && ['Cardio', 'HYROX'].includes(e.cat) && e.id !== 'farmers';

  /** Tageszusammenfassung („Digest“) – gleiche Form für mich, lokale Konten, Code-Freunde und Demo-Freunde */
  function digestOf(u) {
    const days = {}; const bodyKg = +u.profile.weightKg || 75;
    const day = k => days[k] || (days[k] = { vol: 0, wo: 0, kcal: 0, steps: 0, min: 0, cardio: 0, water: 0, food: 0, reps: {}, sec: {}, max: {} });
    for (const w of u.workouts || []) {
      const d = day(w.date); d.wo++; d.min += w.min || 0; d.kcal += w.kcal || 0;
      for (const it of w.items) for (const s of it.sets) {
        const st = setStats(it.ex, s, bodyKg); d.vol += st.vol;
        const e = EX[it.ex]; if (!e) continue;
        if (e.type === 'reps') d.reps[it.ex] = (d.reps[it.ex] || 0) + (+s.reps || 0);
        else d.sec[it.ex] = (d.sec[it.ex] || 0) + (+s.sec || 0);
        if (+s.kg > 0) d.max[it.ex] = Math.max(d.max[it.ex] || 0, +s.kg);
        if (isCardio(e)) d.cardio += (+s.sec || 0) / 60;
      }
    }
    for (const [k, v] of Object.entries(u.steps || {})) day(k).steps += v;
    for (const [k, v] of Object.entries(u.water || {})) day(k).water += v;
    for (const [k, v] of Object.entries(u.food || {})) if (v.length) day(k).food = 1;
    return { id: u.id, name: u.profile.name, color: u.profile.color, goal: u.profile.goal, since: u.createdAt, days, weights: (u.weights || []).map(w => [w.d, w.kg]), at: Date.now() };
  }

  const DEMO = [
    { id: 'demo-max', name: 'Max (Demo)', color: '#38D1FF', goal: 'muscle', kg: 84, p: 0.5, steps: 8500 },
    { id: 'demo-lena', name: 'Lena (Demo)', color: '#FF6FA8', goal: 'hyrox', kg: 63, p: 0.6, steps: 10500 },
    { id: 'demo-tim', name: 'Tim (Demo)', color: '#FF8A3D', goal: 'lose', kg: 96, p: 0.38, steps: 7000 }
  ];
  const demoCache = {};
  function demoDigest(f) {
    const key = f.id + today() + new Date().getHours();
    if (demoCache[key]) return demoCache[key];
    const cfg = DEMO.find(d => d.id === f.id) || DEMO[0];
    const start = addDays(today(), -84); const days = {}; const weights = [];
    const frac = clamp((new Date().getHours() - 6) / 16, 0, 1);
    for (let i = 0; i <= 84; i++) {
      const k = addDays(start, i); const r = rng(hash(f.id + k)); const isToday = k === today();
      const d = { vol: 0, wo: 0, kcal: 0, steps: Math.round((cfg.steps * (0.5 + r())) * (isToday ? frac : 1)), min: 0, cardio: 0, water: Math.round(1600 + r() * 1700), food: r() < 0.75 ? 1 : 0, reps: {}, sec: {}, max: {} };
      if (r() < cfg.p && (!isToday || r() < frac)) {
        d.wo = 1; d.min = Math.round(35 + r() * 40); d.kcal = Math.round(d.min * (6 + r() * 4));
        d.vol = Math.round((cfg.goal === 'muscle' ? 5000 : 2200) * (0.6 + r() * 0.9));
        d.reps.pushup = Math.round(r() * 70); d.reps.squat = Math.round(r() * 90); d.reps.burpee = Math.round(r() * 35);
        d.sec.plank = Math.round(r() * 240); d.cardio = Math.round((cfg.goal === 'muscle' ? 8 : 25) * r() * 2);
        const prog = i * 0.06;
        d.max = { bench: Math.round(cfg.kg * 0.95 + prog), backsquat: Math.round(cfg.kg * 1.2 + prog), deadlift: Math.round(cfg.kg * 1.4 + prog), curl: Math.round(cfg.kg * 0.17 + prog / 6), ohp: Math.round(cfg.kg * 0.22 + prog / 5) };
      }
      days[k] = d;
      if (i % 3 === 0) weights.push([k, Math.round((cfg.kg - i * (cfg.goal === 'lose' ? 0.045 : cfg.goal === 'muscle' ? -0.012 : 0.01) + (r() - 0.5) * 0.8) * 10) / 10]);
    }
    return (demoCache[key] = { id: f.id, name: cfg.name, color: cfg.color, goal: cfg.goal, since: start, days, weights, demo: true, at: Date.now() });
  }

  function friendDigest(f) {
    if (f.kind === 'demo') return demoDigest(f);
    if (f.kind === 'local') { const u = loadUser(f.uid); return u ? digestOf(u) : null; }
    if (f.kind === 'code') return f.digest || null;
    return null;
  }

  /* ---------- Wochen-Challenge & Punkte ---------- */
  function challengeFor(mon) {
    const idx = Math.round((parseKey(mon) - new Date(2024, 0, 1)) / (7 * 864e5));
    return CHALLENGES[((idx * 7) % CHALLENGES.length + CHALLENGES.length) % CHALLENGES.length];
  }
  function sumDays(dg, keys) {
    const a = { vol: 0, wo: 0, kcal: 0, steps: 0, min: 0, cardio: 0, waterDays: 0, foodDays: 0, reps: {}, sec: {} };
    for (const k of keys) {
      const d = dg.days[k]; if (!d || k < dg.since) continue;
      for (const f of ['vol', 'wo', 'kcal', 'steps', 'min', 'cardio']) a[f] += d[f] || 0;
      if ((d.water || 0) >= 2500) a.waterDays++;
      if (d.food) a.foodDays++;
      for (const [e, v] of Object.entries(d.reps || {})) a.reps[e] = (a.reps[e] || 0) + v;
      for (const [e, v] of Object.entries(d.sec || {})) a.sec[e] = (a.sec[e] || 0) + v;
    }
    return a;
  }
  function chProgress(ch, a) {
    switch (ch.kind) {
      case 'reps': return a.reps[ch.ex] || 0;
      case 'sec': return a.sec[ch.ex] || 0;
      default: return a[ch.kind] || 0;
    }
  }
  function weekStats(dg, mon) {
    const keys = weekDays(mon); const a = sumDays(dg, keys); const ch = challengeFor(mon);
    const prog = chProgress(ch, a); const done = prog >= ch.target;
    const ended = keys[6] < today(); const eligible = dg.since <= mon;
    let status = done ? 'done' : ended ? (eligible ? 'failed' : 'grace') : 'open';
    if (!done && !ended && !eligible) status = 'grace-open';
    const base = a.wo * POINTS.workout + Math.floor(a.min / POINTS.perMinutes) + Math.floor(a.steps / POINTS.perSteps);
    const bonus = done ? POINTS.challengeDone : status === 'failed' ? POINTS.challengeFailed : 0;
    return { mon, a, ch, prog, done, ended, status, base, bonus, pts: base + bonus };
  }

  /* ---------- Duelle ---------- */
  function weightAt(dg, k, mode) {
    const ws = (dg.weights || []).slice().sort((x, y) => x[0] < y[0] ? -1 : 1);
    if (!ws.length) return null;
    if (mode === 'start') { const before = ws.filter(w => w[0] <= k); return (before.length ? before[before.length - 1] : ws.find(w => w[0] >= k) || ws[0])[1]; }
    const upto = ws.filter(w => w[0] <= k); return upto.length ? upto[upto.length - 1][1] : null;
  }
  function duelMetric(dg, d) {
    if (!dg) return 0;
    const end = d.end < today() ? d.end : today();
    if (d.type === 'loss') {
      const a = weightAt(dg, d.start, 'start'), b = weightAt(dg, end, 'end');
      return a != null && b != null ? Math.round((a - b) * 10) / 10 : 0;
    }
    let v = 0;
    for (let k = d.start; k <= end; k = addDays(k, 1)) {
      const day = dg.days[k]; if (!day) continue;
      if (d.type === 'max') v = Math.max(v, (day.max || {})[d.ex] || 0);
      else v += day[d.type] || 0;
    }
    return Math.round(v);
  }
  function duelState(d) {
    const f = S.u.friends.find(x => x.id === d.friendId);
    const me = duelMetric(digestOf(S.u), d); const fdg = f ? friendDigest(f) : null; const them = duelMetric(fdg, d);
    const over = d.end < today();
    let result = 'open'; if (over) result = me > them ? 'won' : me < them ? 'lost' : 'draw';
    return { f, fdg, me, them, over, result };
  }

  /* ---------- Rangliste ---------- */
  function participants() {
    const list = [{ me: true, dg: digestOf(S.u) }];
    for (const f of S.u.friends) { const dg = friendDigest(f); if (dg) list.push({ f, dg }); }
    return list;
  }
  function seasonWeeks() {
    const start = mondayOf(S.u.createdAt); const cur = mondayOf(today()); const out = [];
    for (let m = cur; m >= start && out.length < 12; m = addDays(m, -7)) out.push(m);
    return out;
  }
  function duelPointsFor(id, isMe) {
    let p = 0;
    for (const d of S.u.duels || []) {
      if (d.end >= today()) continue;
      if (!isMe && d.friendId !== id) continue;
      const st = duelState(d);
      const meWon = st.result === 'won', meLost = st.result === 'lost';
      if (isMe) p += meWon ? POINTS.duelWin : meLost ? POINTS.duelLoss : 0;
      else p += meLost ? POINTS.duelWin : meWon ? POINTS.duelLoss : 0;
    }
    return p;
  }
  function leaderboard() {
    const cur = mondayOf(today()); const weeks = seasonWeeks();
    return participants().map(p => {
      const w = weekStats(p.dg, cur);
      const total = weeks.reduce((s, m) => s + weekStats(p.dg, m).pts, 0) + duelPointsFor(p.me ? S.u.id : p.f.id, p.me);
      return { ...p, week: w, total };
    });
  }

  /* ---------- Freundes-Code ---------- */
  function b64u(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  async function pipe(bytes, stream) { const out = new Response(new Blob([bytes]).stream().pipeThrough(stream)); return new Uint8Array(await out.arrayBuffer()); }
  async function makeCode() {
    const dg = digestOf(S.u); const from = addDays(today(), -62); const days = {};
    for (const [k, d] of Object.entries(dg.days)) {
      if (k < from) continue;
      const c = {}; for (const [f, v] of Object.entries(d)) { if (typeof v === 'object') { if (Object.keys(v).length) c[f] = v; } else if (v) c[f] = Math.round(v); }
      if (Object.keys(c).length) days[k] = c;
    }
    const payload = { v: 1, id: S.u.id, name: dg.name, color: dg.color, goal: dg.goal, since: dg.since, days, weights: dg.weights.filter(w => w[0] >= from), at: Date.now() };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (window.CompressionStream) { try { return 'FX2.' + b64u(await pipe(bytes, new CompressionStream('deflate-raw'))); } catch { /* Fallback */ } }
    return 'FX1.' + b64u(bytes);
  }
  async function readCode(code) {
    code = code.trim().replace(/\s+/g, '');
    const [ver, data] = code.split('.');
    let bytes = unb64u(data || '');
    if (ver === 'FX2') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (ver !== 'FX1') throw new Error('Unbekanntes Format');
    const p = JSON.parse(new TextDecoder().decode(bytes));
    for (const d of Object.values(p.days)) { for (const f of ['vol', 'wo', 'kcal', 'steps', 'min', 'cardio', 'water', 'food']) d[f] = d[f] || 0; d.reps = d.reps || {}; d.sec = d.sec || {}; d.max = d.max || {}; }
    return p;
  }

  /* ---------- Modal ---------- */
  let modalCleanup = null;
  function openModal(html, onMount, onClose) {
    closeModal();
    $('#modalBody').innerHTML = html; $('#modal').hidden = false;
    $('#modal .sheet').scrollTop = 0;
    modalCleanup = onClose || null;
    if (onMount) onMount($('#modalBody'));
  }
  function closeModal() {
    if (modalCleanup) { const c = modalCleanup; modalCleanup = null; try { c(); } catch { /* ignorieren */ } }
    $('#modal').hidden = true; $('#modalBody').innerHTML = '';
  }
  $('#modalClose').onclick = closeModal;
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  function confirmBox(text, yes, cb) {
    openModal(`<h2>Bist du sicher?</h2><p class="muted">${esc(text)}</p><div class="grid2 mt"><button class="btn" data-x="no">Abbrechen</button><button class="btn danger" data-x="yes">${esc(yes)}</button></div>`, b => {
      b.querySelector('[data-x=no]').onclick = closeModal;
      b.querySelector('[data-x=yes]').onclick = () => { closeModal(); cb(); };
    });
  }

  /* ---------- Diagramme ---------- */
  function lineChart(pts, opt = {}) {
    const W = 340, H = 150, P = { l: 34, r: 10, t: 12, b: 22 };
    if (pts.length < 2) return `<div class="empty small">Noch zu wenige Daten – trage mehr Werte ein.</div>`;
    const ys = pts.map(p => p.y).concat(opt.target != null ? [opt.target] : []);
    let mn = Math.min(...ys), mx = Math.max(...ys); if (mx - mn < 2) { mn -= 1; mx += 1; }
    const pad = (mx - mn) * 0.12; mn -= pad; mx += pad;
    const X = i => P.l + (W - P.l - P.r) * i / (pts.length - 1), Y = v => P.t + (H - P.t - P.b) * (1 - (v - mn) / (mx - mn));
    let s = '';
    for (let g = 0; g <= 3; g++) { const v = mn + (mx - mn) * g / 3; s += `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="2" y="${Y(v) + 3}">${nf(v, opt.dec ?? 0)}</text>`; }
    if (opt.target != null) s += `<line class="tg" x1="${P.l}" x2="${W - P.r}" y1="${Y(opt.target)}" y2="${Y(opt.target)}"/>`;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    s += `<path class="ar" d="${d} L${X(pts.length - 1)} ${H - P.b} L${X(0)} ${H - P.b} Z"/><path class="ln" d="${d}"/>`;
    const step = Math.ceil(pts.length / 6);
    pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) s += `<text x="${X(i) - 12}" y="${H - 6}">${esc(p.x)}</text>`; });
    s += `<circle class="dot" r="4" cx="${X(pts.length - 1)}" cy="${Y(pts[pts.length - 1].y)}"/>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || 'Verlauf')}">${s}</svg>`;
  }
  function barChart(vals, labels, opt = {}) {
    const W = 340, H = 140, P = { l: 6, r: 6, t: 16, b: 20 };
    const mx = Math.max(1, ...vals, opt.target || 0) * 1.1; const n = vals.length; const bw = (W - P.l - P.r) / n;
    const Y = v => P.t + (H - P.t - P.b) * (1 - v / mx);
    let s = '';
    if (opt.target) s += `<line class="tg" x1="${P.l}" x2="${W - P.r}" y1="${Y(opt.target)}" y2="${Y(opt.target)}"/>`;
    vals.forEach((v, i) => {
      const x = P.l + i * bw + bw * 0.18, w = bw * 0.64, y = Y(v);
      const cls = v <= 0 ? 'b zero' : opt.target && opt.overBad && v > opt.target * 1.05 ? 'b over' : 'b';
      s += `<rect class="${cls}" x="${x}" y="${v <= 0 ? H - P.b - 2 : y}" width="${w}" height="${v <= 0 ? 2 : H - P.b - y}" rx="4"/>`;
      s += `<text x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${esc(labels[i])}</text>`;
      if (v > 0 && opt.showVals) s += `<text x="${x + w / 2}" y="${y - 4}" text-anchor="middle">${esc(opt.fmt ? opt.fmt(v) : nf(v))}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;
  }
  function ring(val, max, label, sub, color = 'var(--accent)', size = 120) {
    const r = 50, c = 2 * Math.PI * r, k = clamp(max ? val / max : 0, 0, 1);
    const col = max && val > max * 1.05 ? 'var(--orange)' : color;
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 120 120" width="${size}" height="${size}"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--line)" stroke-width="11"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${col}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - k)}"/></svg><div class="rv"><b>${label}</b><span>${sub}</span></div></div>`;
  }
  const bar = (v, max, cls = '') => `<div class="bar ${cls}"><i style="width:${clamp(max ? v / max * 100 : 0, 0, 100)}%"></i></div>`;

  /* ===================================================================== */
  /*  ANMELDUNG & REGISTRIERUNG                                            */
  /* ===================================================================== */
  const reg = { step: 0, d: {} };
  function showAuth(mode = 'login') {
    $('#app').hidden = true; $('#auth').hidden = false;
    const list = users();
    if (mode === 'login' && !list.length) mode = 'register';
    if (mode === 'login') return renderLogin(list);
    reg.step = 0; reg.d = { sex: 'm', activity: 1.375, level: 'beginner', days: 3, goal: 'lose', color: COLORS[Math.floor(Math.random() * COLORS.length)] };
    renderReg();
  }
  function authShell(inner) {
    return `<div class="auth-box"><div class="auth-hero"><div class="logo">⚡</div><h1>Fit<b>Duell</b></h1><p class="muted">Trainiere. Tracke. Schlag deine Freunde.</p></div>${inner}</div>`;
  }
  function renderLogin(list) {
    let sel = list[0]?.id;
    $('#auth').innerHTML = authShell(`<div class="card"><h3>Anmelden</h3><p class="muted small">Wähle dein Konto auf diesem Gerät.</p>
      <div id="accs">${list.map(a => `<button class="acc-tile ${a.id === sel ? 'on' : ''}" data-id="${a.id}">${avatar(a.name, a.color)}<div class="grow"><div class="t">${esc(a.name)}</div><div class="muted small">${esc(a.email || '')}</div></div></button>`).join('')}</div>
      <form id="loginForm" class="mt"><label class="f"><span>Passwort</span><input class="in" type="password" id="lpw" autocomplete="current-password" required></label>
      <button class="btn primary block">Anmelden</button></form></div>
      <button class="btn ghost block mt" id="toReg">＋ Neues Konto erstellen</button>`);
    $$('#accs .acc-tile').forEach(b => b.onclick = () => { sel = b.dataset.id; $$('#accs .acc-tile').forEach(x => x.classList.toggle('on', x === b)); $('#lpw').focus(); });
    $('#toReg').onclick = () => showAuth('register');
    $('#loginForm').onsubmit = async e => {
      e.preventDefault();
      const u = loadUser(sel); if (!u) return toast('Konto nicht gefunden');
      if (await hashPw($('#lpw').value, u.id) !== u.profile.pass) return toast('Falsches Passwort');
      startSession(u);
    };
  }

  const REG_STEPS = ['Konto', 'Körper', 'Aktivität', 'Ziel', 'Fertig'];
  function renderReg() {
    const d = reg.d, st = reg.step;
    const dots = `<div class="dots">${REG_STEPS.map((_, i) => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = '';
    if (st === 0) body = `<h3>1. Dein Konto</h3><p class="muted small">Damit dich deine Freunde in der Rangliste erkennen.</p>
      <label class="f mt"><span>Name / Spitzname</span><input class="in" id="r_name" value="${esc(d.name || '')}" maxlength="24" required autocomplete="nickname"></label>
      <label class="f"><span>E-Mail (optional)</span><input class="in" id="r_email" type="email" value="${esc(d.email || '')}" autocomplete="email"></label>
      <label class="f"><span>Passwort (mind. 4 Zeichen)</span><input class="in" id="r_pw" type="password" minlength="4" required autocomplete="new-password"></label>
      <div class="f"><span class="muted small">Profilfarbe</span><div class="row wrap mt-s" id="r_cols">${COLORS.map(c => `<button type="button" class="avatar ${c === d.color ? 'on' : ''}" data-c="${c}" style="background:${c};${c === d.color ? 'outline:3px solid #fff;' : ''}">${c === d.color ? '✓' : ''}</button>`).join('')}</div></div>`;
    if (st === 1) body = `<h3>2. Körperdaten</h3><p class="muted small">Für Kalorienbedarf, BMI und Trainingsvolumen.</p>
      <div class="seg mt" id="r_sex">${[['m', 'Männlich'], ['f', 'Weiblich'], ['d', 'Divers']].map(([v, l]) => `<button type="button" data-v="${v}" class="${d.sex === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="grid2 mt"><label class="f"><span>Geburtsdatum</span><input class="in" id="r_birth" type="date" value="${esc(d.birth || '1995-01-01')}" required></label>
      <label class="f"><span>Größe (cm)</span><input class="in" id="r_h" type="number" inputmode="numeric" min="120" max="230" value="${esc(d.heightCm || '')}" required></label>
      <label class="f"><span>Gewicht (kg)</span><input class="in" id="r_w" type="number" inputmode="decimal" step="0.1" min="35" max="300" value="${esc(d.weightKg || '')}" required></label>
      <label class="f"><span>Zielgewicht (kg)</span><input class="in" id="r_tw" type="number" inputmode="decimal" step="0.1" min="35" max="300" value="${esc(d.targetKg || '')}"></label>
      <label class="f"><span>Körperfett % (optional)</span><input class="in" id="r_bf" type="number" inputmode="decimal" step="0.1" min="3" max="60" value="${esc(d.bodyFat || '')}"></label>
      <label class="f"><span>Ruhepuls (optional)</span><input class="in" id="r_hr" type="number" inputmode="numeric" min="30" max="120" value="${esc(d.restHr || '')}"></label></div>`;
    if (st === 2) body = `<h3>3. Aktivität & Erfahrung</h3>
      <label class="f mt"><span>Alltagsaktivität</span><select class="in" id="r_act">${ACTIVITY.map(a => `<option value="${a.id}" ${+d.activity === a.id ? 'selected' : ''}>${a.label}</option>`).join('')}</select></label>
      <label class="f"><span>Trainingserfahrung</span><select class="in" id="r_lvl">${Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${d.level === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f"><span>Trainingstage pro Woche: <b id="r_dv">${d.days}</b></span><input type="range" id="r_days" min="1" max="7" value="${d.days}" style="width:100%"></label>
      <label class="f"><span>Tägliches Schrittziel</span><input class="in" id="r_steps" type="number" inputmode="numeric" step="500" value="${esc(d.stepGoal || 10000)}"></label>
      <label class="f"><span>Verletzungen / Einschränkungen (optional)</span><textarea class="in" id="r_inj" placeholder="z. B. Knieprobleme links">${esc(d.injuries || '')}</textarea></label>`;
    if (st === 3) body = `<h3>4. Was möchtest du erreichen?</h3><p class="muted small">Bestimmt deinen Trainingsplan und deine Kalorienziele. Jederzeit änderbar.</p><div class="mt" id="r_goals">${Object.entries(GOALS).map(([k, g]) => `<button type="button" class="goal-card ${d.goal === k ? 'on' : ''}" data-g="${k}"><span class="gi">${g.icon}</span><span><b>${g.label}</b><br><span class="muted small">${g.desc}</span></span></button>`).join('')}</div>`;
    if (st === 4) {
      const c = calc(d);
      body = `<h3>5. Dein Startprofil</h3><div class="grid2 mt">
        <div class="stat"><div class="v">${nf(c.bmi, 1)}</div><div class="l">BMI · ${c.bmiTxt}</div></div>
        <div class="stat"><div class="v">${nf(c.bmr)}</div><div class="l">Grundumsatz kcal</div></div>
        <div class="stat"><div class="v">${nf(c.tdee)}</div><div class="l">Gesamtumsatz kcal</div></div>
        <div class="stat"><div class="v accent">${nf(c.kcal)}</div><div class="l">Tagesziel kcal</div></div>
        <div class="stat"><div class="v">${c.protein} g</div><div class="l">Protein / Tag</div></div>
        <div class="stat"><div class="v">${nf(c.water / 1000, 1)} l</div><div class="l">Wasser / Tag</div></div></div>
        <p class="muted small mt">Ziel: <b>${GOALS[d.goal].icon} ${GOALS[d.goal].label}</b> · ${d.days}× Training pro Woche. Wir legen dir drei Demo-Freunde an, damit du die Rangliste direkt ausprobieren kannst.</p>`;
    }
    const nav = `<div class="grid2 mt">${st > 0 ? '<button type="button" class="btn" id="r_back">Zurück</button>' : (users().length ? '<button type="button" class="btn" id="r_login">Zur Anmeldung</button>' : '<span></span>')}<button class="btn primary">${st === 4 ? 'Los geht\'s 🚀' : 'Weiter'}</button></div>`;
    $('#auth').innerHTML = authShell(`${dots}<form class="card" id="regForm">${body}${nav}</form>`);
    const f = $('#regForm');
    $$('#r_cols [data-c]').forEach(b => b.onclick = () => { collect(); d.color = b.dataset.c; renderReg(); });
    $$('#r_sex [data-v]').forEach(b => b.onclick = () => { d.sex = b.dataset.v; $$('#r_sex button').forEach(x => x.classList.toggle('on', x === b)); });
    $$('#r_goals [data-g]').forEach(b => b.onclick = () => { d.goal = b.dataset.g; $$('#r_goals .goal-card').forEach(x => x.classList.toggle('on', x === b)); });
    if ($('#r_days')) $('#r_days').oninput = e => { $('#r_dv').textContent = e.target.value; };
    if ($('#r_back')) $('#r_back').onclick = () => { collect(); reg.step--; renderReg(); };
    if ($('#r_login')) $('#r_login').onclick = () => showAuth('login');
    function collect() {
      const v = id => $('#' + id)?.value;
      if (st === 0) { d.name = v('r_name')?.trim(); d.email = v('r_email')?.trim(); if (v('r_pw')) d.pw = v('r_pw'); }
      if (st === 1) { d.birth = v('r_birth'); d.heightCm = +v('r_h'); d.weightKg = +v('r_w'); d.targetKg = +v('r_tw') || null; d.bodyFat = +v('r_bf') || null; d.restHr = +v('r_hr') || null; }
      if (st === 2) { d.activity = +v('r_act'); d.level = v('r_lvl'); d.days = +v('r_days'); d.stepGoal = +v('r_steps') || 10000; d.injuries = v('r_inj'); }
    }
    f.onsubmit = async e => {
      e.preventDefault(); collect();
      if (st === 0 && users().some(x => x.name.toLowerCase() === (d.name || '').toLowerCase())) return toast('Name ist auf diesem Gerät schon vergeben');
      if (st < 4) { reg.step++; return renderReg(); }
      const id = uid();
      const profile = { name: d.name, email: d.email || '', pass: await hashPw(d.pw, id), color: d.color, sex: d.sex, birth: d.birth, heightCm: d.heightCm, weightKg: d.weightKg, targetKg: d.targetKg, bodyFat: d.bodyFat, restHr: d.restHr, activity: d.activity, level: d.level, days: d.days, stepGoal: d.stepGoal, injuries: d.injuries, goal: d.goal };
      const u = { id, v: 1, createdAt: today(), profile, favorites: [], workouts: [], weights: [{ d: today(), kg: d.weightKg }], steps: {}, water: {}, food: {}, duels: [], friends: DEMO.map(x => ({ id: x.id, kind: 'demo' })), planIdx: 0, seen: {} };
      S.u = u; save(); startSession(u); toast(`Willkommen, ${d.name}! 💪`);
    };
  }

  function startSession(u) {
    S.u = u; localStorage.setItem('fx.session', u.id);
    u.seen = u.seen || {}; u.friends = u.friends || []; u.duels = u.duels || [];
    $('#auth').hidden = true; $('#app').hidden = false;
    $('#profileBtn').innerHTML = avatar(u.profile.name, u.profile.color);
    S.session = u.activeSession || null;
    go(S.tab || 'home');
    setTimeout(checkWeekResult, 400);
  }
  function logout() { stopPedo(); S.u = null; localStorage.removeItem('fx.session'); closeModal(); showAuth('login'); }

  /** Meldung zur abgelaufenen Wochen-Challenge (einmalig pro Woche) */
  function checkWeekResult() {
    const last = addDays(mondayOf(today()), -7); if (S.u.seen[last]) return;
    const ws = weekStats(digestOf(S.u), last); S.u.seen[last] = 1; save();
    if (ws.status === 'failed') openModal(`<div class="center"><div style="font-size:54px">😬</div><h2>Challenge verpasst</h2><p class="muted">Letzte Woche (KW ${isoWeekNo(last)}) hast du „${esc(ws.ch.title)}" nicht geschafft: ${nf(ws.prog)} / ${nf(ws.ch.target)} ${esc(ws.ch.unit)}.</p><div class="big bad">${POINTS.challengeFailed} Punkte</div><p class="muted small">Die neue Challenge wartet schon – hol dir die Punkte zurück!</p><button class="btn primary block mt" id="okb">Neue Challenge ansehen</button></div>`, b => { b.querySelector('#okb').onclick = () => { closeModal(); go('home'); }; });
    else if (ws.status === 'done') openModal(`<div class="center"><div style="font-size:54px">🏅</div><h2>Challenge geschafft!</h2><p class="muted">KW ${isoWeekNo(last)}: „${esc(ws.ch.title)}" erledigt.</p><div class="big good">+${POINTS.challengeDone} Punkte</div><button class="btn primary block mt" id="okb">Weiter</button></div>`, b => { b.querySelector('#okb').onclick = closeModal; });
  }

  /* ===================================================================== */
  /*  NAVIGATION                                                           */
  /* ===================================================================== */
  const VIEWS = {};
  function go(tab, sub) {
    S.tab = tab; if (sub !== undefined) S.sub[tab] = sub;
    $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('#view').innerHTML = ''; VIEWS[tab]($('#view')); window.scrollTo(0, 0);
  }
  const rerender = () => { const y = window.scrollY; VIEWS[S.tab]($('#view')); window.scrollTo(0, y); };
  $$('#tabbar button').forEach(b => b.onclick = () => go(b.dataset.tab));
  $('#profileBtn').onclick = () => openProfile();

  /* ===================================================================== */
  /*  START                                                                */
  /* ===================================================================== */
  function challengeCard(ws, compact) {
    const ch = ws.ch; const end = parseKey(addDays(ws.mon, 7)); const left = end - new Date();
    const dl = Math.floor(left / 864e5), hl = Math.floor(left % 864e5 / 36e5);
    const pct = clamp(ws.prog / ch.target * 100, 0, 100);
    const danger = !ws.done && dl <= 1 && ws.status !== 'grace-open';
    return `<div class="card ${ws.done ? 'hl' : danger ? 'danger' : 'hl'}">
      <div class="row between"><span class="pill acc">Wochen-Challenge · KW ${isoWeekNo(ws.mon)}</span><span class="pill ${ws.done ? 'ok' : danger ? 'no' : ''}">${ws.done ? '✓ geschafft' : `⏳ ${dl} T ${hl} Std`}</span></div>
      <div class="row mt"><div style="font-size:38px">${ch.icon}</div><div class="grow"><h3>${esc(ch.title)}</h3><div class="muted small">${esc(ch.desc)}</div></div></div>
      <div class="row between mt small"><b>${nf(ch.kind === 'cardio' ? ws.prog : ws.prog)} / ${nf(ch.target)} ${esc(ch.unit)}</b><span class="muted">${Math.round(pct)} %</span></div>
      <div class="mt-s">${bar(ws.prog, ch.target, ws.done ? 'green' : danger ? 'red' : '')}</div>
      ${compact ? '' : `<p class="small muted mt-s">${ws.done ? `Stark! <b class="good">+${POINTS.challengeDone} Punkte</b> sind dir sicher.` : ws.status === 'grace-open' ? 'Deine erste Woche ist straffrei – probier\'s trotzdem!' : `Schaffst du sie nicht bis Sonntag, gibt es <b class="bad">${POINTS.challengeFailed} Punkte</b> in der Wertung gegen deine Freunde.`}</p>`}
    </div>`;
  }

  VIEWS.home = v => {
    const u = S.u, p = u.profile, c = calc(p), t = today();
    const dg = digestOf(u); const d = dg.days[t] || { kcal: 0, steps: 0, wo: 0, min: 0 };
    const eaten = (u.food[t] || []).reduce((s, x) => s + x.kcal, 0);
    const ws = weekStats(dg, mondayOf(t));
    const lb = leaderboard().sort((a, b) => b.week.pts - a.week.pts);
    const myPos = lb.findIndex(x => x.me) + 1;
    const plan = PLANS[p.goal][(u.planIdx || 0) % PLANS[p.goal].length];
    const active = (u.duels || []).filter(x => x.end >= t);
    const h = new Date().getHours();
    v.innerHTML = `
      <div class="row between"><div><div class="muted small">${h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend'}</div><h2>${esc(p.name)} ${GOALS[p.goal].icon}</h2></div>
      <span class="pill acc">${GOALS[p.goal].label}</span></div>
      ${S.session ? `<div class="card hl mt"><div class="row between"><div><b>Training läuft</b><div class="muted small">${esc(S.session.title)}</div></div><button class="btn primary sm" id="resume">Fortsetzen</button></div></div>` : ''}
      <div class="mt">${challengeCard(ws)}</div>
      <div class="card"><div class="row between"><h3>Heute</h3><span class="muted small">${fmtDate(t)}</span></div>
        <div class="row mt" style="justify-content:space-around;flex-wrap:wrap;gap:14px">
          ${ring(eaten, c.kcal, nf(eaten), `von ${nf(c.kcal)} kcal`, 'var(--accent)', 112)}
          ${ring(d.steps, p.stepGoal || 10000, nf(d.steps), 'Schritte', 'var(--accent2)', 112)}
          ${ring(d.kcal, 400, nf(d.kcal), 'kcal verbrannt', 'var(--orange)', 112)}
        </div></div>
      <div class="card"><div class="row between"><div><div class="muted small">Nächstes Training</div><h3>${esc(plan.name)}</h3><div class="muted small">${plan.items.length} Übungen · ${plan.items.map(i => EX[i[0]].name).slice(0, 3).join(', ')} …</div></div>
        <button class="btn primary" id="startPlan">▶ Start</button></div></div>
      <div class="card"><div class="row between"><h3>Wertung diese Woche</h3><button class="btn sm ghost" id="toFriends">Alle ›</button></div>
        <div class="row mt"><div class="big">#${myPos}</div><div class="grow muted small">von ${lb.length} · ${nf(ws.pts)} Punkte<br>${lb[0] && !lb[0].me ? `Spitze: ${esc(lb[0].dg.name)} mit ${nf(lb[0].week.pts)}` : 'Du führst! 🔥'}</div></div></div>
      ${active.length ? `<div class="card"><h3>Laufende Duelle</h3>${active.map(duelRow).join('')}</div>` : ''}
      <div class="grid2 mt">
        <button class="btn" id="qWeight">⚖️ Gewicht</button><button class="btn" id="qWater">💧 +250 ml</button>
        <button class="btn" id="qScan">📷 Essen scannen</button><button class="btn" id="qLog">✍️ Einheit eintragen</button>
      </div>`;
    $('#resume') && ($('#resume').onclick = openSession);
    $('#startPlan').onclick = () => startPlanSession();
    $('#toFriends').onclick = () => go('friends');
    $('#qWeight').onclick = weightModal;
    $('#qWater').onclick = () => { addWater(250); rerender(); };
    $('#qScan').onclick = () => openAddFood(today(), 'scan');
    $('#qLog').onclick = () => quickLog();
    bindDuelRows(v);
  };

  /* ===================================================================== */
  /*  TRAINING                                                             */
  /* ===================================================================== */
  VIEWS.training = v => {
    const sub = S.sub.training || 'plan';
    v.innerHTML = `<h2>Training</h2><div class="seg mt" id="tseg">${[['plan', 'Mein Plan'], ['lib', 'Übungen'], ['fav', 'Favoriten ★']].map(([k, l]) => `<button data-k="${k}" class="${sub === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="tbody" class="mt"></div>`;
    $$('#tseg button').forEach(b => b.onclick = () => go('training', b.dataset.k));
    const body = $('#tbody');
    if (sub === 'plan') renderPlans(body);
    else renderLibrary(body, sub === 'fav');
  };

  function renderPlans(body) {
    const g = S.u.profile.goal; const plans = PLANS[g]; const next = (S.u.planIdx || 0) % plans.length;
    body.innerHTML = `<div class="card"><div class="row"><div style="font-size:34px">${GOALS[g].icon}</div><div class="grow"><b>${GOALS[g].label}</b><div class="muted small">${GOALS[g].desc}</div></div><button class="btn sm" id="chGoal">Ändern</button></div>
      <p class="small muted mt-s">${S.u.profile.days}× pro Woche geplant · Einheiten rotieren automatisch.</p></div>
      ${plans.map((p, i) => `<div class="card ${i === next ? 'hl' : ''}"><div class="row between"><div><span class="pill ${i === next ? 'acc' : ''}">${i === next ? 'Als Nächstes' : 'Einheit ' + String.fromCharCode(65 + i)}</span><h3 class="mt-s">${esc(p.name)}</h3></div><button class="btn ${i === next ? 'primary' : ''} sm" data-start="${i}">▶ Start</button></div>
        <div class="list mt-s">${p.items.map(([id, sets, n]) => { const e = EX[id]; return `<div class="li" data-ex="${id}" style="cursor:pointer"><div style="width:58px;flex:none">${FigureAnim.still(e.anim)}</div><div class="grow"><div class="t">${esc(e.name)}</div><div class="muted small">${sets} × ${e.type === 'time' ? fmtSec(n) : n + ' Wdh.'}</div></div><span class="muted">›</span></div>`; }).join('')}</div></div>`).join('')}
      <div class="card"><h3>Eigenes Training</h3><p class="muted small">Stelle dir aus deinen Favoriten ein Training zusammen oder trage eine einzelne Einheit nach.</p>
      <div class="grid2 mt"><button class="btn" id="favWorkout">★ Favoriten-Training</button><button class="btn" id="logOne">✍️ Nachtragen</button></div></div>`;
    $$('[data-start]', body).forEach(b => b.onclick = () => startPlanSession(+b.dataset.start));
    $$('[data-ex]', body).forEach(b => b.onclick = () => openExercise(b.dataset.ex));
    $('#chGoal').onclick = goalModal;
    $('#favWorkout').onclick = () => {
      if (!S.u.favorites.length) return toast('Markiere zuerst Übungen mit ★ als Favorit');
      startSession2('Favoriten-Training', S.u.favorites.map(id => [id, 3, EX[id].type === 'time' ? 45 : 12]));
    };
    $('#logOne').onclick = () => quickLog();
  }
  const fmtSec = s => s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}:${pad(s % 60)} Min` : `${s / 60} Min`) : `${s} Sek`;

  function renderLibrary(body, favOnly) {
    const f = S.sub.libFilter || { q: '', cat: 'Alle', goal: 'alle' };
    S.sub.libFilter = f;
    body.innerHTML = `<input class="in" id="q" placeholder="🔍 Übung oder Muskel suchen" value="${esc(f.q)}">
      <div class="chips mt" id="cats">${['Alle', ...CATS].map(c => `<button class="chip ${f.cat === c ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
      <div class="chips mt-s" id="goals"><button class="chip ${f.goal === 'alle' ? 'on' : ''}" data-g="alle">Alle Ziele</button>${Object.entries(GOALS).map(([k, g]) => `<button class="chip ${f.goal === k ? 'on' : ''}" data-g="${k}">${g.icon} ${g.label}</button>`).join('')}</div>
      <div class="ex-grid mt" id="exg"></div>`;
    const draw = () => {
      const q = f.q.toLowerCase();
      const list = EXERCISES.filter(e => (!favOnly || S.u.favorites.includes(e.id)) && (f.cat === 'Alle' || e.cat === f.cat) && (f.goal === 'alle' || e.goals.includes(f.goal)) && (!q || (e.name + ' ' + e.muscles + ' ' + e.equip).toLowerCase().includes(q)));
      $('#exg').innerHTML = list.length ? list.map(e => `<div class="ex-card" data-ex="${e.id}" role="button" tabindex="0">${FigureAnim.still(e.anim)}<button class="fav ${S.u.favorites.includes(e.id) ? 'on' : ''}" data-fav="${e.id}" aria-label="Favorit">${S.u.favorites.includes(e.id) ? '★' : '☆'}</button><div class="n">${esc(e.name)}</div><div class="m">${esc(e.cat)} · ${esc(e.muscles.split(',')[0])}</div></div>`).join('')
        : `<div class="empty" style="grid-column:1/-1">${favOnly ? 'Noch keine Favoriten. Tippe in der Übungsliste auf ☆.' : 'Keine Übung gefunden.'}</div>`;
      $$('#exg [data-ex]').forEach(c => c.onclick = e => { if (e.target.closest('[data-fav]')) return; openExercise(c.dataset.ex); });
      $$('#exg [data-fav]').forEach(b => b.onclick = () => { toggleFav(b.dataset.fav); draw(); });
    };
    $('#q').oninput = e => { f.q = e.target.value; draw(); };
    $$('#cats .chip').forEach(b => b.onclick = () => { f.cat = b.dataset.c; $$('#cats .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $$('#goals .chip').forEach(b => b.onclick = () => { f.goal = b.dataset.g; $$('#goals .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    draw();
  }
  function toggleFav(id) {
    const fav = S.u.favorites; const i = fav.indexOf(id);
    if (i >= 0) { fav.splice(i, 1); toast('Aus Favoriten entfernt'); } else { fav.push(id); toast('★ Zu Favoriten hinzugefügt'); }
    save();
  }

  function openExercise(id) {
    const e = EX[id]; let ctl;
    const best = bestFor(id);
    openModal(`<h2>${esc(e.name)}</h2><div class="row wrap mt-s"><span class="pill">${esc(e.cat)}</span><span class="pill">${'●'.repeat(e.level)}${'○'.repeat(3 - e.level)} ${['', 'Leicht', 'Mittel', 'Schwer'][e.level]}</span>${e.goals.map(g => `<span class="pill">${GOALS[g].icon} ${GOALS[g].label}</span>`).join('')}</div>
      <div class="anim-box mt" id="animBox"></div>
      <div class="row mt-s"><button class="icon-btn" id="pp" aria-label="Pause">⏸</button><div class="seg grow" id="spd"><button data-s="0.5">0,5×</button><button data-s="1" class="on">1×</button><button data-s="1.5">1,5×</button></div><button class="icon-btn ${S.u.favorites.includes(id) ? 'on' : ''}" id="favb" aria-label="Favorit">${S.u.favorites.includes(id) ? '★' : '☆'}</button></div>
      <div class="grid2 mt"><div class="stat"><div class="l">Muskeln</div><div class="small"><b>${esc(e.muscles)}</b></div></div><div class="stat"><div class="l">Equipment</div><div class="small"><b>${esc(e.equip)}</b></div></div></div>
      <h3 class="mt">So geht's</h3><ol class="steps">${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <p class="small"><b class="accent">Tipp:</b> ${esc(e.tips)}</p>
      ${best ? `<p class="small muted">Deine Bestleistung: <b>${esc(best)}</b></p>` : ''}
      <div class="grid2 mt"><button class="btn" id="logEx">✍️ Satz eintragen</button><button class="btn primary" id="trainEx">▶ Jetzt trainieren</button></div>`,
    b => {
      ctl = FigureAnim.play(b.querySelector('#animBox'), e.anim);
      b.querySelector('#pp').onclick = ev => { ev.currentTarget.textContent = ctl.toggle() ? '⏸' : '▶'; };
      $$('#spd button', b).forEach(x => x.onclick = () => { ctl.setSpeed(+x.dataset.s); $$('#spd button', b).forEach(y => y.classList.toggle('on', y === x)); });
      b.querySelector('#favb').onclick = ev => { toggleFav(id); const on = S.u.favorites.includes(id); ev.currentTarget.textContent = on ? '★' : '☆'; ev.currentTarget.classList.toggle('on', on); if (S.tab === 'training') rerender(); };
      b.querySelector('#logEx').onclick = () => quickLog(id);
      b.querySelector('#trainEx').onclick = () => { closeModal(); startSession2(e.name, [[id, 3, e.type === 'time' ? 45 : 12]]); };
    }, () => ctl && ctl.stop());
  }
  function bestFor(id) {
    const e = EX[id]; let best = 0;
    for (const w of S.u.workouts) for (const it of w.items) if (it.ex === id) for (const s of it.sets) best = Math.max(best, e.type === 'time' ? +s.sec || 0 : (+s.kg || 0) > 0 ? +s.kg : +s.reps || 0);
    if (!best) return '';
    if (e.type === 'time') return fmtSec(best);
    const hasKg = S.u.workouts.some(w => w.items.some(it => it.ex === id && it.sets.some(s => +s.kg > 0)));
    return hasKg ? `${nf(best, 1)} kg` : `${best} Wdh.`;
  }
  function lastKg(id) {
    for (let i = S.u.workouts.length - 1; i >= 0; i--) for (const it of S.u.workouts[i].items) if (it.ex === id) { const s = it.sets.filter(x => +x.kg > 0); if (s.length) return +s[s.length - 1].kg; }
    return 0;
  }

  /* ---------- Trainings-Session ---------- */
  function startPlanSession(i) {
    const plans = PLANS[S.u.profile.goal]; const idx = i ?? ((S.u.planIdx || 0) % plans.length);
    startSession2(plans[idx].name, plans[idx].items, idx);
  }
  function startSession2(title, items, planIdx) {
    if (S.session && !confirm('Es läuft bereits ein Training. Verwerfen und neu starten?')) return openSession();
    S.session = { title, planIdx, started: Date.now(), cur: 0, items: items.map(([ex, sets, n]) => ({ ex, sets: Array.from({ length: sets }, () => EX[ex].type === 'time' ? { sec: n, done: false } : { reps: n, kg: lastKg(ex) || '', done: false }) })) };
    persistSession(); openSession();
  }
  const persistSession = () => { S.u.activeSession = S.session; save(); };
  let restTimer = null, setTimerRef = null;
  function openSession() {
    const s = S.session; if (!s) return;
    let ctl;
    const draw = () => {
      const it = s.items[s.cur]; const e = EX[it.ex];
      const doneSets = s.items.reduce((n, x) => n + x.sets.filter(y => y.done).length, 0), all = s.items.reduce((n, x) => n + x.sets.length, 0);
      const body = $('#modalBody');
      body.innerHTML = `<div class="row between"><div><div class="muted small">${esc(s.title)}</div><h2>${esc(e.name)}</h2></div></div>
        <div class="row mt-s small muted"><span>Übung ${s.cur + 1}/${s.items.length}</span><span>·</span><span id="elapsed"></span><span>·</span><span>${doneSets}/${all} Sätze</span></div>
        <div class="mt-s">${bar(doneSets, all)}</div>
        <div class="anim-box mt" id="sAnim"></div>
        <p class="small muted mt-s">${esc(e.steps[1] || e.steps[0])} <a href="#" id="howto">Anleitung</a></p>
        <div class="set-row small muted"><span class="n">Satz</span><span class="center">${e.type === 'time' ? 'Sekunden' : 'Wdh.'}</span><span class="center">${e.type === 'time' ? '' : 'kg (+)'}</span><span></span></div>
        ${it.sets.map((st, i) => `<div class="set-row ${st.done ? 'done' : ''}" data-i="${i}"><span class="n">${i + 1}</span>
          ${e.type === 'time' ? `<input class="in" type="number" inputmode="numeric" data-f="sec" value="${st.sec}"><button class="btn sm" data-timer="${i}">⏱ Start</button>` : `<input class="in" type="number" inputmode="numeric" data-f="reps" value="${st.reps}"><input class="in" type="number" inputmode="decimal" step="0.5" data-f="kg" value="${st.kg}" placeholder="0">`}
          <button class="chk" data-done="${i}">${st.done ? '✓' : ''}</button></div>`).join('')}
        <div class="row mt-s"><button class="btn sm ghost" id="addSet">＋ Satz</button><button class="btn sm ghost" id="remSet">− Satz</button></div>
        <div id="restBox"></div>
        <div class="grid2 mt"><button class="btn" id="prev" ${s.cur === 0 ? 'disabled' : ''}>‹ Zurück</button><button class="btn ${s.cur === s.items.length - 1 ? 'primary' : ''}" id="next">${s.cur === s.items.length - 1 ? '🏁 Fertig' : 'Weiter ›'}</button></div>
        <div class="chips mt">${s.items.map((x, i) => `<button class="chip ${i === s.cur ? 'on' : ''}" data-go="${i}">${x.sets.every(y => y.done) ? '✓ ' : ''}${esc(EX[x.ex].name)}</button>`).join('')}</div>
        <div class="grid2 mt"><button class="btn danger" id="discard">Verwerfen</button><button class="btn primary" id="finish">Training beenden</button></div>`;
      if (ctl) ctl.stop(); ctl = FigureAnim.play($('#sAnim'), e.anim);
      $$('.set-row[data-i] input', body).forEach(inp => inp.onchange = () => { const st = it.sets[+inp.closest('.set-row').dataset.i]; st[inp.dataset.f] = inp.value === '' ? '' : +inp.value; persistSession(); });
      $$('[data-done]', body).forEach(b => b.onclick = () => {
        const st = it.sets[+b.dataset.done]; st.done = !st.done; persistSession();
        if (st.done) startRest(e.type === 'time' ? 45 : 75); draw();
      });
      $$('[data-timer]', body).forEach(b => b.onclick = () => runSetTimer(it, +b.dataset.timer, draw));
      $('#addSet').onclick = () => { const l = it.sets[it.sets.length - 1] || {}; it.sets.push({ ...l, done: false }); persistSession(); draw(); };
      $('#remSet').onclick = () => { if (it.sets.length > 1) { it.sets.pop(); persistSession(); draw(); } };
      $('#prev').onclick = () => { s.cur--; persistSession(); draw(); };
      $('#next').onclick = () => { if (s.cur < s.items.length - 1) { s.cur++; persistSession(); draw(); } else finishSession(); };
      $$('[data-go]', body).forEach(b => b.onclick = () => { s.cur = +b.dataset.go; persistSession(); draw(); });
      $('#howto').onclick = ev => { ev.preventDefault(); alert(e.steps.map((x, i) => `${i + 1}. ${x}`).join('\n') + '\n\nTipp: ' + e.tips); };
      $('#discard').onclick = () => { if (confirm('Training verwerfen?')) { S.session = null; S.u.activeSession = null; save(); closeModal(); rerender(); } };
      $('#finish').onclick = finishSession;
      drawRest(); tickElapsed();
    };
    openModal('', () => draw(), () => { ctl && ctl.stop(); clearInterval(restTimer); clearInterval(setTimerRef); restTimer = null; if (S.tab) rerender(); });
  }
  function tickElapsed() { const el = $('#elapsed'); if (el && S.session) { const m = Math.floor((Date.now() - S.session.started) / 60000); el.textContent = `${m} Min`; } }
  let restEnd = 0;
  function startRest(sec) {
    restEnd = Date.now() + sec * 1000; clearInterval(restTimer);
    restTimer = setInterval(() => { drawRest(); tickElapsed(); if (Date.now() > restEnd) { clearInterval(restTimer); restTimer = null; drawRest(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } }, 500);
  }
  function drawRest() {
    const box = $('#restBox'); if (!box) return;
    const left = Math.ceil((restEnd - Date.now()) / 1000);
    box.innerHTML = left > 0 ? `<div class="restbar row between"><div><div class="muted small">Pause</div><div class="timer" style="font-size:30px">${Math.floor(left / 60)}:${pad(left % 60)}</div></div><div class="row"><button class="btn sm" id="r15">+15 s</button><button class="btn sm" id="rskip">Überspringen</button></div></div>` : '';
    if (left > 0) { $('#r15').onclick = () => { restEnd += 15000; drawRest(); }; $('#rskip').onclick = () => { restEnd = 0; drawRest(); }; }
  }
  function runSetTimer(it, i, redraw) {
    const st = it.sets[i]; let left = +st.sec || 30; clearInterval(setTimerRef);
    const row = $(`.set-row[data-i="${i}"]`); const btn = row.querySelector('[data-timer]');
    btn.textContent = `${left}s`;
    setTimerRef = setInterval(() => {
      left--; if (btn.isConnected) btn.textContent = `${left}s`;
      if (left <= 0) { clearInterval(setTimerRef); st.done = true; persistSession(); if (navigator.vibrate) navigator.vibrate(400); startRest(45); redraw(); }
    }, 1000);
  }
  function finishSession() {
    const s = S.session; const bodyKg = +S.u.profile.weightKg || 75;
    const items = s.items.map(it => ({ ex: it.ex, sets: it.sets.filter(x => x.done).map(x => EX[it.ex].type === 'time' ? { sec: +x.sec || 0 } : { reps: +x.reps || 0, kg: +x.kg || 0 }) })).filter(it => it.sets.length);
    if (!items.length) return toast('Hake mindestens einen Satz als erledigt ab ✓');
    let kcal = 0, vol = 0, secSum = 0;
    for (const it of items) for (const st of it.sets) { const r = setStats(it.ex, st, bodyKg); kcal += r.kcal; vol += r.vol; secSum += r.sec; }
    const min = Math.max(Math.round((Date.now() - s.started) / 60000), Math.round(secSum / 60));
    const w = { id: uid(), date: today(), title: s.title, items, min, kcal: Math.round(kcal), vol: Math.round(vol) };
    S.u.workouts.push(w);
    if (s.planIdx != null) S.u.planIdx = (s.planIdx + 1) % PLANS[S.u.profile.goal].length;
    S.session = null; S.u.activeSession = null; save();
    const ws = weekStats(digestOf(S.u), mondayOf(today()));
    openModal(`<div class="center"><div style="font-size:54px">🏆</div><h2>Training abgeschlossen!</h2><p class="muted">${esc(w.title)}</p>
      <div class="grid3 mt"><div class="stat"><div class="v">${min}</div><div class="l">Minuten</div></div><div class="stat"><div class="v">${nf(w.kcal)}</div><div class="l">kcal</div></div><div class="stat"><div class="v">${nf(w.vol)}</div><div class="l">kg bewegt</div></div></div>
      <p class="mt"><b class="accent">+${POINTS.workout + Math.floor(min / POINTS.perMinutes)} Punkte</b> für die Wertung</p>
      <div class="mt">${challengeCard(ws, true)}</div>
      <button class="btn primary block mt" id="okf">Super!</button></div>`, b => { b.querySelector('#okf').onclick = () => { closeModal(); rerender(); }; });
  }

  function quickLog(preset) {
    const opts = EXERCISES.map(e => `<option value="${e.id}" ${e.id === preset ? 'selected' : ''}>${esc(e.name)}</option>`).join('');
    openModal(`<h2>Einheit eintragen</h2><p class="muted small">Für Trainings ohne Live-Modus, z. B. im Studio oder draußen.</p>
      <label class="f mt"><span>Übung</span><select class="in" id="qe">${opts}</select></label>
      <label class="f"><span>Datum</span><input class="in" type="date" id="qd" value="${today()}" max="${today()}"></label>
      <div class="grid3" id="qf"></div>
      <button class="btn primary block mt" id="qsave">Speichern</button>`, b => {
      const fields = () => {
        const e = EX[$('#qe').value];
        $('#qf').innerHTML = `<label class="f"><span>Sätze</span><input class="in" type="number" id="qs" value="3" min="1"></label>` + (e.type === 'time'
          ? `<label class="f"><span>Minuten je Satz</span><input class="in" type="number" id="qm" value="${e.cat === 'Cardio' ? 30 : 1}" step="0.5" min="0.5"></label><span></span>`
          : `<label class="f"><span>Wdh.</span><input class="in" type="number" id="qr" value="10" min="1"></label><label class="f"><span>kg (+)</span><input class="in" type="number" id="qk" value="${lastKg(e.id) || ''}" step="0.5" placeholder="0"></label>`);
      };
      fields(); $('#qe').onchange = fields;
      $('#qsave').onclick = () => {
        const e = EX[$('#qe').value]; const n = clamp(+$('#qs').value || 1, 1, 20); const bodyKg = +S.u.profile.weightKg || 75;
        const sets = Array.from({ length: n }, () => e.type === 'time' ? { sec: Math.round((+$('#qm').value || 1) * 60) } : { reps: +$('#qr').value || 0, kg: +$('#qk').value || 0 });
        let kcal = 0, vol = 0, sec = 0; for (const st of sets) { const r = setStats(e.id, st, bodyKg); kcal += r.kcal; vol += r.vol; sec += r.sec; }
        S.u.workouts.push({ id: uid(), date: $('#qd').value || today(), title: e.name, items: [{ ex: e.id, sets }], min: Math.max(1, Math.round(sec / 60 * (e.type === 'reps' ? 2 : 1))), kcal: Math.round(kcal), vol: Math.round(vol), manual: true });
        S.u.workouts.sort((a, b) => a.date < b.date ? -1 : 1); save(); closeModal(); toast('Einheit gespeichert ✓'); rerender();
      };
    });
  }

  /* ===================================================================== */
  /*  TRACKER                                                              */
  /* ===================================================================== */
  function addWater(ml) { const t = today(); S.u.water[t] = Math.max(0, (S.u.water[t] || 0) + ml); save(); toast(`💧 ${nf(S.u.water[t] / 1000, 2)} l heute`); }
  function weightModal() {
    openModal(`<h2>Gewicht eintragen</h2><label class="f mt"><span>Gewicht (kg)</span><input class="in" type="number" inputmode="decimal" step="0.1" id="wkg" value="${S.u.profile.weightKg}"></label>
      <label class="f"><span>Datum</span><input class="in" type="date" id="wd" value="${today()}" max="${today()}"></label><button class="btn primary block" id="wsave">Speichern</button>`, b => {
      b.querySelector('#wsave').onclick = () => {
        const kg = +$('#wkg').value; const d = $('#wd').value || today(); if (!(kg > 30 && kg < 400)) return toast('Bitte gültiges Gewicht eingeben');
        S.u.weights = S.u.weights.filter(w => w.d !== d); S.u.weights.push({ d, kg }); S.u.weights.sort((a, b) => a.d < b.d ? -1 : 1);
        S.u.profile.weightKg = S.u.weights[S.u.weights.length - 1].kg; save(); closeModal(); toast('Gewicht gespeichert ⚖️'); rerender();
      };
    });
  }
  function stepsModal() {
    const t = today();
    openModal(`<h2>Schritte eintragen</h2><p class="muted small">Übernimm den Wert aus deiner Uhr / Health-App.</p><label class="f mt"><span>Schritte</span><input class="in" type="number" inputmode="numeric" id="sv" value="${S.u.steps[t] || ''}"></label>
      <label class="f"><span>Datum</span><input class="in" type="date" id="sd" value="${t}" max="${t}"></label><button class="btn primary block" id="ssave">Speichern</button>`, b => {
      b.querySelector('#sd').onchange = e => { $('#sv').value = S.u.steps[e.target.value] || ''; };
      b.querySelector('#ssave').onclick = () => { S.u.steps[$('#sd').value || t] = Math.max(0, Math.round(+$('#sv').value || 0)); save(); closeModal(); rerender(); };
    });
  }

  /* Live-Schrittzähler über Bewegungssensor (solange die App geöffnet ist) */
  async function startPedo() {
    if (typeof DeviceMotionEvent === 'undefined') return toast('Dieses Gerät hat keinen Bewegungssensor');
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try { if (await DeviceMotionEvent.requestPermission() !== 'granted') return toast('Zugriff auf Bewegungssensor verweigert'); } catch { return toast('Zugriff auf Bewegungssensor nicht möglich'); }
    }
    let avg = 9.8, last = 0, above = false, got = false;
    const handler = e => {
      const a = e.accelerationIncludingGravity; if (!a || a.x == null) return; got = true;
      const m = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); avg = avg * 0.9 + m * 0.1;
      const now = Date.now();
      if (!above && m > avg + 1.8 && now - last > 280) { above = true; last = now; S.pedo.count++; const t = today(); S.u.steps[t] = (S.u.steps[t] || 0) + 1; if (S.pedo.count % 10 === 0) save(); const el = $('#pedoCount'); if (el) el.textContent = nf(S.pedo.count); }
      else if (above && m < avg) above = false;
    };
    window.addEventListener('devicemotion', handler);
    S.pedo = { handler, count: 0 };
    setTimeout(() => { if (S.pedo && !got) { stopPedo(); toast('Kein Sensorsignal – bitte am Handy öffnen'); rerender(); } }, 3000);
    rerender();
  }
  function stopPedo() { if (S.pedo) { window.removeEventListener('devicemotion', S.pedo.handler); S.pedo = null; save(); } }

  VIEWS.tracker = v => {
    const u = S.u, t = today(), p = u.profile, c = calc(p);
    const dg = digestOf(u); const d7 = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
    const lbl = d7.map(k => parseKey(k).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2));
    const ws = [...u.weights].sort((a, b) => a.d < b.d ? -1 : 1).slice(-30);
    const first = u.weights[0]?.kg, cur = p.weightKg;
    const wk = sumDays(dg, weekDays(mondayOf(t)));
    const waterT = u.water[t] || 0;
    const hist = [...u.workouts].reverse().slice(0, 15);
    v.innerHTML = `<h2>Fitness-Tracker</h2>
      <div class="grid2 mt">
        <div class="stat"><div class="l">Trainings diese Woche</div><div class="v">${wk.wo} <span class="muted small">/ ${p.days}</span></div>${bar(wk.wo, p.days)}</div>
        <div class="stat"><div class="l">Aktive Minuten</div><div class="v">${nf(wk.min)}</div>${bar(wk.min, 150, 'blue')}</div>
        <div class="stat"><div class="l">Bewegtes Gewicht</div><div class="v">${nf(wk.vol)} <span class="muted small">kg</span></div></div>
        <div class="stat"><div class="l">Verbrannt (Training)</div><div class="v">${nf(wk.kcal)} <span class="muted small">kcal</span></div></div>
      </div>
      <div class="card"><div class="row between"><h3>👟 Schritte</h3><button class="btn sm" id="stepAdd">Eintragen</button></div>
        <div class="row mt"><div class="big">${nf(u.steps[t] || 0)}</div><div class="muted small">/ ${nf(p.stepGoal || 10000)} heute</div></div>
        <div class="mt-s">${bar(u.steps[t] || 0, p.stepGoal || 10000, 'blue')}</div>
        <div class="row between mt"><span class="small ${S.pedo ? 'badge-live' : 'muted'}">${S.pedo ? `Live-Zähler aktiv: <b id="pedoCount">${nf(S.pedo.count)}</b>` : 'Live-Schrittzähler (Handy-Sensor)'}</span><button class="btn sm ${S.pedo ? 'danger' : ''}" id="pedo">${S.pedo ? 'Stopp' : 'Start'}</button></div>
        ${barChart(d7.map(k => (dg.days[k] || {}).steps || 0), lbl, { target: p.stepGoal || 10000 })}</div>
      <div class="card"><div class="row between"><h3>⚖️ Gewicht</h3><button class="btn sm" id="wAdd">Eintragen</button></div>
        <div class="row mt"><div class="big">${nf(cur, 1)} <span class="muted small">kg</span></div><div class="grow small muted">${first != null ? `${cur - first <= 0 ? '▼' : '▲'} ${nf(Math.abs(cur - first), 1)} kg seit Start` : ''}${p.targetKg ? `<br>Ziel: ${nf(p.targetKg, 1)} kg (noch ${nf(Math.abs(cur - p.targetKg), 1)} kg)` : ''}</div></div>
        ${lineChart(ws.map(w => ({ x: fmtShort(w.d), y: w.kg })), { target: p.targetKg, dec: 1, label: 'Gewichtsverlauf' })}
        <div class="small muted">BMI ${nf(c.bmi, 1)} · ${c.bmiTxt}</div></div>
      <div class="card"><div class="row between"><h3>💧 Wasser</h3><span class="muted small">Ziel ${nf(c.water / 1000, 1)} l</span></div>
        <div class="row mt"><div class="big">${nf(waterT / 1000, 2)} <span class="muted small">l</span></div><div class="grow">${bar(waterT, c.water, 'blue')}</div></div>
        <div class="grid3 mt"><button class="btn sm" data-w="-250">− 250 ml</button><button class="btn sm" data-w="250">＋ Glas</button><button class="btn sm" data-w="500">＋ Flasche</button></div></div>
      <div class="card"><h3>🏋️ Trainingsvolumen (7 Tage)</h3>${barChart(d7.map(k => Math.round((dg.days[k] || {}).vol || 0)), lbl, { showVals: true, fmt: v => v >= 1000 ? nf(v / 1000, 1) + 't' : nf(v) })}</div>
      <div class="section-title"><h3>Verlauf</h3><button class="btn sm" id="logNew">＋ Einheit</button></div>
      <div class="card">${hist.length ? `<div class="list">${hist.map(w => `<div class="li"><div class="grow"><div class="t">${esc(w.title)}</div><div class="muted small">${fmtDate(w.date)} · ${w.min} Min · ${nf(w.kcal)} kcal${w.vol ? ` · ${nf(w.vol)} kg` : ''}</div><div class="tiny muted">${w.items.map(it => `${esc(EX[it.ex]?.name || it.ex)} ${it.sets.length}×`).join(', ')}</div></div><button class="icon-btn" data-del="${w.id}" aria-label="Löschen">🗑</button></div>`).join('')}</div>` : '<div class="empty">Noch keine Trainings. Starte dein erstes unter „Training“!</div>'}</div>`;
    $('#stepAdd').onclick = stepsModal; $('#wAdd').onclick = weightModal; $('#logNew').onclick = () => quickLog();
    $('#pedo').onclick = () => { if (S.pedo) { stopPedo(); rerender(); } else startPedo(); };
    $$('[data-w]', v).forEach(b => b.onclick = () => { addWater(+b.dataset.w); rerender(); });
    $$('[data-del]', v).forEach(b => b.onclick = () => confirmBox('Dieses Training wird gelöscht und aus der Wertung entfernt.', 'Löschen', () => { S.u.workouts = S.u.workouts.filter(w => w.id !== b.dataset.del); save(); rerender(); }));
  };

  /* ===================================================================== */
  /*  ERNÄHRUNG                                                            */
  /* ===================================================================== */
  VIEWS.food = v => {
    const u = S.u, c = calc(u.profile);
    const day = S.sub.foodDay || today(); S.sub.foodDay = day;
    const items = u.food[day] || [];
    const tot = items.reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });
    const burned = (digestOf(u).days[day] || {}).kcal || 0;
    const left = c.kcal + burned - tot.kcal;
    const d7 = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
    const kc = d7.map(k => Math.round((u.food[k] || []).reduce((s, x) => s + x.kcal, 0)));
    const logged = kc.filter(x => x > 0);
    v.innerHTML = `<div class="row between"><h2>Ernährung</h2><div class="row"><button class="icon-btn" id="dPrev" aria-label="Vortag">‹</button><span class="small nowrap">${day === today() ? 'Heute' : fmtDate(day)}</span><button class="icon-btn" id="dNext" ${day >= today() ? 'disabled' : ''} aria-label="Folgetag">›</button></div></div>
      <div class="card mt"><div class="row" style="gap:18px;flex-wrap:wrap;justify-content:center">
        ${ring(tot.kcal, c.kcal + burned, nf(left), left >= 0 ? 'kcal übrig' : 'kcal zu viel', 'var(--accent)', 130)}
        <div class="grow" style="min-width:180px">
          <div class="row between small"><span>Gegessen</span><b>${nf(tot.kcal)} kcal</b></div>
          <div class="row between small"><span>Training</span><b class="good">+${nf(burned)} kcal</b></div>
          <div class="row between small"><span>Tagesziel</span><b>${nf(c.kcal)} kcal</b></div>
          <div class="mt-s small row between"><span>Eiweiß</span><span>${nf(tot.p)} / ${c.protein} g</span></div>${bar(tot.p, c.protein, 'blue')}
          <div class="mt-s small row between"><span>Kohlenhydrate</span><span>${nf(tot.c)} / ${c.carbs} g</span></div>${bar(tot.c, c.carbs, 'orange')}
          <div class="mt-s small row between"><span>Fett</span><span>${nf(tot.f)} / ${c.fat} g</span></div>${bar(tot.f, c.fat, 'green')}
        </div></div></div>
      <div class="grid2 mt"><button class="btn primary" id="scan">📷 Barcode scannen</button><button class="btn" id="search">🔍 Suchen / Manuell</button></div>
      ${Object.entries(MEALS).map(([k, l]) => { const its = items.filter(x => x.meal === k); const s = its.reduce((a, x) => a + x.kcal, 0); return `<div class="card"><div class="meal-h"><h3>${l}</h3><div class="row"><span class="muted small">${nf(s)} kcal</span><button class="icon-btn" data-addmeal="${k}" aria-label="Hinzufügen">＋</button></div></div>
        ${its.length ? `<div class="list">${its.map(x => `<div class="li">${x.img ? `<img class="food-img" src="${esc(x.img)}" alt="" loading="lazy">` : '<div class="food-img">🍽️</div>'}<div class="grow"><div class="t small">${esc(x.name)}</div><div class="muted tiny">${x.brand ? esc(x.brand) + ' · ' : ''}${nf(x.grams)} g · E ${nf(x.p)} · K ${nf(x.c)} · F ${nf(x.f)}</div></div><b class="small nowrap">${nf(x.kcal)}</b><button class="icon-btn" data-rm="${x.id}" aria-label="Entfernen" style="width:34px;height:34px;font-size:14px">✕</button></div>`).join('')}</div>` : '<div class="muted small">Noch nichts eingetragen.</div>'}</div>`; }).join('')}
      <div class="card"><div class="row between"><h3>Wochenübersicht</h3><span class="muted small">Ø ${logged.length ? nf(logged.reduce((a, b) => a + b, 0) / logged.length) : 0} kcal</span></div>
        ${barChart(kc, d7.map(k => parseKey(k).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2)), { target: c.kcal, overBad: true })}
        <p class="tiny muted">Gestrichelt: dein Tagesziel (${nf(c.kcal)} kcal). Orange = über dem Ziel.</p></div>`;
    $('#dPrev').onclick = () => { S.sub.foodDay = addDays(day, -1); rerender(); };
    $('#dNext').onclick = () => { if (day < today()) { S.sub.foodDay = addDays(day, 1); rerender(); } };
    $('#scan').onclick = () => openAddFood(day, 'scan');
    $('#search').onclick = () => openAddFood(day, 'search');
    $$('[data-addmeal]', v).forEach(b => b.onclick = () => openAddFood(day, 'search', b.dataset.addmeal));
    $$('[data-rm]', v).forEach(b => b.onclick = () => { u.food[day] = (u.food[day] || []).filter(x => x.id !== b.dataset.rm); save(); rerender(); });
  };

  function guessMeal() { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 14 ? 'lunch' : h < 17 ? 'snack' : 'dinner'; }

  /* Lebensmittel aus Open Food Facts */
  const offCache = lsGet('fx.foodcache', {});
  function mapOff(p, code) {
    const n = p.nutriments || {};
    let kcal = n['energy-kcal_100g']; if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;
    if (kcal == null) return null;
    return { id: 'off' + (code || p.code), barcode: code || p.code, name: p.product_name_de || p.product_name || 'Unbekanntes Produkt', brand: (p.brands || '').split(',')[0], img: p.image_front_small_url || '', kcal: +kcal, p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0), serving: +p.serving_quantity || null };
  }
  async function lookupBarcode(code) {
    if (offCache[code]) return offCache[code];
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,product_name_de,brands,nutriments,image_front_small_url,serving_quantity`);
    if (!r.ok) throw new Error('not found');
    const j = await r.json(); if (j.status !== 1 || !j.product) return null;
    const m = mapOff(j.product, code); if (m) { offCache[code] = m; lsSet('fx.foodcache', offCache); }
    return m;
  }
  async function searchOff(q) {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&lc=de&fields=code,product_name,product_name_de,brands,nutriments,image_front_small_url,serving_quantity`);
    const j = await r.json(); return (j.products || []).map(p => mapOff(p)).filter(Boolean);
  }

  function openAddFood(day, mode, meal) {
    let stream = null, loop = 0, zx = null;
    const stopCam = () => { cancelAnimationFrame(loop); clearTimeout(loop); if (zx) { try { zx.reset(); } catch { /* */ } zx = null; } if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
    const render = m => {
      stopCam(); mode = m;
      $('#modalBody').innerHTML = `<h2>Essen hinzufügen</h2><div class="seg mt" id="fm">${[['scan', '📷 Scannen'], ['search', '🔍 Suchen'], ['manual', '✍️ Manuell']].map(([k, l]) => `<button data-m="${k}" class="${mode === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="fbody" class="mt"></div>`;
      $$('#fm button').forEach(b => b.onclick = () => render(b.dataset.m));
      const fb = $('#fbody');
      if (mode === 'scan') {
        fb.innerHTML = `<div class="scan-wrap"><video id="vid" playsinline muted></video><div class="scan-frame"></div><div class="scan-line"></div></div>
          <p class="small muted center mt-s" id="scanSt">Kamera wird gestartet …</p>
          <form class="row mt" id="eanF"><input class="in grow" id="ean" inputmode="numeric" placeholder="Barcode (EAN) manuell eingeben" pattern="[0-9]{6,14}"><button class="btn">Suchen</button></form>`;
        $('#eanF').onsubmit = e => { e.preventDefault(); const c = $('#ean').value.trim(); if (c) handleCode(c); };
        startCam();
      } else if (mode === 'search') {
        fb.innerHTML = `<form class="row" id="sF"><input class="in grow" id="sq" placeholder="z. B. Haferflocken, Skyr, Banane" autocomplete="off"><button class="btn primary">Los</button></form><div id="sres" class="list mt"></div>`;
        const showLocal = q => {
          const l = FOODS.filter(f => !q || f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
          const recent = recentFoods().filter(f => !q || f.name.toLowerCase().includes(q.toLowerCase()));
          $('#sres').innerHTML = (recent.length ? `<div class="muted small">Zuletzt gegessen</div>${recent.map(foodRow).join('')}` : '') + `<div class="muted small mt-s">Basis-Lebensmittel (pro 100 g)</div>${l.map(foodRow).join('')}`;
          bindRows();
        };
        $('#sq').oninput = e => showLocal(e.target.value);
        $('#sF').onsubmit = async e => {
          e.preventDefault(); const q = $('#sq').value.trim(); if (!q) return;
          showLocal(q); $('#sres').insertAdjacentHTML('afterbegin', '<div class="muted small" id="offLoad">Suche in Open Food Facts …</div>');
          try { const res = await searchOff(q); $('#offLoad').outerHTML = res.length ? `<div class="muted small">Produkte (Open Food Facts)</div>${res.map(foodRow).join('')}` : '<div class="muted small">Keine Produkte online gefunden.</div>'; bindRows(res); }
          catch { const o = $('#offLoad'); if (o) o.textContent = 'Online-Suche nicht erreichbar – nutze die Basis-Lebensmittel.'; }
        };
        showLocal(''); setTimeout(() => $('#sq')?.focus(), 50);
      } else {
        fb.innerHTML = `<label class="f"><span>Bezeichnung</span><input class="in" id="mn" placeholder="z. B. Mittagessen Kantine"></label>
          <div class="grid2"><label class="f"><span>Kalorien (kcal)</span><input class="in" type="number" id="mk" inputmode="numeric"></label><label class="f"><span>Eiweiß (g)</span><input class="in" type="number" id="mp" inputmode="decimal"></label>
          <label class="f"><span>Kohlenhydrate (g)</span><input class="in" type="number" id="mc" inputmode="decimal"></label><label class="f"><span>Fett (g)</span><input class="in" type="number" id="mf" inputmode="decimal"></label></div>
          <label class="f"><span>Mahlzeit</span><select class="in" id="mm">${Object.entries(MEALS).map(([k, l]) => `<option value="${k}" ${k === (meal || guessMeal()) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <button class="btn primary block" id="msave">Hinzufügen</button>`;
        $('#msave').onclick = () => {
          const kcal = +$('#mk').value; if (!$('#mn').value.trim() || !(kcal >= 0)) return toast('Bitte Name und Kalorien angeben');
          addFood(day, { id: uid(), name: $('#mn').value.trim(), grams: 0, kcal, p: +$('#mp').value || 0, c: +$('#mc').value || 0, f: +$('#mf').value || 0, meal: $('#mm').value });
        };
      }
    };
    const pool = {};
    const foodRow = f => { pool[f.id] = f; return `<button class="li" data-food="${esc(f.id)}" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left">${f.img ? `<img class="food-img" src="${esc(f.img)}" alt="" loading="lazy">` : '<div class="food-img">🍽️</div>'}<div class="grow"><div class="t small">${esc(f.name)}</div><div class="muted tiny">${f.brand ? esc(f.brand) + ' · ' : ''}${nf(f.kcal)} kcal · E ${nf(f.p, 1)} · K ${nf(f.c, 1)} · F ${nf(f.f, 1)} /100 g</div></div><span class="accent">＋</span></button>`; };
    const bindRows = () => $$('[data-food]').forEach(b => b.onclick = () => amountStep(pool[b.dataset.food]));
    async function handleCode(code) {
      stopCam(); const st = $('#scanSt'); if (st) st.textContent = `Barcode ${code} – suche Produkt …`;
      if (navigator.vibrate) navigator.vibrate(80);
      try {
        const p = await lookupBarcode(code);
        if (p) amountStep(p);
        else { if (st) st.innerHTML = `Produkt ${esc(code)} nicht gefunden. <a href="#" id="toMan">Manuell eintragen</a>`; $('#toMan') && ($('#toMan').onclick = e => { e.preventDefault(); render('manual'); }); }
      } catch { if (st) st.textContent = 'Keine Verbindung zu Open Food Facts. Bitte manuell eintragen.'; }
    }
    async function startCam() {
      const st = $('#scanSt');
      if (!navigator.mediaDevices?.getUserMedia) { st.textContent = 'Kamera nicht verfügbar – Barcode bitte eintippen.'; return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false }); }
      catch { st.textContent = 'Kein Kamerazugriff – erlaube die Kamera oder tippe den Barcode ein.'; return; }
      const vid = $('#vid'); if (!vid) return stopCam();
      vid.srcObject = stream; await vid.play().catch(() => { });
      st.textContent = 'Halte den Barcode in den Rahmen';
      if ('BarcodeDetector' in window) {
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        const scan = async () => {
          if (!stream) return;
          try { const r = await det.detect(vid); if (r.length) return handleCode(r[0].rawValue); } catch { /* weiter */ }
          loop = setTimeout(scan, 250);
        };
        scan();
      } else {
        try {
          if (!window.ZXing) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
          if (!stream) return;
          zx = new window.ZXing.BrowserMultiFormatReader();
          stream.getTracks().forEach(t => t.stop()); stream = null;
          zx.decodeFromConstraints({ video: { facingMode: 'environment' } }, vid, res => { if (res && zx) { const c = res.getText(); stopCam(); handleCode(c); } });
        } catch { st.textContent = 'Scanner konnte nicht geladen werden – Barcode bitte eintippen.'; }
      }
    }
    function amountStep(f) {
      stopCam();
      const def = f.serving || (f.id.startsWith('local') ? 100 : 100);
      $('#modalBody').innerHTML = `<h2>${esc(f.name)}</h2>${f.brand ? `<div class="muted small">${esc(f.brand)}</div>` : ''}
        <div class="row mt">${f.img ? `<img class="food-img" style="width:70px;height:70px" src="${esc(f.img)}" alt="">` : ''}<div class="small muted">Pro 100 g: ${nf(f.kcal)} kcal · Eiweiß ${nf(f.p, 1)} g · KH ${nf(f.c, 1)} g · Fett ${nf(f.f, 1)} g</div></div>
        <div class="grid2 mt"><label class="f"><span>Menge (g / ml)</span><input class="in" type="number" inputmode="decimal" id="ag" value="${def}"></label>
        <label class="f"><span>Mahlzeit</span><select class="in" id="am">${Object.entries(MEALS).map(([k, l]) => `<option value="${k}" ${k === (meal || guessMeal()) ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
        <div class="chips">${[50, 100, 150, 200, 250].map(g => `<button class="chip" data-g="${g}">${g} g</button>`).join('')}${f.serving ? `<button class="chip" data-g="${f.serving}">1 Portion</button>` : ''}</div>
        <div class="grid3 mt" id="prev"></div>
        <div class="grid2 mt"><button class="btn" id="aback">Zurück</button><button class="btn primary" id="aadd">Hinzufügen</button></div>`;
      const upd = () => { const g = +$('#ag').value || 0, k = g / 100; $('#prev').innerHTML = `<div class="stat"><div class="v">${nf(f.kcal * k)}</div><div class="l">kcal</div></div><div class="stat"><div class="v">${nf(f.p * k, 1)}</div><div class="l">Eiweiß g</div></div><div class="stat"><div class="v">${nf(f.c * k, 1)}</div><div class="l">KH g</div></div>`; };
      $('#ag').oninput = upd; upd();
      $$('[data-g]').forEach(b => b.onclick = () => { $('#ag').value = b.dataset.g; upd(); });
      $('#aback').onclick = () => render(mode === 'scan' ? 'search' : mode);
      $('#aadd').onclick = () => {
        const g = +$('#ag').value || 0; if (g <= 0) return toast('Menge angeben'); const k = g / 100;
        addFood(day, { id: uid(), ref: f.id, barcode: f.barcode, name: f.name, brand: f.brand, img: f.img, grams: g, kcal: Math.round(f.kcal * k), p: Math.round(f.p * k * 10) / 10, c: Math.round(f.c * k * 10) / 10, f: Math.round(f.f * k * 10) / 10, per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f }, serving: f.serving, meal: $('#am').value });
      };
    }
    openModal('', () => render(mode), stopCam);
  }
  function recentFoods() {
    const seen = new Set(), out = [];
    const days = Object.keys(S.u.food).sort().reverse();
    for (const d of days) for (const x of [...S.u.food[d]].reverse()) {
      if (!x.per100 || seen.has(x.name)) continue; seen.add(x.name);
      out.push({ id: 'r' + out.length, name: x.name, brand: x.brand, img: x.img, barcode: x.barcode, serving: x.serving, ...x.per100 });
      if (out.length >= 6) return out;
    }
    return out;
  }
  function addFood(day, item) {
    (S.u.food[day] = S.u.food[day] || []).push(item); save(); closeModal(); toast(`${item.name} hinzugefügt (${nf(item.kcal)} kcal)`);
    if (S.tab === 'food') { S.sub.foodDay = day; } rerender();
  }

  /* ===================================================================== */
  /*  FREUNDE, RANGLISTE & DUELLE                                          */
  /* ===================================================================== */
  function duelRow(d) {
    const st = duelState(d); const t = DUEL_TYPES[d.type];
    const tot = Math.abs(st.me) + Math.abs(st.them) || 1;
    const meP = st.me <= 0 && st.them <= 0 ? 50 : clamp(Math.max(st.me, 0) / (Math.max(st.me, 0) + Math.max(st.them, 0) || 1) * 100, 0, 100);
    const left = daysBetween(today(), d.end);
    const unit = d.type === 'max' ? `kg ${esc(EX[d.ex]?.name || '')}` : t.unit;
    void tot;
    return `<div class="li" style="display:block" data-duel="${d.id}"><div class="row between"><div class="small"><b>${esc(t.label)}</b>${d.type === 'max' ? ` · ${esc(EX[d.ex]?.name || '')}` : ''}<br><span class="muted">vs. ${esc(st.fdg?.name || 'gelöschter Freund')} · ${st.over ? 'beendet' : `noch ${left} ${left === 1 ? 'Tag' : 'Tage'}`}</span></div>
      ${st.over ? `<span class="pill ${st.result === 'won' ? 'ok' : st.result === 'lost' ? 'no' : ''}">${st.result === 'won' ? `🏆 +${POINTS.duelWin}` : st.result === 'lost' ? `${POINTS.duelLoss}` : 'Unentschieden'}</span>` : `<span class="pill ${st.me > st.them ? 'ok' : st.me < st.them ? 'no' : ''}">${st.me > st.them ? 'Du führst' : st.me < st.them ? 'Rückstand' : 'Gleichstand'}</span>`}</div>
      <div class="row between small mt-s"><span><b class="accent">Du: ${nf(st.me, d.type === 'loss' ? 1 : 0)}</b></span><span><b style="color:var(--accent2)">${esc((st.fdg?.name || '').replace(' (Demo)', ''))}: ${nf(st.them, d.type === 'loss' ? 1 : 0)}</b> <span class="muted">${unit}</span></span></div>
      <div class="duel-bar mt-s"><i class="a" style="width:${meP}%"></i><i class="b" style="width:${100 - meP}%"></i></div></div>`;
  }
  function bindDuelRows(root) {
    $$('[data-duel]', root).forEach(r => r.onclick = () => {
      const d = S.u.duels.find(x => x.id === r.dataset.duel); if (!d) return;
      openModal(`<h2>Duell</h2><div class="list">${duelRow(d)}</div><p class="small muted">${esc(DUEL_TYPES[d.type].desc)}<br>Zeitraum: ${fmtDate(d.start)} – ${fmtDate(d.end)}</p><p class="small muted">Gewinner: <b class="good">+${POINTS.duelWin}</b> Punkte · Verlierer: <b class="bad">${POINTS.duelLoss}</b> Punkte (Gesamtwertung).</p><button class="btn danger block mt" id="delDuel">Duell entfernen</button>`, b => {
        b.querySelector('#delDuel').onclick = () => { S.u.duels = S.u.duels.filter(x => x.id !== d.id); save(); closeModal(); rerender(); };
      });
    });
  }

  VIEWS.friends = v => {
    const sub = S.sub.friends || 'week';
    const lb = leaderboard();
    const cur = mondayOf(today());
    const sorted = sub === 'total' ? [...lb].sort((a, b) => b.total - a.total) : [...lb].sort((a, b) => b.week.pts - a.week.pts);
    const ch = challengeFor(cur);
    const hist = seasonWeeks().slice(0, 8).reverse().map(m => weekStats(digestOf(S.u), m));
    v.innerHTML = `<h2>Freunde & Wertung</h2>
      <div class="seg mt" id="fseg"><button data-k="week" class="${sub === 'week' ? 'on' : ''}">Diese Woche</button><button data-k="total" class="${sub === 'total' ? 'on' : ''}">Gesamt</button></div>
      <div class="card mt"><div class="row between"><div class="small muted">${sub === 'week' ? `KW ${isoWeekNo(cur)} · Challenge: ${ch.icon} ${esc(ch.title)}` : `Saison seit ${fmtShort(mondayOf(S.u.createdAt))} · inkl. Duelle`}</div></div>
        <div class="mt-s">${sorted.map((p, i) => {
          const w = p.week; const pts = sub === 'week' ? w.pts : p.total;
          const chTxt = w.status === 'done' ? '<span class="pill ok">✓ Challenge</span>' : w.status === 'failed' ? `<span class="pill no">✗ ${POINTS.challengeFailed}</span>` : `<span class="pill">${Math.round(clamp(w.prog / w.ch.target, 0, 1) * 100)} %</span>`;
          return `<div class="rank ${p.me ? 'me' : ''} medal-${i + 1}"><div class="pos">${i + 1}</div>${avatar(p.dg.name, p.dg.color)}<div class="grow"><div class="t">${esc(p.me ? p.dg.name + ' (Du)' : p.dg.name)}</div><div class="muted tiny">${w.a.wo} Trainings · ${nf(w.a.steps)} Schritte ${sub === 'week' ? '· ' : ''}</div>${sub === 'week' ? chTxt : ''}</div><div class="pts ${pts < 0 ? 'bad' : ''}">${nf(pts)}</div></div>`;
        }).join('')}</div>
        <details class="mt-s small muted"><summary>Wie werden Punkte vergeben?</summary><p>+${POINTS.workout} je Training · +1 je ${POINTS.perMinutes} aktive Minuten · +1 je ${nf(POINTS.perSteps)} Schritte · Wochen-Challenge geschafft <b class="good">+${POINTS.challengeDone}</b>, verpasst <b class="bad">${POINTS.challengeFailed}</b> · Duell gewonnen <b class="good">+${POINTS.duelWin}</b>, verloren <b class="bad">${POINTS.duelLoss}</b>. Deine erste Woche ist straffrei.</p></details></div>
      <div class="section-title"><h3>Deine Challenge-Bilanz</h3></div>
      <div class="card"><div class="week-hist">${hist.map(w => `<div class="${w.status === 'done' ? 'ok' : w.status === 'failed' ? 'no' : 'op'}" title="${esc(w.ch.title)}">KW${isoWeekNo(w.mon)}<br><b>${w.status === 'done' ? '✓' : w.status === 'failed' ? '✗' : w.ended ? '–' : '…'}</b><br>${w.bonus > 0 ? '+' : ''}${w.bonus || ''}</div>`).join('')}</div></div>
      <div class="section-title"><h3>Monats-Duelle</h3><button class="btn sm primary" id="newDuel">⚔️ Herausfordern</button></div>
      <div class="card">${S.u.duels.length ? `<div class="list">${[...S.u.duels].sort((a, b) => b.start < a.start ? -1 : 1).map(duelRow).join('')}</div>` : '<div class="empty">Fordere einen Freund heraus: Wer bewegt in 30 Tagen mehr Gewicht oder nimmt mehr ab?</div>'}</div>
      <div class="section-title"><h3>Freunde (${S.u.friends.length})</h3><button class="btn sm" id="addFriend">＋ Hinzufügen</button></div>
      <div class="card">${S.u.friends.length ? `<div class="list">${S.u.friends.map(f => { const dg = friendDigest(f); return `<div class="li">${avatar(dg?.name || '?', dg?.color)}<div class="grow"><div class="t">${esc(dg?.name || 'Unbekannt')}</div><div class="muted tiny">${f.kind === 'demo' ? 'Demo-Freund (simuliert)' : f.kind === 'local' ? 'Konto auf diesem Gerät · live' : `Freundes-Code · Stand ${dg ? new Date(dg.at).toLocaleDateString('de-DE') : '–'}`}${dg?.goal ? ' · ' + GOALS[dg.goal].icon + ' ' + GOALS[dg.goal].label : ''}</div></div><button class="icon-btn" data-unf="${f.id}" aria-label="Entfernen">✕</button></div>`; }).join('')}</div>` : '<div class="empty">Noch keine Freunde – füge welche hinzu!</div>'}</div>
      <div class="card"><h3>Dein Freundes-Code</h3><p class="small muted">Teile deinen Code, damit Freunde deinen aktuellen Stand in ihre Rangliste übernehmen. Schick ihn nach dem Training erneut, um ihn zu aktualisieren.</p><div class="grid2 mt"><button class="btn" id="shareCode">📤 Code teilen</button><button class="btn" id="pasteCode">📥 Code einfügen</button></div></div>`;
    $$('#fseg button').forEach(b => b.onclick = () => go('friends', b.dataset.k));
    $('#newDuel').onclick = duelModal; $('#addFriend').onclick = addFriendModal;
    $('#shareCode').onclick = shareCode; $('#pasteCode').onclick = () => addFriendModal('code');
    $$('[data-unf]', v).forEach(b => b.onclick = () => confirmBox('Freund aus deiner Rangliste entfernen?', 'Entfernen', () => { S.u.friends = S.u.friends.filter(f => f.id !== b.dataset.unf); save(); rerender(); }));
    bindDuelRows(v);
  };

  async function shareCode() {
    const code = await makeCode();
    openModal(`<h2>Dein Freundes-Code</h2><p class="small muted">Enthält Name, Ziel und deine Trainings-/Schritt-/Gewichtswerte der letzten ~60 Tage – keine Passwörter.</p><div class="code-box mt" id="cb">${esc(code)}</div>
      <div class="grid2 mt"><button class="btn" id="cp">📋 Kopieren</button><button class="btn primary" id="sh">📤 Teilen</button></div>`, b => {
      b.querySelector('#cp').onclick = async () => { try { await navigator.clipboard.writeText(code); toast('Code kopiert ✓'); } catch { const r = document.createRange(); r.selectNodeContents($('#cb')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Code markiert – jetzt kopieren'); } };
      b.querySelector('#sh').onclick = async () => { if (navigator.share) { try { await navigator.share({ title: 'FitDuell', text: `Fordere mich in FitDuell heraus! Mein Freundes-Code:\n${code}` }); } catch { /* abgebrochen */ } } else b.querySelector('#cp').click(); };
    });
  }
  function addFriendModal(start) {
    const locals = users().filter(x => x.id !== S.u.id && !S.u.friends.some(f => f.kind === 'local' && f.uid === x.id));
    const demos = DEMO.filter(d => !S.u.friends.some(f => f.id === d.id));
    openModal(`<h2>Freund hinzufügen</h2>
      <h3 class="mt">Per Freundes-Code</h3><p class="small muted">Dein Freund tippt in FitDuell auf „Code teilen“ und schickt dir den Code.</p>
      <textarea class="in mt-s" id="fcode" placeholder="FX2.…">${''}</textarea><button class="btn primary block mt-s" id="fadd">Code übernehmen</button>
      ${locals.length ? `<h3 class="mt">Konten auf diesem Gerät</h3><div class="list">${locals.map(x => `<div class="li">${avatar(x.name, x.color)}<div class="grow t">${esc(x.name)}</div><button class="btn sm" data-loc="${x.id}">Hinzufügen</button></div>`).join('')}</div>` : ''}
      ${demos.length ? `<h3 class="mt">Demo-Freunde</h3><div class="list">${demos.map(x => `<div class="li">${avatar(x.name, x.color)}<div class="grow t">${esc(x.name)}</div><button class="btn sm" data-demo="${x.id}">Hinzufügen</button></div>`).join('')}</div>` : ''}`, b => {
      if (start === 'code') b.querySelector('#fcode').focus();
      b.querySelector('#fadd').onclick = async () => {
        try {
          const p = await readCode(b.querySelector('#fcode').value);
          if (p.id === S.u.id) return toast('Das ist dein eigener Code 😄');
          const ex = S.u.friends.find(f => f.id === 'code-' + p.id);
          if (ex) ex.digest = p; else S.u.friends.push({ id: 'code-' + p.id, kind: 'code', digest: p });
          save(); closeModal(); toast(ex ? `${p.name} aktualisiert ✓` : `${p.name} hinzugefügt 🎉`); rerender();
        } catch { toast('Code ungültig – bitte vollständig einfügen'); }
      };
      $$('[data-loc]', b).forEach(x => x.onclick = () => { S.u.friends.push({ id: 'loc-' + x.dataset.loc, kind: 'local', uid: x.dataset.loc }); save(); closeModal(); rerender(); });
      $$('[data-demo]', b).forEach(x => x.onclick = () => { S.u.friends.push({ id: x.dataset.demo, kind: 'demo' }); save(); closeModal(); rerender(); });
    });
  }
  function duelModal() {
    if (!S.u.friends.length) return toast('Füge zuerst einen Freund hinzu');
    const lifts = EXERCISES.filter(e => e.type === 'reps' && !e.bw);
    openModal(`<h2>⚔️ Freund herausfordern</h2><p class="small muted">Das Duell läuft 30 Tage. Der Sieger bekommt +${POINTS.duelWin} Punkte in der Gesamtwertung.</p>
      <label class="f mt"><span>Gegner</span><select class="in" id="df">${S.u.friends.map(f => `<option value="${f.id}">${esc(friendDigest(f)?.name || f.id)}</option>`).join('')}</select></label>
      <label class="f"><span>Disziplin</span><select class="in" id="dt">${Object.entries(DUEL_TYPES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('')}</select></label>
      <label class="f" id="dexw" hidden><span>Übung</span><select class="in" id="dex">${lifts.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label>
      <p class="small muted" id="ddesc"></p>
      <button class="btn primary block mt" id="dgo">Herausforderung starten</button>`, b => {
      const upd = () => { const t = $('#dt').value; $('#dexw').hidden = t !== 'max'; $('#ddesc').textContent = DUEL_TYPES[t].desc; };
      $('#dt').onchange = upd; upd();
      $('#dgo').onclick = () => {
        const d = { id: uid(), friendId: $('#df').value, type: $('#dt').value, start: today(), end: addDays(today(), 30) };
        if (d.type === 'max') d.ex = $('#dex').value;
        S.u.duels.push(d); save(); closeModal(); toast('Duell gestartet – viel Erfolg! ⚔️'); go('friends');
      };
    });
  }

  /* ===================================================================== */
  /*  PROFIL                                                               */
  /* ===================================================================== */
  function goalModal() {
    let g = S.u.profile.goal;
    openModal(`<h2>Trainingsziel</h2><div class="mt" id="gl">${Object.entries(GOALS).map(([k, x]) => `<button class="goal-card ${g === k ? 'on' : ''}" data-g="${k}"><span class="gi">${x.icon}</span><span><b>${x.label}</b><br><span class="muted small">${x.desc}</span></span></button>`).join('')}</div><button class="btn primary block" id="gs">Übernehmen</button>`, b => {
      $$('[data-g]', b).forEach(x => x.onclick = () => { g = x.dataset.g; $$('[data-g]', b).forEach(y => y.classList.toggle('on', y === x)); });
      b.querySelector('#gs').onclick = () => { S.u.profile.goal = g; S.u.planIdx = 0; save(); closeModal(); toast(`Ziel: ${GOALS[g].label}`); rerender(); };
    });
  }
  function openProfile() {
    const p = S.u.profile, c = calc(p);
    openModal(`<div class="row">${avatar(p.name, p.color, 'lg')}<div><h2>${esc(p.name)}</h2><div class="muted small">${esc(p.email || 'keine E-Mail')} · dabei seit ${fmtShort(S.u.createdAt)}</div></div></div>
      <div class="grid3 mt"><div class="stat"><div class="v">${nf(c.bmi, 1)}</div><div class="l">BMI</div></div><div class="stat"><div class="v">${nf(c.tdee)}</div><div class="l">Umsatz kcal</div></div><div class="stat"><div class="v accent">${nf(c.kcal)}</div><div class="l">Ziel kcal</div></div></div>
      <form id="pf" class="mt">
        <label class="f"><span>Name</span><input class="in" name="name" value="${esc(p.name)}" maxlength="24"></label>
        <label class="f"><span>E-Mail</span><input class="in" name="email" type="email" value="${esc(p.email || '')}"></label>
        <div class="grid2">
          <label class="f"><span>Geschlecht</span><select class="in" name="sex">${[['m', 'Männlich'], ['f', 'Weiblich'], ['d', 'Divers']].map(([k, l]) => `<option value="${k}" ${p.sex === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="f"><span>Geburtsdatum</span><input class="in" name="birth" type="date" value="${esc(p.birth || '')}"></label>
          <label class="f"><span>Größe (cm)</span><input class="in" name="heightCm" type="number" value="${esc(p.heightCm)}"></label>
          <label class="f"><span>Zielgewicht (kg)</span><input class="in" name="targetKg" type="number" step="0.1" value="${esc(p.targetKg || '')}"></label>
          <label class="f"><span>Körperfett %</span><input class="in" name="bodyFat" type="number" step="0.1" value="${esc(p.bodyFat || '')}"></label>
          <label class="f"><span>Ruhepuls</span><input class="in" name="restHr" type="number" value="${esc(p.restHr || '')}"></label>
          <label class="f"><span>Trainingstage / Woche</span><input class="in" name="days" type="number" min="1" max="7" value="${esc(p.days)}"></label>
          <label class="f"><span>Schrittziel</span><input class="in" name="stepGoal" type="number" step="500" value="${esc(p.stepGoal || 10000)}"></label>
        </div>
        <label class="f"><span>Alltagsaktivität</span><select class="in" name="activity">${ACTIVITY.map(a => `<option value="${a.id}" ${+p.activity === a.id ? 'selected' : ''}>${a.label}</option>`).join('')}</select></label>
        <label class="f"><span>Erfahrung</span><select class="in" name="level">${Object.entries(LEVELS).map(([k, l]) => `<option value="${k}" ${p.level === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="f"><span>Verletzungen / Einschränkungen</span><textarea class="in" name="injuries">${esc(p.injuries || '')}</textarea></label>
        <button class="btn primary block">Profil speichern</button></form>
      <div class="grid2 mt"><button class="btn" id="pGoal">${GOALS[p.goal].icon} Ziel ändern</button><button class="btn" id="pW">⚖️ Gewicht</button></div>
      <div class="grid2 mt"><button class="btn" id="pExp">⬇️ Daten exportieren</button><button class="btn" id="pImp">⬆️ Importieren</button></div>
      <input type="file" id="impFile" accept="application/json" hidden>
      <div class="grid2 mt"><button class="btn" id="pOut">Abmelden</button><button class="btn danger" id="pDel">Konto löschen</button></div>
      <p class="tiny muted mt">Alle Daten liegen nur auf diesem Gerät (Browser-Speicher). Nutze den Export als Sicherung.</p>`, b => {
      b.querySelector('#pf').onsubmit = e => {
        e.preventDefault(); const fd = new FormData(e.target);
        for (const [k, val] of fd.entries()) p[k] = ['heightCm', 'targetKg', 'bodyFat', 'restHr', 'days', 'stepGoal', 'activity'].includes(k) ? (val === '' ? null : +val) : val.trim();
        if (!p.name) p.name = 'Sportler'; save(); $('#profileBtn').innerHTML = avatar(p.name, p.color); closeModal(); toast('Profil gespeichert ✓'); rerender();
      };
      b.querySelector('#pGoal').onclick = goalModal; b.querySelector('#pW').onclick = weightModal;
      b.querySelector('#pOut').onclick = logout;
      b.querySelector('#pExp').onclick = () => { const blob = new Blob([JSON.stringify(S.u, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fitduell-${p.name}-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
      b.querySelector('#pImp').onclick = () => b.querySelector('#impFile').click();
      b.querySelector('#impFile').onchange = async e => {
        try { const d = JSON.parse(await e.target.files[0].text()); if (!d.profile || !Array.isArray(d.workouts)) throw 0; d.id = S.u.id; d.profile.pass = S.u.profile.pass; S.u = d; save(); closeModal(); startSession(S.u); toast('Daten importiert ✓'); }
        catch { toast('Datei konnte nicht gelesen werden'); }
      };
      b.querySelector('#pDel').onclick = () => confirmBox('Dein Konto und alle Daten werden auf diesem Gerät gelöscht.', 'Endgültig löschen', () => {
        localStorage.removeItem('fx.u.' + S.u.id); lsSet('fx.users', users().filter(x => x.id !== S.u.id)); S.u = null; localStorage.removeItem('fx.session'); showAuth('login');
      });
    });
  }

  /* ---------- Start ---------- */
  function boot() {
    const sid = localStorage.getItem('fx.session'); const u = sid && loadUser(sid);
    if (u) startSession(u); else showAuth('login');
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  boot();
})();
