<<<<<<< HEAD
# Neon Rally v0.5 — online multiplayer MVP

**Status:** Implementeret som kode, serverstyret multiplayer-prototype. Ikke produktionsverificeret eller live-deployeret. Kræver egen MariaDB og en Node.js-server.

## Indhold
- `web/`: eksisterende Classic, Arcade, lokal 2-spiller og neon-UI plus konto/login, komplet søgbar spillerliste (sideinddelt), inviter/acceptér/afvis/annullér, global Top 10 og online Pong.
- `server/sql/schema.sql`: komplet MariaDB database og `leaderboard` view.
- `server/src/index.js`: REST API, session-adgang, invitationer, serverautoritativ game loop og WebSocket realtids-API.
- `server/src/core.js`: adgangskodehash (scrypt), validering og spilfysik.
- `server/test/`: enhedstests uden database.
- `API.md`: routes, dataformat, fejlhåndtering, sikkerhedsnoter.

## Installation (Debian / Node.js 20+ / MariaDB 10.6+)

1. Installer Node.js 20+ og MariaDB. Opret database og schema:

   ```sh
   mariadb -u root -p < server/sql/schema.sql
   ```

2. Opret en **dedikeret, mindst privilegeret** SQL-bruger (ændr adgangskoden):

   ```sql
   CREATE USER 'neon_api'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
   GRANT SELECT, INSERT, UPDATE, DELETE ON neon_rally.* TO 'neon_api'@'localhost';
   -- View'et leaderboard kan kræve CREATE VIEW-rettigheder ved første import (udfør import som admin).
   ```

3. Fra `server/`:

   ```sh
   cp .env.example .env
   # Ret .env (DB credentials, ALLOWED_ORIGINS, HOST og PORT)
   npm install
   npm run check
   set -a; . ./.env; set +a
   npm start
   ```

4. Besøg `http://127.0.0.1:3100` lokalt. I produktion: kør Node bundet til loopback bag HTTPS-reverse-proxy, der også videresender WebSocket Upgrade `/ws`. **Eksponér ikke port 3100 direkte på internettet.** Brug offentligt `https://play.dit-domæne.dk` og sæt `ALLOWED_ORIGINS` til præcis den origin.
5. Opret to testkonti i to forskellige browsere / private vinduer, send invitation, acceptér og spil til 7 point. Kontroller `GET /api/leaderboard`.

> Node.js indlæser **ikke** `.env` automatisk i denne kode. Brug shell-eksemplet, systemd `EnvironmentFile=` eller Node's `--env-file`-flag. Kopiér aldrig `.env` til `web/`.

## Arkitektur

```
Mobilbrowser / senere Android / iOS
    |  HTTPS: JSON REST /api/* (Bearer token)
    |  WSS: /ws (auth message, paddle message, server snapshots)
    v
Node.js Express + WebSocket (autoritativ spilsimulation)
    |
    v
MariaDB: users, sessions, invitations, matches, leaderboard (VIEW)
```

En onlinekamp har ét autoritativt boldforløb på serveren. Klienter må kun sende deres batposition. Serveren beregner point, sejre og rangliste. Classic/Arcade/lokal 2-spiller fortsætter offline i browseren og indgår ikke i online Top 10.

## Kendte MVP-begrænsninger og driftshensyn
- Onlinekampe ligger i denne version **i serverprocessens RAM**. Ved genstart annulleres aktive kampe uden ranglistepoint. Én Node-instans er forudsat; horisontal skalering kræver fælles state/koordination.
- En spiller kan genetablere WebSocket-forbindelsen inden for 20 sekunder. Onlinekampe pauser ikke ved fingerløft (ellers kunne en spiller blokere modstanderen).
- Brugernavne er unikke, søgbare og offentlige i spillet. Vis kun pseudonymer — ingen e-mail eller personoplysninger i spillerlisten. Der er ikke glemt-adgangskode-flow (ingen e-mailregistrering), blokering/rapportering, moderationspanel eller kontosletning i MVP.
- Simpel hukommelsesbaseret rate limiting holder **ikke** på tværs af genstarter eller flere instanser. Implementér persistent limiter og overvågning inden offentlig lancering.
- Tokens er tilfældige, hashede i DB, tidsbegrænsede til 7 dage og opbevares i browserens `sessionStorage`. Stram CSP, HTTPS og ingen tredjepartsscripts anbefales; overvej HttpOnly session-cookie + CSRF-beskyttelse til produktionsversion.
- Ingen faktiske API-/DB-integrationstests er kørt i dette miljø, da der ikke er en MariaDB-instans eller installerede npm-afhængigheder. Enhedstests og syntakskontrol er kørt.
- WebSocket-opdateringer sendes ~20 gange/sek. Der er serverautoritativ fysik, men ikke endnu interpolation/netværkslatenskompensation — kræver spiltest ved realistiske forbindelser.
- Gratis og uden reklamer/betaling.

## Test uden database
`cd server && node --test test/*.test.js`
=======
# Neon Rally

Mobil-Pong med Classic, Arcade, lokal multiplayer og API-baseret online multiplayer.

## Første import

Den samlede v0.6-kildekode er leveret som `neon-rally-v0.6-android-expo-buttons.zip` i ChatGPT-samtalen. Pak ZIP-indholdet (mappen `neon-rally-v0.6`) ud i `E:\neon-rally`, gennemgå ændringerne og commit/push til dette repository. **Denne README er kun initialisering, ikke hele spillet.**

## Build på Windows

Efter fuld import:

```powershell
cd E:\neon-rally
.\build-apk.ps1 -Target apk -ApiUrl https://DIN-SERVER
.\build-apk.ps1 -Target aab -ApiUrl https://DIN-SERVER
.\build-apk.ps1 -Target ios -ExpoUrl https://DIN-SERVER
```

APK via Android SDK/Capacitor; AAB kræver release-signering til Play Store. iOS bygges med Expo EAS og kræver konto/signering. Backend findes i `server/`, mobilwebkoden i `web/`, og Expo i `expo-ios/` efter importen.
>>>>>>> 53c06f271785368c63724d3712b69f099d7886dc
