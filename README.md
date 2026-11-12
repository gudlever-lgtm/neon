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
