#!/usr/bin/env python3
"""Aktualisiert alle Partner-Fallübersichten direkt aus der Trello-API (für GitHub Actions).

Erwartete Umgebungsvariablen (als GitHub-Secrets hinterlegt):
  TRELLO_KEY, TRELLO_TOKEN  – Trello-API-Zugang (nur Lesen nötig)
  FU_PARTNER                – Inhalt von partner.json (id, name, farbe, board, pw je Partner)
  FU_DISPATCH_TOKEN         – optional: GitHub-Token, mit dem der Aktualisieren-Button diesen Ablauf startet

Passwörter und Schlüssel werden nie ausgegeben.
"""
import json, os, re, subprocess, sys, tempfile, time, urllib.request, urllib.error

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, '..', '..'))
API = 'https://api.trello.com/1'


def trello(pfad, **params):
    q = '&'.join(f'{k}={urllib.request.quote(str(v))}' for k, v in params.items())
    url = f'{API}{pfad}' + (f'?{q}' if q else '')
    auth = f'OAuth oauth_consumer_key="{os.environ["TRELLO_KEY"]}", oauth_token="{os.environ["TRELLO_TOKEN"]}"'
    for versuch in range(3):
        try:
            req = urllib.request.Request(url, headers={'Authorization': auth, 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(5 * (versuch + 1)); continue
            raise RuntimeError(f'Trello antwortet mit HTTP {e.code} für {pfad}') from None
        except urllib.error.URLError:
            time.sleep(5 * (versuch + 1))
    raise RuntimeError(f'Trello nicht erreichbar ({pfad})')


def board_id(url):
    m = re.search(r'/b/([A-Za-z0-9]+)', url)
    return m.group(1) if m else url


def export(board_url):
    """Holt offene Karten, Listen und den jeweils letzten Kommentar und liefert das Format,
    das build.py erwartet: {"cards": {"nodes": [...]}}."""
    bid = board_id(board_url)
    listen = {l['id']: l['name'] for l in trello(f'/boards/{bid}/lists/all', fields='name')}
    karten = trello(f'/boards/{bid}/cards/open',
                    fields='name,desc,due,dueComplete,dateLastActivity,shortUrl,url,idList,labels')
    offen = {k['id'] for k in karten}
    letzter = {}
    before, seiten = None, 0
    while seiten < 20 and len(letzter) < len(offen):
        params = dict(filter='commentCard', fields='data,date', limit=1000)
        if before: params['before'] = before
        acts = trello(f'/boards/{bid}/actions', **params)
        if not acts: break
        for a in acts:  # neueste zuerst
            cid = ((a.get('data') or {}).get('card') or {}).get('id')
            if cid in offen and cid not in letzter:
                letzter[cid] = {'createdAt': a.get('date'), 'text': (a.get('data') or {}).get('text') or ''}
        before, seiten = acts[-1]['id'], seiten + 1
        if len(acts) < 1000: break
    nodes = []
    for k in karten:
        nodes.append({
            'name': k.get('name'), 'desc': k.get('desc'),
            'due': k.get('due'), 'dueComplete': k.get('dueComplete'),
            'lastActivityAt': k.get('dateLastActivity'),
            'webUrl': k.get('shortUrl') or k.get('url'), 'url': k.get('url'),
            'list': {'name': listen.get(k.get('idList'), '–')},
            'labels': [{'name': l.get('name')} for l in (k.get('labels') or [])],
            'comments': [letzter[k['id']]] if k['id'] in letzter else [],
        })
    return {'cards': {'nodes': nodes}}


def main():
    fehlt = [v for v in ('TRELLO_KEY', 'TRELLO_TOKEN', 'FU_PARTNER') if not os.environ.get(v)]
    if fehlt:
        print('Noch nicht eingerichtet – fehlende GitHub-Secrets: ' + ', '.join(fehlt) + '. Nichts geändert.')
        return
    partner = json.loads(os.environ['FU_PARTNER'])
    ergebnis = []
    for p in partner:
        ziel = os.path.join(REPO, 'falluebersicht', p['id'], 'index.html')
        try:
            daten = export(p['board'])
            if not daten['cards']['nodes']:
                raise RuntimeError('0 Karten')
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as f:
                json.dump(daten, f, ensure_ascii=False); pfad = f.name
            r = subprocess.run([sys.executable, os.path.join(HIER, 'build_gh.py'), pfad, p['name'], p['farbe'],
                                os.path.join(HIER, 'template.html'), p['pw'], ziel],
                               capture_output=True, text=True)
            os.unlink(pfad)
            if r.returncode != 0:
                raise RuntimeError('Skriptfehler: ' + (r.stderr.strip().splitlines() or ['?'])[-1])
            ergebnis.append(r.stdout.strip().splitlines()[-1] + ' – aktualisiert')
        except Exception as e:
            subprocess.run(['git', 'checkout', '--', ziel], cwd=REPO, capture_output=True)
            ergebnis.append(f"{p['name']}: übersprungen ({e})")
    print('\n'.join(ergebnis))
    zusammenfassung = os.environ.get('GITHUB_STEP_SUMMARY')
    if zusammenfassung:
        with open(zusammenfassung, 'a', encoding='utf-8') as f:
            f.write('\n'.join('- ' + z for z in ergebnis) + '\n')


if __name__ == '__main__':
    main()
