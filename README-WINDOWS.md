# Neon Rally – lokal Windows build (v0.6)

**Mappe:** `E:\neon-rally`. **Repo:** https://github.com/gudlever-lgtm/neon-rally

## Første gang

Installer Node.js 20+, Java 21 (eller den version Capacitor/Gradle kræver), Git og Android SDK med platform-tools, platforms og build-tools. Tjek at `java -version`, `node -v`, `npm -v` virker. Android SDK kan ligge i `E:\Android\Sdk` – scriptet registrerer også `E:\Android`, hvis det er SDK-roden. Java og SDK-versioner skal matche Gradle/Android-projektets krav.

Hvis `E:\neon-rally` endnu ikke er et Git-repository, og mappen er tom, kan du klone:

```powershell
git clone https://github.com/gudlever-lgtm/neon-rally.git E:\neon-rally
```

Hvis mappen **ikke er tom**, så tag først backup og tilknyt forsigtigt dit eksisterende Git-repository – overskriv ikke lokale filer.

## Kommandoer

```powershell
cd E:\neon-rally
.\build-apk.ps1 -Target apk -ApiUrl https://play.dit-domæne.dk
.\build-apk.ps1 -Target aab
.\build-apk.ps1 -Target ios -ExpoUrl https://play.dit-domæne.dk
.\build-apk.ps1 -Target all -ExpoUrl https://play.dit-domæne.dk
```

Ved blokeret script: `Set-ExecutionPolicy -Scope Process Bypass` (kun i din aktuelle PowerShell-session).

APK: `dist/neon-rally-debug.apk`. AAB: `dist/neon-rally-release-unsigned.aab` (kræver signering til Play Store). APK er debug-signeret og kun til test. Første Android-build opretter `android/` lokalt via Capacitor.

## iOS via Expo

`-Target ios` bruger Expo EAS Cloud Build. Her anvendes Expo + React Native WebView til spillets **offentlige HTTPS URL**, ikke en offlinekopi af HTML. Det betyder, at serveren skal være live med spil og REST/WebSocket API, og iOS-appens onlinefunktioner kræver netforbindelse. Du skal være logget ind hos Expo (`npx eas login`) og have gyldig Apple-signering/udviklerkonto. EAS skal muligvis guides gennem første projektopsætning (`npx eas init` fra `expo-ios/`). En færdig iOS-fil kan ikke bygges på Windows lokalt.

## Sikkerhed

Læg ikke databaseadgang eller signeringsnøgler i Git. API hostes separat over HTTPS/WSS. Brug `-ApiUrl https://play.dit-domæne.dk` til Android. Sæt serverens `ALLOWED_ORIGINS=https://localhost,https://play.dit-domæne.dk` (tilpas til faktiske origins) og genstart serveren. API-serveren er konfigureret til CORS/preflight og WebSocket origin-check. Test end-to-end før offentlig lancering.
