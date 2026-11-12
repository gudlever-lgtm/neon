# Neon – lokal Windows build (v0.10)

**Mappe:** `E:\neon`. **Repo:** https://github.com/gudlever-lgtm/neon

## Første gang

Installer Node.js 20+, Java 21 (eller den version Capacitor/Gradle kræver), Git og Android SDK med platform-tools, platforms og build-tools. Tjek at `java -version`, `node -v`, `npm -v` virker. Android SDK kan ligge i `E:\Android\Sdk` – scriptet registrerer også `E:\Android`, hvis det er SDK-roden. Java og SDK-versioner skal matche Gradle/Android-projektets krav.

Hvis `E:\neon` endnu ikke er et Git-repository, og mappen er tom, kan du klone:

```powershell
git clone https://github.com/gudlever-lgtm/neon.git E:\neon
```

Hvis mappen **ikke er tom**, så tag først backup og tilknyt forsigtigt dit eksisterende Git-repository – overskriv ikke lokale filer.

## Kommandoer

```powershell
cd E:\neon
.\build-apk.ps1 -Target apk -ApiUrl https://dulmens.dk/neon
.\build-apk.ps1 -Target aab
.\build-apk.ps1 -Target ios -ExpoUrl https://dulmens.dk/neon
.\build-apk.ps1 -Target all -ExpoUrl https://dulmens.dk/neon
```

Ved blokeret script: `Set-ExecutionPolicy -Scope Process Bypass` (kun i din aktuelle PowerShell-session).

APK: `dist/neon.apk`. AAB: `dist/neon-release-unsigned.aab` (kræver signering til Play Store). APK er debug-signeret og kun til test. Første Android-build opretter `android/` lokalt via Capacitor.

## iOS via Expo

**Vigtigt:** `/neon/` er i øjeblikket installationsside og ikke en spilklient. Brug derfor ikke den URL som Expo WebView-spiladresse; udgiv først en særskilt spilklient, fx `/neon/play/`, hvis iOS fortsat skal bruge en hostet WebView.


`-Target ios` bruger Expo EAS Cloud Build. Her anvendes Expo + React Native WebView til spillets **offentlige HTTPS URL**, ikke en offlinekopi af HTML. Det betyder, at serveren skal være live med spil og REST/WebSocket API, og iOS-appens onlinefunktioner kræver netforbindelse. Du skal være logget ind hos Expo (`npx eas login`) og have gyldig Apple-signering/udviklerkonto. EAS skal muligvis guides gennem første projektopsætning (`npx eas init` fra `expo-ios/`). En færdig iOS-fil kan ikke bygges på Windows lokalt.

## Sikkerhed

Læg ikke databaseadgang eller signeringsnøgler i Git. API hostes separat over HTTPS/WSS. Brug `-ApiUrl https://dulmens.dk/neon` til Android. Sæt serverens `ALLOWED_ORIGINS=https://localhost,https://dulmens.dk/neon` (tilpas til faktiske origins) og genstart serveren. API-serveren er konfigureret til CORS/preflight og WebSocket origin-check. Test end-to-end før offentlig lancering.
