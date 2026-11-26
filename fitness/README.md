# FitDuell – Fitness-App mit Wettkampf gegen Freunde

Installierbare Web-App (PWA). Läuft komplett im Browser, ohne Build-Schritt und ohne Server. Über GitHub Pages erreichbar unter `…/fitness/`.

## Funktionen

| Bereich | Inhalt |
|---|---|
| **Registrierung** | Konto anlegen (Name, E-Mail, Passwort, Profilfarbe), Körperdaten (Geschlecht, Geburtsdatum, Größe, Gewicht, Zielgewicht, Körperfett, Ruhepuls), Alltagsaktivität, Erfahrung, Trainingstage, Schrittziel, Verletzungen. Daraus berechnet: BMI, Grund- und Gesamtumsatz, Kalorienziel, Makros und Wasserbedarf. |
| **Ziele** | Abnehmen · Muskelaufbau · Ausdauer · Golf-spezifisch · HYROX-spezifisch. Jedes Ziel hat eigene Trainingspläne und eigene Kalorien- und Makroziele. |
| **Übungen** | 37 Übungen mit Suche und Filtern nach Kategorie und Ziel, Favoriten (★) und Anleitung. Jede Übung wird von einer animierten Strichfigur vorgemacht (Tempo einstellbar). |
| **Training** | Geführter Live-Modus mit Sätzen, Gewicht, Satz-Timer und Pause-Timer. Einheiten lassen sich auch nachtragen. |
| **Tracker** | Schritte (manuell oder Live-Schrittzähler über den Bewegungssensor des Handys), Gewichtsverlauf, Wasser, Trainingsvolumen und Verlauf. |
| **Wochen-Challenge** | Jede Woche eine neue Challenge, für alle Freunde dieselbe. Geschafft: **+100 Punkte**, verpasst: **−75 Punkte** in der Wertung. Die erste Woche ist straffrei. |
| **Freunde & Duelle** | Rangliste (diese Woche / gesamt). 30-Tage-Duelle: mehr Gewicht bewegt, höchstes Gewicht bei einer Übung, mehr abgenommen, mehr Trainings, mehr Schritte. |
| **Ernährung** | Barcode-Scanner per Kamera mit Daten von Open Food Facts, Online-Produktsuche, Basis-Lebensmittel offline, manuelle Eingabe. Dazu Tagesübersicht (kcal, Eiweiß, Kohlenhydrate, Fett) und Wochenübersicht. |

## Freunde & Online-Rangliste

Es gibt zwei Modi, die sich kombinieren lassen:

**Online (empfohlen, Supabase):** Freunde sehen deinen Stand automatisch und in Echtzeit auf jedem Gerät. Man fügt sich gegenseitig über einen 10-stelligen Online-Code hinzu. Duelle sehen beide Seiten. Die App lädt dabei nur eine Tages-Zusammenfassung hoch (Name, Ziel, Trainings, Volumen, Schritte, Gewicht der letzten ~60 Tage). Die Row-Level-Security in der Datenbank sorgt dafür, dass nur bestätigte Freunde diese Daten lesen können.

**Offline (ohne Server):** Alle Daten liegen im `localStorage`. Freunde kommen per Offline-Freundes-Code (Momentaufnahme, muss neu geschickt werden), über Konten auf demselben Gerät oder als Demo-Freunde in die Rangliste.

### Online-Modus einrichten (einmalig, ca. 5 Minuten)

1. Auf [supabase.com](https://supabase.com) kostenlos ein Projekt anlegen.
2. Im Projekt **SQL Editor** öffnen, den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und **Run** drücken.
3. Unter **Project Settings → API** die **Project URL** und den **anon public**-Schlüssel kopieren und in [`config.js`](config.js) eintragen, dann committen.
4. Optional: Unter **Authentication → Providers → Email** die Option „Confirm email“ ausschalten. Dann entfällt der Bestätigungslink bei der Registrierung.

Danach erscheint in der App unter **Freunde** der Button **„Online verbinden“**. Zum Ausprobieren ohne Commit lassen sich URL und Schlüssel in der App auch nur für das eigene Gerät hinterlegen („Online-Modus einrichten“).

## Dateien

- `index.html`, `style.css`: Oberfläche
- `app.js`: Logik (Konten, Berechnungen, Punkte, Ansichten, Scanner, Schrittzähler)
- `cloud.js`, `config.js`, `supabase/schema.sql`: Online-Rangliste (Supabase: Konto, Freunde, Duelle, Echtzeit)
- `data.js`: Ziele, Übungen inkl. Animations-Keyframes, Pläne, Challenges, Lebensmittel
- `anim.js`: Renderer für die Strichfiguren
- `sw.js`, `manifest.webmanifest`, Icons: Offline-Fähigkeit und Installation

Hinweis: Kamera, Bewegungssensor und Service Worker funktionieren nur über HTTPS (z. B. GitHub Pages) oder `localhost`.
