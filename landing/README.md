# Neon installationsside

Mappen `landing/` er en statisk installationsside, der **ikke** skal indgå i Capacitor-APK'en.

## Publicering på Debian + lighttpd

1. Hent kildekoden fra `https://github.com/gudlever-lgtm/neon`.
2. **Anbefalet:** Hold landingssiden i en separat offentlig mappe, eksempelvis `/var/www/dulmens.dk/neon-public/`, og peg lighttpd alias på den. Din Node-backend ligger allerede under `/var/www/dulmens.dk/neon/server/`, og denne servermappe må **ikke** eksponeres som statiske filer. Kopiér de to filer således:

   ```bash
   install -d -m 0755 /var/www/dulmens.dk/neon-public
   install -m 0644 landing/index.html /var/www/dulmens.dk/neon-public/index.html
   install -m 0644 landing/icon.svg /var/www/dulmens.dk/neon-public/icon.svg
   ```

3. Kontrollér at disse routingregler fortsat virker, inden du sætter siden i drift:
   - `/neon/api/*` => Node.js `127.0.0.1:3100/api/*` (REST; bevar /api-prefix på upstream)
   - `/neon/ws` => Node.js `127.0.0.1:3100/ws` (WebSocket upgrade)
   - `/neon/` => statisk landing/index.html
   - `/downloads/neon.apk` => fysisk APK på webserveren

Det er vigtigt, at routing for API/WebSocket har højere prioritet end den statiske side. Blokér offentlig adgang til `server/`, `.env`, SQL og andre interne projektfiler. Test at `https://dulmens.dk/neon/server/.env` **ikke** kan downloades. Ændr ikke lighttpd-konfiguration uden at kontrollere den eksisterende vhost først.

**Ingen APK uploades af buildscriptet.** Placér manuelt `dist/neon.apk` som `/var/www/dulmens.dk/downloads/neon.apk`.

## Build på Windows

```powershell
cd E:\neon
.\build-apk.ps1 -Target apk -SkipPull -ApiUrl https://dulmens.dk/neon
```

`-ApiUrl` skal indeholde **/neon**, men **ikke /api**. Frontend tilføjer selv /api eller /ws.

## Appidentitet

Produktnavn: `Neon`. Android package ID: `dk.dulmens.neon`. Expo iOS bundle ID: `dk.dulmens.neon`.

Eksisterende databasenavn `neon_rally` og localStorage-nøgler bevares for ikke at miste brugerdata.
