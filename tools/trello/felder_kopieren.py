#!/usr/bin/env python3
"""Kopiert die benutzerdefinierten Felder von einem Trello-Board auf ein anderes
und legt zusätzliche Felder an. Bereits vorhandene Felder (gleicher Name) werden übersprungen.
Schreibt ein Protokoll nach tools/trello/ergebnis.txt (ohne Schlüssel)."""
import json, os, urllib.request, urllib.parse

KEY, TOKEN = os.environ['TRELLO_KEY'].strip(), os.environ['TRELLO_TOKEN'].strip()
AUTH = f'OAuth oauth_consumer_key="{KEY}", oauth_token="{TOKEN}"'
QUELLE = '5ff716d69a7ac4581abee2f6'   # Aufträge Norderstedt
ZIEL = '6981e822cf4fd3d928e7da65'     # Test Board Automation
EXTRA = [{'name': 'Telefonnummer', 'type': 'text'}]
log = []

def api(method, path, body=None):
    url = 'https://api.trello.com/1' + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': AUTH})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read() or b'null')

def pruefen():
    for name, pfad in [('Benutzer', '/members/me'),
                       ('Board Norderstedt', f'/boards/{QUELLE}'), ('Test Board', f'/boards/{ZIEL}')]:
        try:
            r = api('GET', pfad)
            if name == 'Token':
                log.append('Token-Rechte: ' + json.dumps([{'typ': x.get('modelType'), 'lesen': x.get('read'), 'schreiben': x.get('write')} for x in r.get('permissions', [])]))
            elif name == 'Benutzer':
                log.append('Token gehört zu: ' + r.get('fullName', '?'))
            else:
                log.append(f'{name}: lesbar')
        except Exception as ex:
            log.append(f'{name}: FEHLER {ex}')

pruefen()
try:
    quelle = sorted(api('GET', f'/boards/{QUELLE}/customFields'), key=lambda f: f['pos'])
    vorhanden = {f['name'] for f in api('GET', f'/boards/{ZIEL}/customFields')}
    felder = [{'name': f['name'], 'type': f['type'], 'options': f.get('options') or [],
               'display': (f.get('display') or {}).get('cardFront', True)} for f in quelle]
    # Telefonnummer direkt hinter Email einsortieren
    i = next((n + 1 for n, f in enumerate(felder) if f['name'] == 'Email'), len(felder))
    for e in EXTRA:
        felder.insert(i, {**e, 'options': [], 'display': True}); i += 1
    pos = 1024
    for f in felder:
        pos += 1024
        if f['name'] in vorhanden:
            log.append(f"übersprungen (schon da): {f['name']}"); continue
        body = {'idModel': ZIEL, 'modelType': 'board', 'name': f['name'], 'type': f['type'],
                'pos': pos, 'display_cardFront': f['display']}
        if f['type'] == 'list':
            body['options'] = [{'value': {'text': o['value']['text']}, 'color': o.get('color', 'none'), 'pos': o['pos']}
                               for o in f['options']]
        try:
            api('POST', '/customFields', body)
            log.append(f"angelegt: {f['name']} ({f['type']})")
        except Exception as ex:
            log.append(f"FEHLER bei {f['name']}: {ex}")
except Exception as ex:
    log.append(f'FEHLER: {ex}')

open('tools/trello/ergebnis.txt', 'w', encoding='utf-8').write('\n'.join(log) + '\n')
print('\n'.join(log))
