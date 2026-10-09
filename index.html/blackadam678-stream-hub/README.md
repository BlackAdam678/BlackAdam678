# BLACKADAM678 Stream Hub

Responsive Twitch-Community-Webseite mit dunklem Neon-Design und einem kleinen Node.js-Backend.

## Was wird automatisch geladen?
- Live-Status und aktuelle Stream-Infos
- Kanal-Clips (auf dieser Seite nach Aufrufen sortiert)
- Twitch-Zeitplan, sofern beim Kanal gepflegt
- Mod-/VIP-Listen, wenn ein geeigneter Twitch-User-Token eingetragen ist
- Top-Chatter-Zähler, wenn ein Chat-Bot konfiguriert ist. Er zählt ab dem Zeitpunkt, an dem der Server/Bot läuft; es ist keine historische Allzeit-Rangliste.

## Lokal testen
1. Installiere Node.js (LTS).
2. Entpacke das Projekt.
3. Kopiere `.env.example` zu `.env`.
4. Erstelle eine Twitch-App im Twitch Developer Console: https://dev.twitch.tv/console/apps
5. Trage `TWITCH_CLIENT_ID` und `TWITCH_CLIENT_SECRET` in `.env` ein.
6. Im Projektordner ausführen:
   ```bash
   npm install
   npm start
   ```
7. Öffne http://localhost:3000

Ohne Client-ID/Secret zeigt die Seite das Design, aber keine API-Daten.

## Mods und VIPs
Die offiziellen Twitch-Endpunkte brauchen einen passenden User-Access-Token und Berechtigungen. Für den Zugriff auf die Listen sind mindestens `moderator:read:moderators` und `channel:read:vips` relevant. Das Einrichten des Tokens hängt davon ab, wer die App autorisiert und welche Kanalrechte diese Person hat. Trage einen gültigen User-Token in `TWITCH_USER_ACCESS_TOKEN` ein. Tokens sind geheim und dürfen nicht in die Webseite, in GitHub oder in Screenshots kopiert werden. Wenn Twitch einen Token-Ablauf meldet, muss er erneuert werden.

Offizielle Dokumentation:
- https://dev.twitch.tv/docs/api/reference
- https://dev.twitch.tv/docs/authentication/scopes/

## Top-Chatter-Bot
Top-Chatter funktioniert nur, wenn ein Bot-Account mit gültigem Chat-OAuth-Token bereitgestellt wird. Trage `TWITCH_CHAT_BOT_USERNAME`, `TWITCH_CHAT_OAUTH_TOKEN` und `TWITCH_CHAT_CHANNEL=blackadam678` in `.env` ein. Nutze keinen persönlichen Account-Passwort-String und niemals deinen Stream-Key. Die Webseite zählt Nachrichten, die der Bot ab dem Verbindungszeitpunkt empfängt. Die aktuelle Implementierung speichert Zähler nur im Arbeitsspeicher; bei einem Neustart wird die Rangliste zurückgesetzt. Für dauerhafte Ranglisten müsste eine Datenbank ergänzt werden.

Offizielle Chat-Doku:
- https://dev.twitch.tv/docs/chat/authenticating/
- https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types

## Kostenlos veröffentlichen (Beispiel: Render)
1. Erstelle ein privates GitHub-Repository und lade den Projektordner hoch. **Nicht** `.env` hochladen.
2. Bei einem Hosting-Anbieter, der Node.js unterstützt, einen neuen Web Service aus dem Repository erstellen.
3. Build/Install command: `npm install`
4. Start command: `npm start`
5. In den Environment Variables des Hosters die Werte aus `.env.example` setzen.
6. Nach dem Deployment die bereitgestellte HTTPS-Adresse öffnen.

Wichtig: Kostenlos-Tarife können einschlafen oder sich ändern. Wenn der Server stoppt, stoppt auch der Chat-Zähler. Eigene Domain ist optional und kann später verbunden werden.

## Sicherheitsnotizen
- Niemals Client Secret, OAuth-Token oder Stream-Key im Frontend veröffentlichen.
- `.env` ist absichtlich nicht enthalten; `.env.example` enthält nur Platzhalter.
- Die Seite ist ein unabhängiges Community-Projekt und nicht offiziell von Twitch betrieben.
