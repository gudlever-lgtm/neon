# Neon – Pong til mobil

**Udviklingsversion:** v0.10.0 (grafik + Arcade 2.0 + Multiplayer 2.0), med automatiseret multiplayer-kontrol på vej mod v0.11.

Neon er et gratis Pong-spil til Android med Classic, Arcade, to spillere på samme telefon og API-baseret online multiplayer. Ingen reklamer eller køb.

## Repository

- `web/`: HTML5/Canvas-spillet (pakkes i Android-appen via Capacitor)
- `server/`: Node.js REST + WebSocket og MariaDB
- `expo-ios/`: iOS-skal via Expo EAS (kræver særskilt validering af hostet spil-URL)
- `landing/`: offentlig installationsside på `https://dulmens.dk/neon/`
- `test/`: Arcade-regler og UI-smoketests
- `build-apk.ps1`: Windows-build (APK/AAB) og iOS gennem EAS

## Version 0.8–0.10

### v0.8: Visuel kvalitet
- Neon-glød og partikelrespons ved boldkontakt
- Diskret rystelse, bedre tryk- og fokustilstande
- Reduceret animation når systemet ønsker det

### v0.9: Arcade 2.0
- Standard, Rush 90 sekunder og Chaos
- Opsamlings-power-ups: bredt bat (9 sekunder), slowmotion, ekstra skjold og Multiball
- Ekstra Pong-bold med uafhængig fysik; tab af ekstra bold giver ikke straf
- Classic og lokal multiplayer ændres ikke til power-up-varianter

### v0.10: Multiplayer 2.0
- Spillerprofiler med point/sejre/nederlag og indbyrdes statistik
- Historik over egne seneste afsluttede onlinekampe
- Profiladgang fra brugerlisten og ranglisten
- Top 10 viser point og sejre
- Genbruger eksisterende MariaDB-tabeller; **ingen SQL-migrering**
- Nye REST-ruter kræver, at serverens kildekode deployes og systemd-servicen genstartes

## Test

På en maskine med Node.js:

```bash
npm test
cd server
npm test
```

Tester regler, grafisk spilinitialisering (mocked Canvas) og eksisterende serverfysik/adgangskodefunktioner. Dette erstatter **ikke** faktisk test med MariaDB, lighttpd, WebSocket og to Android-enheder.

### Automatisk test med to spillere

GitHub Actions kører `.github/workflows/multiplayer-e2e.yml` ved push og pull request. Workflowet starter en **midlertidig MariaDB**, indlæser `server/sql/schema.sql`, starter Neon-serveren og gennemfører en rigtig kamp med to oprettede testkonti og to WebSockets. Det kontrollerer kampresultat, historik, profiler og rangliste. Testdata forsvinder med den midlertidige database; produktionsdatabasen berøres ikke.

Lokalt, **kun med en separat testdatabase** og en Neon-server på `127.0.0.1:3100`:

```bash
cd server
npm run test:e2e
```

En skrivende test mod den offentlige server kan kun startes eksplicit med `--public-write` og `NEON_E2E_ALLOW_PUBLIC=1`. Den opretter rigtige konti og kampe, og **sletter ikke automatisk data**. Brug den først efter særskilt godkendelse og med plan for oprydning. Den er ikke en del af GitHub-workflowet.

## Android-build på Windows

```powershell
cd E:\neon
.\build-apk.ps1 -Target apk -SkipPull -ApiUrl https://dulmens.dk/neon
```

- APK: `dist/neon.apk`
- QR: `dist/neon-qr.png`
- Der uploades **ikke** automatisk
- API-basen er `https://dulmens.dk/neon` (uden `/api`); websocket-adressen er `wss://dulmens.dk/neon/ws`
- Android bygger med lokal JDK 21 + SDK; iOS er konfigureret til Expo EAS

**Ingen APK er bygget som led i v0.8–v0.10-ændringerne.**

## Eksisterende driftsopsætning

Backend forbliver i `/var/www/dulmens.dk/neon-backend/server/` og systemd-servicen `neon-rally.service` bevares. DB-navnet `neon_rally` og de gamle localStorage-nøgler bevares af hensyn til kompatibilitet. Det synlige produktnavn er udelukkende **Neon**; de tekniske navne kan ændres ved en særskilt, planlagt migration.

Offentlige stier:
- `/neon/` installationsside
- `/neon/api/` REST (proxy til port 3100 /api)
- `/neon/ws` WebSocket (proxy til port 3100 /ws)
- `/downloads/neon.apk` manuel APK-distribution

Serverens `.env` må ikke være offentligt tilgængelig; del ikke backendens mappe som statiske webfiler.

Se `API.md` og `landing/README.md` for yderligere dokumentation.
