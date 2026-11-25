/* Strichfiguren-Animation zum Vormachen der Übungen.
 * Winkelkonvention (Grad, Bildschirmkoordinaten): 0 = nach unten, 90 = nach vorn (rechts),
 * 180 = nach oben, -90 = nach hinten (links). Seitenansicht: Figur schaut nach rechts.
 * Pose: t = Rumpf (Hüfte→Schulter), h = Kopf-Versatz, a1/a2 = Arm nah/fern [Oberarm, Unterarm],
 * l1/l2 = Bein nah/fern [Oberschenkel, Unterschenkel], lift = Abheben vom Boden, x = Versatz,
 * c = Schlägerwinkel (Golf), r = Seil (1 unten, -1 oben).
 */
(function () {
  'use strict';
  const W = 240, H = 200, GROUND = 182, BAR_Y = 34, CX = 120;
  const L = { torso: 52, head: 11, neck: 4, ua: 25, fa: 23, th: 31, sh: 30, foot: 9 };
  const rad = d => d * Math.PI / 180;
  const dir = (a, len) => [Math.sin(rad(a)) * len, Math.cos(rad(a)) * len];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];

  function solve(p, view) {
    const pts = {};
    const t = p.t ?? 180;
    const hip = [0, 0];
    if (view === 'front') {
      const sc = add(hip, dir(t, L.torso));
      pts.hipC = hip; pts.shC = sc;
      pts.hip1 = [9, 0]; pts.hip2 = [-9, 0];
      pts.sh1 = add(sc, [16, 0]); pts.sh2 = add(sc, [-16, 0]);
      pts.head = add(sc, dir(t + (p.h || 0), L.neck + L.head));
      const a1 = p.a1 || [10, 5], a2 = p.a2 || [10, 5], l1 = p.l1 || [3, 0], l2 = p.l2 || [3, 0];
      pts.el1 = add(pts.sh1, dir(a1[0], L.ua)); pts.ha1 = add(pts.el1, dir(a1[1], L.fa));
      pts.el2 = add(pts.sh2, dir(-a2[0], L.ua)); pts.ha2 = add(pts.el2, dir(-a2[1], L.fa));
      pts.kn1 = add(pts.hip1, dir(l1[0], L.th)); pts.ft1 = add(pts.kn1, dir(l1[1], L.sh));
      pts.kn2 = add(pts.hip2, dir(-l2[0], L.th)); pts.ft2 = add(pts.kn2, dir(-l2[1], L.sh));
      pts.to1 = add(pts.ft1, [6, 0]); pts.to2 = add(pts.ft2, [-6, 0]);
    } else {
      const sh = add(hip, dir(t, L.torso));
      pts.hipC = hip; pts.shC = sh;
      pts.hip1 = hip; pts.hip2 = hip; pts.sh1 = sh; pts.sh2 = sh;
      pts.head = add(sh, dir(t + (p.h || 0), L.neck + L.head));
      const a1 = p.a1 || [5, 5], a2 = p.a2 || a1, l1 = p.l1 || [0, 0], l2 = p.l2 || l1;
      pts.el1 = add(sh, dir(a1[0], L.ua)); pts.ha1 = add(pts.el1, dir(a1[1], L.fa));
      pts.el2 = add(sh, dir(a2[0], L.ua)); pts.ha2 = add(pts.el2, dir(a2[1], L.fa));
      pts.kn1 = add(hip, dir(l1[0], L.th)); pts.ft1 = add(pts.kn1, dir(l1[1], L.sh));
      pts.kn2 = add(hip, dir(l2[0], L.th)); pts.ft2 = add(pts.kn2, dir(l2[1], L.sh));
      pts.to1 = add(pts.ft1, dir(l1[1] + 90, L.foot)); pts.to2 = add(pts.ft2, dir(l2[1] + 90, L.foot));
    }
    return pts;
  }

  function place(pts, p, anim) {
    let dx = 0, dy = 0;
    const anchorY = anim.anchorY || 'ground';
    if (anchorY === 'hands') {
      dy = (anim.handY || BAR_Y) - Math.min(pts.ha1[1], pts.ha2[1]);
    } else if (anchorY === 'hip') {
      dy = (anim.hipY || 150) - pts.hipC[1] - (p.lift || 0);
    } else {
      let maxY = -1e9;
      const keys = ['ft1', 'ft2', 'to1', 'to2', 'kn1', 'kn2', 'ha1', 'ha2', 'el1', 'el2', 'hipC', 'shC'];
      if (anim.headGround) keys.push('head');
      for (const k of keys) maxY = Math.max(maxY, pts[k][1]);
      if (anim.headGround) maxY = Math.max(maxY, pts.head[1] + L.head);
      if (anim.prop === 'barbell' && anim.plateGround) maxY = Math.max(maxY, pts.ha1[1] + 17);
      dy = GROUND - maxY - (p.lift || 0);
    }
    const fix = anim.fixX || 'foot';
    if (fix === 'hand') dx = CX - pts.ha1[0];
    else if (fix === 'hip') dx = CX - pts.hipC[0];
    else if (fix === 'center') dx = CX - (pts.hipC[0] + pts.shC[0]) / 2;
    else dx = CX - pts.ft1[0];
    dx += (p.x || 0) + (anim.offsetX || 0);
    const out = {};
    for (const k in pts) out[k] = [pts[k][0] + dx, pts[k][1] + dy];
    return out;
  }

  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * x);
  function lerp(a, b, k) {
    if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], k));
    return a + (b - a) * k;
  }
  function blend(f0, f1, k) {
    const out = {};
    const keys = new Set([...Object.keys(f0), ...Object.keys(f1)]);
    for (const key of keys) {
      const a = f0[key] ?? f1[key], b = f1[key] ?? f0[key];
      out[key] = lerp(a, b, k);
    }
    return out;
  }

  // Für Interpolation fehlende Werte mit Standardwerten füllen
  function normalize(frame, view) {
    const d = view === 'front'
      ? { t: 180, h: 0, a1: [10, 5], a2: [10, 5], l1: [3, 0], l2: [3, 0], lift: 0, x: 0 }
      : { t: 180, h: 0, a1: [5, 5], l1: [0, 0], lift: 0, x: 0 };
    const f = Object.assign({}, d, frame);
    if (view !== 'front') {
      if (!frame.a2) f.a2 = f.a1.slice();
      if (!frame.l2) f.l2 = f.l1.slice();
    }
    return f;
  }

  const seg = (a, b, w, cls) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke-width="${w}" class="${cls}"/>`;
  const circ = (c, r, cls) => `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${r}" class="${cls}"/>`;

  function drawProps(P, p, anim, layer, prop) {
    let s = '';
    const mid = [(P.ha1[0] + P.ha2[0]) / 2, (P.ha1[1] + P.ha2[1]) / 2];
    if (layer === 'back') {
      if (prop === 'bench') {
        const x1 = Math.min(P.hipC[0], P.shC[0]) - 8, x2 = Math.max(P.hipC[0], P.shC[0]) + 4;
        const y = Math.max(P.hipC[1], P.shC[1]) + 6;
        s += `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="7" rx="3" class="fx-prop"/>`;
        s += seg([x1 + 8, y + 6], [x1 + 8, GROUND], 4, 'fx-prop-l') + seg([x2 - 8, y + 6], [x2 - 8, GROUND], 4, 'fx-prop-l');
      }
      if (prop === 'barback') {
        const c = add(P.shC, [-3, -4]);
        s += circ(c, 17, 'fx-plate') + circ(c, 3, 'fx-prop');
      }
      if (prop === 'bar') {
        s += seg([30, BAR_Y], [210, BAR_Y], 4, 'fx-prop-l') + seg([34, BAR_Y], [34, GROUND], 3, 'fx-prop-l') + seg([206, BAR_Y], [206, GROUND], 3, 'fx-prop-l');
      }
      if (prop === 'dipbars') {
        const y = P.ha1[1] + 3;
        s += seg([P.ha1[0] - 40, y], [P.ha1[0] + 30, y], 4, 'fx-prop-l') + seg([P.ha1[0] + 26, y], [P.ha1[0] + 26, GROUND], 3, 'fx-prop-l') + seg([P.ha1[0] - 36, y], [P.ha1[0] - 36, GROUND], 3, 'fx-prop-l');
      }
      if (prop === 'box') {
        s += `<rect x="${CX + (anim.boxX || 10)}" y="${GROUND - 40}" width="62" height="40" rx="3" class="fx-prop"/>`;
      }
      if (prop === 'rower') {
        const y = P.hipC[1] + 6;
        s += seg([P.hipC[0] - 50, y], [P.hipC[0] + 110, y], 4, 'fx-prop-l');
        s += `<rect x="${P.hipC[0] - 14}" y="${y - 5}" width="26" height="6" rx="2" class="fx-prop"/>`;
        s += circ([CX + 82, y - 18], 16, 'fx-prop');
        s += seg([CX + 82, y - 18], P.ha1, 1.5, 'fx-prop-l');
        s += seg([P.hipC[0] - 40, y], [P.hipC[0] - 40, GROUND], 3, 'fx-prop-l') + seg([CX + 82, y], [CX + 82, GROUND], 3, 'fx-prop-l');
      }
      if (prop === 'skierg') {
        const x = CX + 62;
        s += `<rect x="${x}" y="22" width="14" height="${GROUND - 22}" rx="3" class="fx-prop"/>`;
        s += seg([x + 2, 30], P.ha1, 1.5, 'fx-prop-l') + seg([x + 2, 30], P.ha2, 1.5, 'fx-prop-l');
      }
      if (prop === 'bike') {
        const bx = anim.bikeX || CX;
        s += circ([bx - 42, GROUND - 24], 24, 'fx-wheel') + circ([bx + 58, GROUND - 24], 24, 'fx-wheel');
        s += seg([bx - 42, GROUND - 24], [P.hipC[0], P.hipC[1] + 6], 3, 'fx-prop-l');
        s += seg([P.hipC[0], P.hipC[1] + 6], [bx + 8, GROUND - 26], 3, 'fx-prop-l');
        s += seg([bx + 8, GROUND - 26], [bx + 58, GROUND - 24], 3, 'fx-prop-l');
        s += seg([bx + 8, GROUND - 26], [P.ha1[0] - 4, P.ha1[1] + 4], 3, 'fx-prop-l');
        s += seg([P.hipC[0], P.hipC[1] + 6], [bx - 42, GROUND - 24], 3, 'fx-prop-l');
        s += seg([P.hipC[0] - 8, P.hipC[1] + 3], [P.hipC[0] + 10, P.hipC[1] + 3], 4, 'fx-prop-l');
      }
      if (prop === 'sledpull') {
        s += `<rect x="${CX + 78}" y="${GROUND - 22}" width="36" height="22" rx="3" class="fx-prop"/>`;
        s += seg(P.ha1, [CX + 80, GROUND - 12], 2, 'fx-prop-l');
      }
    } else {
      if (prop === 'dumbbell' || prop === 'kb2') {
        for (const h of [P.ha2, P.ha1]) {
          if (prop === 'kb2') s += circ([h[0], h[1] + 9], 8, 'fx-prop');
          else s += `<rect x="${h[0] - 9}" y="${h[1] - 4}" width="18" height="8" rx="3" class="fx-prop"/>`;
        }
      }
      if (prop === 'barbell') {
        s += circ(P.ha1, 17, 'fx-plate') + circ(P.ha1, 3, 'fx-prop');
      }
      if (prop === 'kettlebell') {
        s += circ([mid[0], mid[1] + 10], 10, 'fx-prop') + `<path d="M${mid[0] - 6} ${mid[1] + 3} Q${mid[0]} ${mid[1] - 6} ${mid[0] + 6} ${mid[1] + 3}" class="fx-prop-l" stroke-width="3" fill="none"/>`;
      }
      if (prop === 'ball') {
        const off = p.ballY || 0;
        s += circ([mid[0] + 4, mid[1] - 6 + off], 12, 'fx-ball');
      }
      if (prop === 'sandbag') {
        const c = add(P.shC, [-2, -6]);
        s += `<ellipse cx="${c[0]}" cy="${c[1]}" rx="22" ry="9" class="fx-ball"/>`;
      }
      if (prop === 'sled') {
        const x = P.ha1[0] + 2;
        s += `<rect x="${x}" y="${P.ha1[1] - 6}" width="10" height="${GROUND - P.ha1[1] + 6}" rx="2" class="fx-prop"/>`;
        s += `<rect x="${x}" y="${GROUND - 26}" width="56" height="26" rx="3" class="fx-prop"/>`;
      }
      if (prop === 'club') {
        const c = p.c ?? 0;
        const end = add(mid, dir(c, 68));
        s += seg(mid, end, 2.5, 'fx-club') + seg(end, add(end, dir(c + 90, 9)), 5, 'fx-club');
      }
      if (prop === 'rope') {
        const r = p.r ?? 1;
        const y = r > 0 ? GROUND + 6 : P.head[1] - 34;
        const cy = mid[1] + (y - mid[1]) * 2 * Math.abs(r);
        s += `<path d="M${P.ha2[0]} ${P.ha2[1]} Q${mid[0]} ${cy} ${P.ha1[0]} ${P.ha1[1]}" fill="none" stroke-width="2" class="fx-prop-l"/>`;
      }
    }
    return s;
  }

  // Horizontale Zentrierung über alle Keyframes (einmalig berechnet)
  function autoOffset(anim) {
    if (anim._ox !== undefined) return anim._ox;
    let mn = 1e9, mx = -1e9;
    const n = anim.frames.length;
    for (let i = 0; i < n * 4; i++) {
      const f = frameAt(anim, (anim.dur || 2) * i / (n * 4));
      const P = place(solve(f, anim.view || 'side'), f, anim);
      for (const k in P) { mn = Math.min(mn, P[k][0]); mx = Math.max(mx, P[k][0]); }
      mn = Math.min(mn, P.head[0] - L.head); mx = Math.max(mx, P.head[0] + L.head);
    }
    if (['sled', 'rower', 'skierg', 'sledpull', 'box', 'bike'].includes(anim.prop)) { anim._ox = 0; return 0; }
    anim._ox = Math.round(CX - (mn + mx) / 2);
    return anim._ox;
  }

  function render(frame, anim) {
    const view = anim.view || 'side';
    const P = place(solve(frame, view), frame, anim);
    let s = `<line x1="8" y1="${GROUND}" x2="${W - 8}" y2="${GROUND}" class="fx-ground" stroke-width="3"/>`;
    s += `<g transform="translate(${autoOffset(anim)} 0)">`;
    for (const pr of [anim.prop, anim.extraProp]) if (pr) s += drawProps(P, frame, anim, 'back', pr);
    // ferne Gliedmaßen
    s += `<g class="fx-far">${seg(P.hip2, P.kn2, 8, 'fx-limb')}${seg(P.kn2, P.ft2, 7, 'fx-limb')}${seg(P.ft2, P.to2, 5, 'fx-limb')}`;
    s += `${seg(P.sh2, P.el2, 7, 'fx-limb')}${seg(P.el2, P.ha2, 6, 'fx-limb')}</g>`;
    // Rumpf + Kopf
    if (view === 'front') {
      s += `<path d="M${P.sh1[0]} ${P.sh1[1]} L${P.sh2[0]} ${P.sh2[1]} L${P.hip2[0]} ${P.hip2[1]} L${P.hip1[0]} ${P.hip1[1]} Z" class="fx-torso"/>`;
    } else {
      s += seg(P.hipC, P.shC, 13, 'fx-body');
    }
    s += circ(P.head, L.head, 'fx-head');
    // nahe Gliedmaßen
    s += `${seg(P.hip1, P.kn1, 9, 'fx-limb fx-near')}${seg(P.kn1, P.ft1, 8, 'fx-limb fx-near')}${seg(P.ft1, P.to1, 6, 'fx-limb fx-near')}`;
    for (const pr of [anim.prop, anim.extraProp]) if (pr) s += drawProps(P, frame, anim, 'front', pr);
    s += `${seg(P.sh1, P.el1, 8, 'fx-limb fx-near')}${seg(P.el1, P.ha1, 7, 'fx-limb fx-near')}`;
    s += circ(P.kn1, 3, 'fx-joint') + circ(P.el1, 3, 'fx-joint');
    return s + '</g>';
  }

  function frameAt(anim, time) {
    const frames = anim.frames.map(f => normalize(f, anim.view));
    const n = frames.length;
    if (n === 1) return frames[0];
    const dur = anim.dur || 2;
    const cyc = ((time / dur) % 1 + 1) % 1;
    const pos = cyc * n;
    const i = Math.floor(pos), k = ease(pos - i);
    return blend(frames[i], frames[(i + 1) % n], k);
  }

  function svgShell(inner, cls) {
    return `<svg viewBox="0 0 ${W} ${H}" class="fx-svg ${cls || ''}" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;
  }

  /** Standbild (für Listen) */
  function still(anim, phase) {
    const n = anim.frames.length;
    const ph = phase ?? anim.stillAt ?? (n > 1 ? 1 / n : 0);
    const f = frameAt(anim, (anim.dur || 2) * ph);
    return svgShell(render(f, anim), 'fx-still');
  }

  /** Animation in Container abspielen; liefert Controller */
  function play(container, anim) {
    container.innerHTML = svgShell('', 'fx-live');
    const svg = container.firstChild;
    let speed = 1, playing = true, t = 0, last = performance.now(), raf = 0, alive = true;
    function tick(now) {
      if (!alive) return;
      if (!container.isConnected) { alive = false; return; }
      const dt = (now - last) / 1000; last = now;
      if (playing) t += dt * speed;
      svg.innerHTML = render(frameAt(anim, t), anim);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return {
      toggle() { playing = !playing; return playing; },
      setSpeed(s) { speed = s; },
      stop() { alive = false; cancelAnimationFrame(raf); },
      get playing() { return playing; }
    };
  }

  window.FigureAnim = { play, still, render, frameAt, svgShell };
})();
