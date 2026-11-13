# Android APK-opdateringer

Neon kontrollerer ved opstart og viser **Søg efter opdatering** på Android-forsiden. Download og installation kræver brugerens godkendelse. iOS bruger ikke APK'er.

Efter lokalt build med `build-apk.ps1` lægges `dist/neon.apk` på `https://dulmens.dk/downloads/neon.apk`. Først derefter publiceres `https://dulmens.dk/downloads/neon.json`:

```json
{"version":"0.12.0","apkUrl":"https://dulmens.dk/downloads/neon.apk"}
```

`build-apk.ps1` integrerer nu `package.json`-versionen i både WebView (`NEON_APP_VERSION`) og Android (`versionName` samt stigende `versionCode`). Hæv `package.json`-versionen ved nye builds. APK-installation oven på en eksisterende app kræver samme package ID og samme signeringscertifikat. Lokale debug-APK'er fra to PC'er kan have forskellige certifikater og kan ikke nødvendigvis opdatere hinanden. Brugerens gemte data bevares ved almindelig opdatering, men ikke ved afinstallation.

JSON-responsen skal være læsbar på tværs af domæner fra appens WebView; serveren kan sende `Access-Control-Allow-Origin: *`. Upload til server og APK-build udføres ikke af denne ændring.
