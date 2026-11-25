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

## Freunde ohne Server

Alle Daten liegen im `localStorage` des Geräts. Freunde kommen auf drei Wegen in die Rangliste:

1. **Freundes-Code:** „Code teilen“ erzeugt einen komprimierten Code mit den Werten der letzten ~60 Tage. Der Freund fügt ihn ein, und ein erneutes Einfügen aktualisiert den Stand.
2. **Konten auf demselben Gerät:** Diese werden live verglichen.
3. **Demo-Freunde:** Simulierte Werte, damit sich Rangliste und Duelle sofort ausprobieren lassen.

Für eine echte Echtzeit-Synchronisierung zwischen Geräten wäre ein Backend nötig (z. B. Supabase oder Firebase). Die App rechnet intern alles über einheitliche Tages-Zusammenfassungen (`digestOf` / `friendDigest` in `app.js`). Dort setzt die Anbindung an.

## Dateien

- `index.html`, `style.css`: Oberfläche
- `app.js`: Logik (Konten, Berechnungen, Punkte, Ansichten, Scanner, Schrittzähler)
- `data.js`: Ziele, Übungen inkl. Animations-Keyframes, Pläne, Challenges, Lebensmittel
- `anim.js`: Renderer für die Strichfiguren
- `sw.js`, `manifest.webmanifest`, Icons: Offline-Fähigkeit und Installation

Hinweis: Kamera, Bewegungssensor und Service Worker funktionieren nur über HTTPS (z. B. GitHub Pages) oder `localhost`.
