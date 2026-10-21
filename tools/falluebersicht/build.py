#!/usr/bin/env python3
"""Erzeugt aus Trello-Board-Exporten (trelloReadCard list_by_board) je Partner eine Fallübersicht-HTML."""
import json, re, sys, html, os
KIT = os.path.dirname(os.path.abspath(__file__))
from datetime import datetime, timezone

DONE = re.compile(r'erledigt|fertig', re.I)
CLOSED = re.compile(r'storniert|abgelehnt|nicht erreichte|keine reaktion auf terminavise|gesperrt', re.I)
FELDER = {'name': 'Name', 'strasse': 'Strasse', 'straße': 'Strasse', 'plz': 'PLZ', 'ort': 'Ort', 'telefon': 'Telefon',
          'e-mail': 'E-Mail', 'email': 'E-Mail', 'fahrzeugmodell': 'Fahrzeug', 'fahrgestellnummer': 'FIN',
          'km-stand': 'km', 'kaufdatum': 'Kaufdatum', 'kaufort': 'Kaufort',
          'benötigte inspektion': 'Inspektion', 'nachricht': 'Nachricht', 'firma': 'Firma'}
ABSCHNITTE = {'kontaktdaten', 'fahrzeugdaten', 'datenweitergabe an servicepartner'}
LANG = {'Nachricht': 300}

def _label(line):
    """Gibt (feld, rest) zurück, wenn die Zeile mit einer bekannten Bezeichnung beginnt."""
    t = re.sub(r'^[\s>*_#-]*(\d+\.\s*)?', '', line).replace('**', '').strip()
    m = re.match(r'([A-Za-zÄÖÜäöüß\- ]+?)\s*:?\s*(?:\t+|:\s+|:$|$)(.*)$', t)
    if not m: return None, None
    k = m.group(1).strip().lower()
    if k in ABSCHNITTE: return '#', ''
    if k in FELDER: return FELDER[k], m.group(2).strip()
    return None, None

def parse_desc(desc):
    """Liest das Webformular aus – sowohl 'Name:<Tab>Wert' als auch 'Name:' mit dem Wert in der nächsten Zeile."""
    unsichtbar = re.compile(r'[\u200b-\u200f\u2060\ufeff\u00ad]')
    zeilen = [re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', unsichtbar.sub('', z)).strip() for z in (desc or '').splitlines()]
    zeilen = [z for z in zeilen if z]
    out, offen = {}, None
    for z in zeilen:
        feld, rest = _label(z)
        if feld == '#':
            offen = None; continue
        if feld:
            if rest:
                out.setdefault(feld, rest); offen = None
            else:
                offen = feld
            continue
        wert = re.sub(r'^\d+\.\s*', '', z.replace('**', '')).strip()
        if offen and wert:
            if offen in out and offen == 'Nachricht':
                out[offen] += ' ' + wert
            else:
                out.setdefault(offen, wert)
            if offen != 'Nachricht': offen = None
    for k in list(out):
        out[k] = out[k][:LANG.get(k, 120)]
    if out.get('Firma', '').lower() in ('herr', 'frau', 'divers'): out.pop('Firma')
    if 'Inspektion' in out: out['Inspektion'] = re.sub(r'^\d+\.\s*', '', out['Inspektion']).strip('() ')
    return out

PLZ_GEO = json.load(open(os.path.join(KIT, 'plz.json'), encoding='utf-8'))

def geo(desc_fields, title):
    cands = []
    p = re.sub(r'\D', '', desc_fields.get('PLZ', ''))
    if p: cands.append(p.zfill(5) if len(p) == 4 else p)
    cands += re.findall(r'(?<!\d)\d{5}(?!\d)', title or '')
    m = re.match(r'\s*(\d{4})(?!\d)', title or '')
    if m: cands.append('0' + m.group(1))
    for c in cands:
        if c in PLZ_GEO:
            lat, lng, place = PLZ_GEO[c]
            return [lat, lng], c
    return None, None

def build(export_path, partner):
    nodes = json.load(open(export_path))['cards']['nodes']
    listen, faelle, erledigt = {}, [], 0
    for c in nodes:
        lname = (c.get('list') or {}).get('name') or '–'
        if DONE.search(lname):
            erledigt += 1
            continue
        status = 'geschlossen' if CLOSED.search(lname) else 'offen'
        listen.setdefault(lname, status)
        com = sorted(c.get('comments') or [], key=lambda x: x.get('createdAt') or '', reverse=True)
        letzter = None
        if com:
            letzter = {'datum': com[0].get('createdAt'), 'text': (com[0].get('text') or '')[:280]}
        felder = parse_desc(c.get('desc'))
        g, gplz = geo(felder, c.get('name'))
        faelle.append({
            'id': len(faelle),
            'g': g, 'gp': gplz,
            't': (c.get('name') or '').strip()[:200],
            'l': lname, 's': status,
            'a': c.get('lastActivityAt'),
            'f': c.get('due'), 'fe': bool(c.get('dueComplete')),
            'u': c.get('webUrl') or c.get('url'),
            'd': felder,
            'k': letzter,
            'lb': [x.get('name') for x in (c.get('labels') or []) if x.get('name')],
        })
    return {
        'partner': partner,
        'stand': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'erledigt': erledigt,
        'listen': [{'n': n, 's': s} for n, s in listen.items()],
        'faelle': faelle,
    }

if __name__ == '__main__':
    export, partner, farbe, template, out = sys.argv[1:6]
    data = build(export, partner)
    data['farbe'] = farbe
    page = open(template, encoding='utf-8').read()
    blob = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
    page = page.replace('__PARTNER__', html.escape(partner)).replace('__DATEN__', blob)
    page = page.replace('/*__LEAFLET_CSS__*/', open(os.path.join(KIT, 'leaflet.css'), encoding='utf-8').read())
    page = page.replace('__GEO__', open(os.path.join(KIT, 'geo.json'), encoding='utf-8').read())
    offen = [f for f in data['faelle'] if f['s'] == 'offen']
    print('  geokodiert:', sum(1 for f in offen if f['g']), 'von', len(offen), 'offenen')
    open(out, 'w', encoding='utf-8').write(page)
    print(partner, len(data['faelle']), 'Fälle,', data['erledigt'], 'erledigt,', len(page)//1024, 'KB')
