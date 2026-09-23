# JARVIS – Voice-first personal AI assistant

Dieses Projekt ist für Mahery gedacht. Es ist eine Next.js-App ohne Texteingabefeld: Sprache rein, Sprache raus.

## Enthalten
- Sprachsteuerung im Browser (Web Speech API)
- Sprachantworten mit ruhiger, tiefer Stimme (Browser-TTS; verfügbare Stimme hängt vom Betriebssystem ab)
- OpenAI als Gehirn
- aktuelle Websuche über OpenAI Responses API
- Rechnen/Reasoning über das Modell
- Gmail: suchen, lesen, Entwürfe, senden (Versand nur nach Bestätigung)
- Google Calendar: Termine lesen/erstellen
- lokale Memory
- Erinnerungen
- Links aus Webantworten können in der UI angezeigt werden, sofern verfügbar

## Start
1. Node.js 20+ installieren.
2. `.env.example` nach `.env.local` kopieren.
3. OpenAI API Key eintragen.
4. Für Gmail/Calendar ein Google OAuth Client-ID/Secret anlegen und die APIs aktivieren.
5. `npm install`
6. `npm run dev`
7. `http://localhost:3000` öffnen.
8. Auf **Google verbinden** klicken und Google-Zugriff erlauben.
9. Auf das Mikrofon klicken und sprechen.

## Wichtig
- `.env.local` niemals auf GitHub hochladen.
- Der Ordner `.data` enthält den Google Refresh Token und darf nicht committed werden.
- Für einen öffentlichen/produktiven Dienst braucht die OAuth-Token-Speicherung eine echte Datenbank und zusätzliche Authentifizierung.
- Browser-Spracherkennung/TTS ist die einfache erste Voice-Schicht. Die Stimme wird automatisch aus den verfügbaren deutschen Browser-Stimmen gewählt und auf ruhig/tief eingestellt. Für echte Low-Latency Speech-to-Speech kann später die OpenAI Realtime API ergänzt werden.


## Neue Stimme
JARVIS nutzt die deutsche Browser-Sprachausgabe mit ruhigerer, tieferer Einstellung (Tempo 0,92 / Tonhöhe 0,78). Die tatsächlich verfügbare Stimme hängt vom Browser und Betriebssystem ab. Für die beste Wirkung kannst du in Windows eine deutsche männliche TTS-Stimme installieren.
