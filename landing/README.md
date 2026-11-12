# Neon installationsside

Mappen `landing/` er en statisk installationsside, der **ikke** skal indgå i Capacitor-APK'en.

## Publicering på Debian + lighttpd

1. Hent kildekoden fra `https://github.com/gudlever-lgtm/neon`.
2. Kopiér `landing/index.html` og `landing/icon.svg` til den mappe, som lighttpd serverer på `https://dulmens.dk/neon/`. Eksempel, **kun hvis** `/var/www/dulmens.dk/neon` er dokumentroden for den URL:

   ```bash
   install -m 0644 landing/index.html /var/www/dulmens.dk/neon/index.html
   install -m 0644 landing/icon.svg /var/www/dulmens.dk/neon/icon.svg
   ```

3. Kontrollér at disse routingregler fortsat virker, inden du sætter siden i drift:
   - `/neon/api/*` => Node.js `127.0.0.1:3100/api/*` (REST; bevar /api-prefix på upstream)
   - `/neon/ws` => Node.js `127.0.0.1:3100/ws` (WebSocket upgrade)
   - `/neon/` => statisk landing/index.html
   - `/downloads/neon.apk` => fysisk APK på webserveren

Det er vigtigt, at routing for API/WebSocket har højere prioritet end den statiske side.

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
