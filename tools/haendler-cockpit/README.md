# Händler-Cockpit (Alpha Motors & GreenStreet)

Passwortgeschützte Übersicht über Listungen, Preise, Auffälligkeiten und Bewertungen bei
Lidl, Netto, hagebau und Kaufland. Erreichbar unter `/haendler-cockpit/`.

- `page.html` – die Cockpit-Seite (gleiche Seite wie das Claude-Dashboard)
- `shell.html` – Login, Entschlüsselung und ein kleiner Ersatz für die Dashboard-Laufzeit
- `build.py` – verschlüsselt die Daten (AES-256-GCM, PBKDF2) und schreibt `haendler-cockpit/index.html`

Aktualisieren: `HC_PASSWORT=… python3 tools/haendler-cockpit/build.py products.json reviews.json [Stand]`

Passwort und Klartext-Daten (products.json, reviews.json) gehören nicht ins Repository.
