#!/usr/bin/env python3
"""Baut das passwortgeschützte Händler-Cockpit für GitHub Pages.

Aufruf:
  HC_PASSWORT=... python3 tools/haendler-cockpit/build.py <products.json> <reviews.json> [stand]

Schreibt haendler-cockpit/index.html. Produkt- und Bewertungsdaten werden mit AES-256-GCM
verschlüsselt (Schlüssel per PBKDF2-SHA256 aus dem Team-Passwort), genau wie bei der
Fallübersicht. Im Repository und im Netz liegt nur der verschlüsselte Block; das Passwort
und die Klartext-Daten gehören NICHT ins Repository.
"""
import base64, datetime, json, os, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITER = 250000
HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HIER))
b64 = lambda b: base64.b64encode(b).decode()


def verschluesseln(text, passwort):
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(passwort.encode())
    ct = AESGCM(key).encrypt(iv, text.encode(), None)
    return {'v': 1, 'n': ITER, 's': b64(salt), 'i': b64(iv), 'c': b64(ct)}


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    pw = os.environ.get('HC_PASSWORT', '').strip()
    if len(pw) < 12:
        sys.exit('HC_PASSWORT fehlt oder ist zu kurz (mind. 12 Zeichen).')
    products = json.load(open(sys.argv[1], encoding='utf-8'))
    reviews = json.load(open(sys.argv[2], encoding='utf-8'))
    stand = sys.argv[3] if len(sys.argv) > 3 else datetime.date.today().strftime('%d.%m.%Y')
    daten = json.dumps({'products': products, 'reviews': reviews, 'stand': stand}, ensure_ascii=False)
    enc = json.dumps(verschluesseln(daten, pw))
    page = open(os.path.join(HIER, 'page.html'), encoding='utf-8').read()
    page = page.replace('<meta name="dash-one-writer">', '')
    shell = open(os.path.join(HIER, 'shell.html'), encoding='utf-8').read()
    html = shell.replace('__PAGE__', page).replace('__ENC__', enc)
    ziel = os.path.join(REPO, 'haendler-cockpit', 'index.html')
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    open(ziel, 'w', encoding='utf-8').write(html)
    print(f'{ziel}: {len(products)} Produktseiten, {len(reviews)} Bewertungen, Stand {stand}')


if __name__ == '__main__':
    main()
