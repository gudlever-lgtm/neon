# Neon – Pong til mobil

**Udviklingsversion:** v0.12.0 (Mobile Experience). Backend-API er fortsat v0.10.0.

### v0.12: Mobile Experience
- Flydende visning af onlinebold og modstanderbat ved hjælp af frame-uafhængig udjævning (serverfysikken ændres ikke).
- Direkte touchfeedback med koordinattilpasning til canvas-størrelsen og begrænset WebSocket-inputfrekvens.
- Scorepuls, tydeligere resultater og partikel-/sejrseffekter med respekt for reduceret bevægelse.
- Indikator for **serveropdateringernes friskhed** (`LIVE`, `LANGSOM`, `AFBRUDT`) – den er ikke et præcist ping-/RTT-tal.
- Kompakt layout til korte og smalle telefonskærme.
- Automatiserede tests af touchkoordinater, udjævning, forbindelsesindikator og multiplayer-rendering.

Neon er et gratis Pong-spil til Android med Classic, Arcade, to spillere på samme telefon og API-baseret online multiplayer. Ingen reklamer eller køb.

## Repository

- `web/`: HTML5/Canvas-spillet (pakkes i Android-appen via Capacitor)
- `server/`: Node.js REST + WebSocket og MariaDB
- `expo-ios/`: iOS via Expo EAS med indbygget offline-spil (Classic/Arcade); online multiplayer kræver internet
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

Workflowet kører også `test:reliability`: genopkobling under aktiv kamp, dobbelt-opgivelse og afbrudt WebSocket med serverafgjort sejr. Disse tests køres **kun** mod en isoleret testdatabase.

Lokalt, **kun med en separat testdatabase** og en Neon-server på `127.0.0.1:3100`:

```bash
cd server
export NEON_E2E_ISOLATED_DB=1
npm run test:e2e
```

En skrivende test mod den offentlige server kan kun startes eksplicit med `--public-write` og `NEON_E2E_ALLOW_PUBLIC=1`. Den opretter rigtige konti og kampe, og **sletter ikke automatisk data**. Brug den først efter særskilt godkendelse og med plan for oprydning. Den er ikke en del af GitHub-workflowet.

## Ét Windows-script: Android lokalt, iOS via Expo EAS

```powershell
cd E:\neon
.\build-apk.ps1 -Platform apk
.\build-apk.ps1 -Platform aab
.\build-apk.ps1 -Platform ios -IosProfile preview
.\build-apk.ps1 -Platform ios -IosProfile production -Submit
```

- `-Target` er et bagudkompatibelt alias for `-Platform`. `-Platform all` bygger APK, AAB og iOS.
- APK: `dist/neon.apk` og `Downloads/neon.apk`
- AAB: `dist/neon-release-unsigned.aab` og `Downloads/neon-release-unsigned.aab` (**ikke signeret**)
- QR: `dist/neon-qr.png`
- Der uploades **ikke** automatisk
- API-basen er `https://dulmens.dk/neon` (uden `/api`); websocket-adressen er `wss://dulmens.dk/neon/ws`
- Android bygger lokalt med JDK 21 + Android SDK (Gradle). **Kun iOS benytter Expo EAS**.
- `-IosProfile preview` bygger til registreret iPhone. Kør `cd expo-ios; npx eas device:create` først.
- `-IosProfile production -Submit` bygger og uploader samme nye build til TestFlight, så et gammelt build ikke genindsendes ved en fejl.
- Scriptet gemmer automatisk lokale ændringer (og untracked filer) i en midlertidig Git-stash, henter seneste `main` og genskaber ændringerne. Ved konflikt stopper det og bevarer stashen, så intet går tabt.
- Brug `-SkipPull`, hvis du bevidst bygger fra lokale ændringer uden at hente GitHub. `-SkipInstall` springer installation over, når modulerne findes.

## iOS via Expo.dev (offline-spil)

Neon indlæses fra et indbygget HTML/CSS/JS-bundle på iOS. Classic og Arcade starter derfor uden internet. Online multiplayer anvender fortsat `https://dulmens.dk/neon` og kræver forbindelse. Opdater bundlet efter ændringer i `web/`:

```powershell
cd E:\neon
git pull --ff-only origin main
node scripts/build-ios-web.mjs
cd expo-ios
npm install
npx eas-cli login
npx eas-cli build --platform ios --profile production
```

Alternativt bygger `./build-apk.ps1 -Platform ios -SkipPull` det lokale bundle før EAS-build. iOS-signering og distribution kræver Apple Developer-adgang. Expo-projektet bygger en iOS-app; der er ikke lavet nogen IPA i repositoryet.

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
