# Neon – udviklingsplan og afleveringskontrol

## V0.8 – Grafik og animationer
**Implementeret:** Neonbane med puls/glød, kontaktfeedback og visuel rystelse, forbedrede knaptilstande og respekt for `prefers-reduced-motion`.

**Kontrolleret:** JavaScript-syntaks og Canvas-start i mock-runtime. **Mangler:** subjektiv test af animationernes kvalitet på fysisk Android.

## V0.9 – Arcade 2.0
**Implementeret:** Tre udfordringer (Standard, Rush 90 og Chaos), opsamlings-power-ups (bredt bat, slowmotion, ekstra skjold, Multiball), selvstændig fysik for den ekstra bold, og bevarelse af Classic.

**Kontrolleret:** deterministiske regler, syntaks og mock-Canvas-smoketest for Classic, Rush og Chaos. Tilføjede Node-tests i `test/arcade-rules.test.cjs` og `test/web-smoke.test.cjs`.

**Mangler:** kampgennemspilning på forskellige skærmstørrelser, effektbalancering og hardwaretest.

## V0.10 – Multiplayer 2.0
**Implementeret:** REST spillerprofil, indbyrdes statistik, private seneste onlinekampe, profilvisning i lobbyen samt Top 10 med point.

**Kontrolleret:** server/client-syntaks, routingkontrakt, at historik forespørges med aktuel session, og at SQL kun filtrerer efter indlogget spiller.

**Mangler:** live integrationstest med MariaDB, lighttpd/WSS og to telefoner. Denne test kan ikke gennemføres her uden serverforbindelse. Ingen ændringer i DB-schema.

## Versionsstyring og drift

- Alle ændringer er committet direkte til `gudlever-lgtm/neon` (main).
- Ingen APK eller AAB er bygget.
- Windows projektsti er `E:\neon`.
- Backend bliver på `/var/www/dulmens.dk/neon-backend/server/` med eksisterende systemd-service `neon-rally.service`.
- Database `neon_rally` og legacy localStorage-nøgler bevares.
- Installationssiden `/neon/` er separat fra spilfrontend; **kopiér ikke** web-spillet ind over landingssiden.
- Online-API-funktionerne aktiveres først efter deployment og servicegenstart.

## V0.11 – Multiplayer reliability / automatiseret E2E

**Implementeret i kode:** Et script med to autentificerede spillere, invitation, fælles kamp, serverautoritativ scoreafslutning, resultat, historik, profiler, rangliste og logout. GitHub Actions starter en isoleret MariaDB-service og backend, kører de eksisterende tests og derefter E2E. Ingen produktionstest køres automatisk.

**Verifikation:** Testen skal bestå i GitHub Actions med rigtig MariaDB. En efterfølgende offentlig skrivende E2E-test kræver særskilt godkendelse og efterlader testkonti/-kampe til kontrolleret oprydning. Fysisk test på to telefoner er fortsat udestående.

**Produktnavn:** Kun **Neon** i produkttekster. Teknisk legacy som `neon-rally.service`, `neon_rally` og browserlagringsnøgler bevares indtil planlagt migration.

### Stabilitetssuite (kun isoleret testdatabase)

`npm run test:reliability --prefix server` opretter to nye testspillere og verificerer genopkobling inden for 20-sekunders fristen, at gentagen opgivelse ikke gemmer resultatet to gange, og at en tabt WebSocket-forbindelse giver modstanderen en sejr efter fristen. GitHub-workflowet kører den efter den ordinære scorebaserede E2E-kamp. Ingen af stabilitetsscenarierne kører mod produktionsserveren.

### Kontrolleret oprydning efter offentlig test

Den offentlige E2E-test den 13. november efterlod spiller-id 1 og 2 samt kamp-id 1. Inden sletning: læs `users`, `invitations`, `matches` og `sessions` for de præcise id'er; kontrollér at brugernavnene begynder med `neon_e2e_`, at kampens deltagere er 1 og 2, og at ingen andre relationer findes. **Kør ikke automatisk DELETE mod produktionsdatabasen.** Oprydning kræver særskilt kontrol og godkendelse.

## Kommandoer til verificering

```powershell
cd E:\neon
npm test
cd server
npm test
```

Kontrollér herefter API på backend-serveren, helst med en testkonto:

```bash
systemctl status neon-rally --no-pager
curl -i http://127.0.0.1:3100/api/leaderboard
```

De nye `/api/players/:id/profile` og `/api/matches/history` kræver Bearer-token.

## Læsebaseret lokal og offentlig integrationstest

På Debian, fra `/var/www/dulmens.dk/neon-backend/server/`:

```bash
node scripts/verify-deployment.mjs
node scripts/verify-deployment.mjs --public
```

Dette kontrollerer API-health, rangliste, at profil/historik kræver login samt WebSocket-handshake og forventet timeout for ikke-autentificerede forbindelser. Den **opretter ikke** konto, kampe eller invitationer. En bestået test er ikke en fuld multiplayer-integrationstest.

Brug `NEON_PUBLIC_URL=https://dulmens.dk/neon` hvis den offentlige baseadresse ændres. Vær opmærksom på, at `--public` kræver at lighttpd sender `/neon/api/*` videre til Node /api/* og `/neon/ws` til /ws.

## Ikke i scope i denne leverance

- Ingen Android APK-build
- Ingen database-migration
- Ingen fysisk flytning af backend
- Ingen Play Store/App Store-upload
