#!/usr/bin/env python3
"""Baut eine passwortgeschützte Fallübersicht für GitHub Pages.

Aufruf: python3 build_gh.py <trello-export> <name> <farbe> <template.html> <passwort> <ausgabe.html>

Die Falldaten werden mit AES-256-GCM verschlüsselt (Schlüssel per PBKDF2-SHA256 aus dem
Partner-Passwort). Im Netz liegt nur der verschlüsselte Block; entschlüsselt wird im Browser.
"""
import base64, html, json, os, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B  # gleiche Datenaufbereitung wie die Claude-Seiten

ITER = 250000
b64 = lambda b: base64.b64encode(b).decode()

def verschluesseln(text, passwort):
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(passwort.encode())
    ct = AESGCM(key).encrypt(iv, text.encode(), None)
    return {'v': 1, 'n': ITER, 's': b64(salt), 'i': b64(iv), 'c': b64(ct)}

LOGIN = r"""
<div class="gate" id="gate">
  <form class="gcard" id="gform" autocomplete="on">
    <div class="gmark" aria-hidden="true">__INITIAL__</div>
    <small>Alpha-Mobil · Mobiler Service</small>
    <h1>Fallübersicht __PARTNER__</h1>
    <p>Bitte gib das Passwort ein, das du von Alpha-Mobil bekommen hast.</p>
    <input type="text" name="username" value="__PARTNER__" autocomplete="username" hidden>
    <label for="gpw">Passwort</label>
    <input type="password" id="gpw" autocomplete="current-password" required>
    <label class="gkeep" for="gkeep"><input type="checkbox" id="gkeep" checked> Auf diesem Gerät angemeldet bleiben</label>
    <button type="submit" id="gbtn">Öffnen</button>
    <p class="gerr" id="gerr" role="alert" hidden></p>
  </form>
</div>
<style>
.gate{position:fixed;inset:0;z-index:2000;background:var(--bg);display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px));overflow:auto}
.gcard{width:100%;max-width:380px;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:16px;padding:28px 24px;display:flex;flex-direction:column;gap:10px;box-shadow:0 20px 40px -20px rgba(16,24,40,.18)}
.gmark{width:44px;height:44px;border-radius:12px;background:var(--partner);display:grid;place-items:center;font:700 18px/1 var(--f-display);color:#0a0e13}
.gcard small{font:500 11px/1.4 var(--f-mono);letter-spacing:1.6px;text-transform:uppercase;color:var(--muted);margin-top:6px}
.gcard h1{margin:0;font:700 22px/1.2 var(--f-display)}
.gcard p{margin:0 0 6px;color:var(--muted);font-size:13.5px}
.gcard label{font-size:12.5px;font-weight:600}
.gcard input[type=password]{font:inherit;font-size:16px;color:var(--text);background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:12px;min-height:46px}
.gcard input[type=password]:focus-visible{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.gkeep{display:flex;align-items:center;gap:8px;font-weight:500!important;color:var(--muted)}
.gkeep input{width:18px;height:18px;accent-color:var(--accent)}
.gcard button{font:600 15px/1 var(--f-body);color:#fff;background:#004177;border:0;border-radius:10px;padding:14px;cursor:pointer;min-height:46px;margin-top:4px}
.gcard button:disabled{opacity:.6}
.gerr{color:var(--bad)!important;font-weight:600;margin:0!important}
.logout{display:inline-flex;align-items:center;font:600 12.5px/1 var(--f-body);color:var(--text);background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:8px 14px;cursor:pointer;min-height:34px}
.logout:hover{border-color:var(--accent)}
</style>
<script>
(function(){
  const ENC = JSON.parse(document.getElementById('enc').textContent);
  const KEY = 'fu_pw___ID__';
  const $ = id => document.getElementById(id);
  const ub = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  let gespeichert = null;
  try { gespeichert = localStorage.getItem(KEY); } catch (e) {}

  async function oeffnen(pw){
    if (!window.crypto || !crypto.subtle) throw new Error('Dieser Browser unterstützt keine Verschlüsselung. Bitte einen aktuellen Browser verwenden.');
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: ub(ENC.s), iterations: ENC.n, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: ub(ENC.i)}, key, ub(ENC.c));
    return JSON.parse(new TextDecoder().decode(plain));
  }
  function start(D, pw, merken){
    try { merken ? localStorage.setItem(KEY, pw) : localStorage.removeItem(KEY); } catch (e) {}
    $('gate').hidden = true;
    fuStart(D);
    const out = document.createElement('button');
    out.type = 'button'; out.className = 'logout'; out.textContent = 'Abmelden';
    out.addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); });
    const tr = document.querySelector('.topr'); if (tr) tr.appendChild(out);
    if (D.dispatch) frischButton(D.dispatch);
  }
  // Aktualisieren-Button: startet den GitHub-Ablauf, der die Daten neu aus Trello holt,
  // und lädt die Seite neu, sobald die neue Version online ist.
  function frischButton(cfg){
    const alt = $('reload'); if (!alt) return;
    const btn = alt.cloneNode(true); alt.replaceWith(btn);
    btn.title = 'Holt die aktuellen Fälle aus Trello (dauert etwa 2–4 Minuten).';
    const txt = t => { btn.lastChild.textContent = t; };
    const seite = () => location.pathname + '?t=' + Date.now();
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('busy')) return;
      btn.classList.add('busy'); txt('Hole Daten aus Trello …');
      try {
        const r = await fetch('https://api.github.com/repos/' + cfg.repo + '/actions/workflows/' + cfg.workflow + '/dispatches', {
          method: 'POST',
          headers: {'Authorization': 'Bearer ' + cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'},
          body: JSON.stringify({ref: cfg.ref || 'main'})
        });
        if (r.status !== 204) throw new Error('Start fehlgeschlagen (' + r.status + ')');
      } catch (e) {
        btn.classList.remove('busy'); txt('Fehler – erneut versuchen');
        btn.title = 'Die Aktualisierung konnte nicht gestartet werden: ' + (e.message || e);
        return;
      }
      const start = Date.now();
      const tick = setInterval(() => { const s = Math.round((Date.now() - start) / 1000); txt('Wird aktualisiert … ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')); }, 1000);
      const pruefen = async () => {
        try {
          const h = await (await fetch(seite(), {cache: 'no-store'})).text();
          const m = h.match(/<script id="enc" type="application\/json">([^<]*)<\/script>/);
          if (m && JSON.parse(m[1]).c !== ENC.c) { clearInterval(tick); txt('Fertig – lade neu …'); location.replace(seite()); return; }
        } catch (e) {}
        if (Date.now() - start > 8 * 60 * 1000) { clearInterval(tick); btn.classList.remove('busy'); txt('Dauert länger – später neu laden'); return; }
        setTimeout(pruefen, 15000);
      };
      setTimeout(pruefen, 45000);
    });
  }
  $('gform').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = $('gpw').value.trim(); if (!pw) return;
    $('gbtn').disabled = true; $('gbtn').textContent = 'Wird geöffnet …'; $('gerr').hidden = true;
    try { start(await oeffnen(pw), pw, $('gkeep').checked); }
    catch (err) {
      $('gerr').textContent = err && err.name === 'OperationError' ? 'Das Passwort stimmt nicht. Bitte noch einmal versuchen.' : (err.message || 'Die Seite konnte nicht geöffnet werden.');
      $('gerr').hidden = false; $('gpw').select();
    } finally { $('gbtn').disabled = false; $('gbtn').textContent = 'Öffnen'; }
  });
  if (gespeichert){
    oeffnen(gespeichert).then(D => start(D, gespeichert, true)).catch(() => { try { localStorage.removeItem(KEY); } catch (e) {} $('gpw').focus(); });
  } else { $('gpw').focus(); }
})();
</script>
"""

HEAD = """<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<link rel="icon" href="../../icon-192.png">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
<script>window.FU_LOCKED = true; window.FU_TILES = true;</script>
</head>
<body>
"""

if __name__ == '__main__':
    export, partner, farbe, template, passwort, out = sys.argv[1:7]
    pid = os.path.basename(os.path.dirname(os.path.abspath(out))) or partner.lower()
    data = B.build(export, partner)
    data['farbe'] = farbe
    if os.environ.get('FU_DISPATCH_TOKEN'):
        # nur verschlüsselt in der Seite: erst nach Passworteingabe lesbar
        data['dispatch'] = {'repo': os.environ.get('FU_REPO', 'AlphaMobil/Werkstattsuche'),
                            'workflow': 'falluebersicht.yml', 'ref': 'main',
                            'token': os.environ['FU_DISPATCH_TOKEN']}
    enc = verschluesseln(json.dumps(data, ensure_ascii=False), passwort)
    page = open(template, encoding='utf-8').read()
    page = (page.replace('__PARTNER__', html.escape(partner))
                .replace('__DATEN__', 'null')
                .replace('__GEO__', '{"type":"FeatureCollection","features":[]}')
                .replace('/*__LEAFLET_CSS__*/', open(os.path.join(B.KIT, 'leaflet.css'), encoding='utf-8').read()))
    # <title> gehört in den <head>; die Claude-spezifische Meta-Angabe entfällt
    import re
    m = re.search(r'<title>.*?</title>\n?', page)
    titel = m.group(0) if m else ''
    page = page.replace(titel, '', 1).replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
    login = (LOGIN.replace('__PARTNER__', html.escape(partner)).replace('__INITIAL__', html.escape(partner[:1].upper()))
                  .replace('__ID__', pid))
    enc_tag = '<script id="enc" type="application/json">' + json.dumps(enc) + '</script>\n'
    doc = HEAD.replace('</head>', titel + '</head>') + page + '\n' + enc_tag + login + '<script>document.documentElement.style.setProperty("--partner", ' + json.dumps(farbe) + ');</script>\n</body>\n</html>\n'
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(doc)
    offen = sum(1 for f in data['faelle'] if f['s'] == 'offen')
    print(partner, offen, 'offene Fälle,', len(doc) // 1024, 'KB (verschlüsselt)')
