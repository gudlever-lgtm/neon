<#
.SYNOPSIS
  Build Neon on Windows E:\neon: APK, AAB, or Expo EAS iOS.
.EXAMPLE
  .\build-apk.ps1 -Target apk
  .\build-apk.ps1 -Target aab -SkipPull
  .\build-apk.ps1 -Target ios -ExpoUrl https://play.example.org
  .\build-apk.ps1 -Target all -ExpoUrl https://play.example.org
#>
[CmdletBinding()]
param(
  [ValidateSet('apk','aab','ios','all')][string]$Target='apk',
  [string]$ProjectRoot=$PSScriptRoot,
  [string]$AndroidSdk='E:\Android',
  [string]$ExpoUrl=$env:EXPO_PUBLIC_GAME_URL,
  [string]$ApiUrl=$env:NEON_API_URL,
  [switch]$SkipPull,
  [switch]$SkipInstall
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
function Invoke-Checked([string]$Command, [string[]]$Arguments) {
  Write-Host "`n> $Command $($Arguments -join ' ')" -ForegroundColor Cyan
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {throw "Kommando fejlede ($LASTEXITCODE): $Command"}
}
function Find-Sdk([string]$Path) {
  $candidates=@($Path,(Join-Path $Path 'Sdk'),(Join-Path $Path 'sdk'),$env:ANDROID_HOME,$env:ANDROID_SDK_ROOT) | Where-Object {$_}
  foreach($p in $candidates) {if((Test-Path (Join-Path $p 'platform-tools')) -and (Test-Path (Join-Path $p 'platforms'))){return (Resolve-Path $p).Path}}
  throw "Android SDK blev ikke fundet. Angiv -AndroidSdk 'E:\Android\Sdk' (eller den korrekte SDK-sti)."
}
if (!(Test-Path $ProjectRoot)) { throw "Projektmappe findes ikke: $ProjectRoot" }
Set-Location $ProjectRoot
foreach($cmd in @('git','node','npm')) {if(-not (Get-Command $cmd -ErrorAction SilentlyContinue)){throw "Mangler $cmd i PATH"}}
if(!(Test-Path '.git')) { throw "Ingen .git i $ProjectRoot. Kør: git clone https://github.com/gudlever-lgtm/neon.git E:\neon (eller git init + remote)." }
if(-not $SkipPull){
  $dirty=(& git status --porcelain)
  if($LASTEXITCODE -ne 0){throw 'git status fejlede'}
  if($dirty){throw 'Lokale ændringer fundet. Commit/stash dem eller brug -SkipPull. Intet overskrives.'}
  Invoke-Checked 'git' @('pull','--ff-only','origin','main')
}
if($Target -in @('apk','aab','all')){
  # Java 21 is required by the Capacitor Android compiler.
  $javaDirs = @()
  if($env:JAVA_HOME) { $javaDirs += $env:JAVA_HOME }
  $javaDirs += @(Get-ChildItem 'C:\Program Files\Microsoft' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | ForEach-Object FullName)
  $jdk = $javaDirs | Where-Object { Test-Path (Join-Path $_ 'bin\javac.exe') } | Select-Object -First 1
  if(-not $jdk) { throw 'JDK 21 was not found. Install Microsoft OpenJDK 21 or set JAVA_HOME to a JDK 21 directory.' }
  $env:JAVA_HOME = $jdk
  $env:Path = "$jdk\bin;" + $env:Path
  Write-Host "Java: $jdk"
  $sdk=Find-Sdk $AndroidSdk
  $env:ANDROID_HOME=$sdk; $env:ANDROID_SDK_ROOT=$sdk
  Write-Host "SDK: $sdk"
  if(-not (Test-Path 'web/index.html')){throw 'web/index.html mangler'}
  if(-not (Test-Path 'capacitor.config.json')){throw 'capacitor.config.json mangler'}
  if(-not $SkipInstall -or !(Test-Path 'node_modules')){Invoke-Checked 'npm.cmd' @('install')}
  if(Test-Path 'www'){Remove-Item 'www' -Recurse -Force}
  New-Item -ItemType Directory -Path 'www' | Out-Null
  Copy-Item 'web/*' 'www/' -Recurse -Force
  if($ApiUrl){
    if($ApiUrl -notmatch '^https://'){throw '-ApiUrl skal være HTTPS i produktion'}
    $clean=$ApiUrl.TrimEnd('/')
    Set-Content 'www/app-config.js' "window.NEON_API_BASE = '$clean';" -Encoding ascii
    Write-Host "Online API: $clean"
  }else{Write-Warning 'Ingen -ApiUrl: lokal Classic/Arcade virker, men online multiplayer i APK kræver et API endpoint.'}
  if(!(Test-Path 'android/gradlew.bat')){Invoke-Checked 'npx.cmd' @('cap','add','android')}
  Invoke-Checked 'npx.cmd' @('cap','sync','android')
  $properties="sdk.dir=$($sdk.Replace('\\','/').Replace('\','/').Replace(':','\:'))"
  Set-Content 'android/local.properties' $properties -Encoding ascii
  Push-Location 'android'
  try{
    if($Target -in @('apk','all')){
      Invoke-Checked '.\gradlew.bat' @('assembleDebug','--no-daemon')
      $apk=Join-Path (Get-Location) 'app/build/outputs/apk/debug/app-debug.apk'
      if(!(Test-Path $apk)){throw 'APK blev ikke fundet efter build'}
      New-Item -ItemType Directory -Force -Path '../dist' | Out-Null
      Copy-Item $apk '../dist/neon.apk' -Force
      Write-Host 'APK: dist/neon.apk' -ForegroundColor Green
      # Generate an offline QR image for the permanent URL; do not upload anything.
      Add-Type -AssemblyName System.Drawing
      $hex = '000000000000000001fd09f7f082e622085d3745742ea072ba1749f25d082423a087f5555fc003f940016e2dc4b06450ff886fc916182a6dcfe206e1080c0c01d523855954e1c196327c403f827ba06cb505704de0c6d00f2a77880d64bdfc0009e88f87f764d6820ae0a3617456df40ba8388c85d7b7094209422b41fdd674200000000000000000'
      # BigInteger conversion is handled below by nibble lookup for Windows PowerShell compatibility.
      $bits = -join ($hex.ToCharArray() | ForEach-Object { [Convert]::ToString([Convert]::ToInt32([string]$_,16),2).PadLeft(4,'0') })
      $bits = $bits.Substring($bits.Length - 1089)
      $bmp = [System.Drawing.Bitmap]::new(330,330)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      try {
        $g.Clear([System.Drawing.Color]::White)
        $brush = [System.Drawing.Brushes]::Black
        for($y=0;$y -lt 33;$y++) {
          for($x=0;$x -lt 33;$x++) {
            if($bits[$y*33+$x] -eq '1') { $g.FillRectangle($brush,$x*10,$y*10,10,10) }
          }
        }
        $bmp.Save((Join-Path $ProjectRoot 'dist\neon-qr.png'), [System.Drawing.Imaging.ImageFormat]::Png)
      } finally { $g.Dispose(); $bmp.Dispose() }
      Write-Host 'QR: dist/neon-qr.png' -ForegroundColor Green
      Write-Host 'Download URL: https://dulmens.dk/downloads/neon.apk' -ForegroundColor Cyan
      Write-Warning 'The APK is NOT uploaded. Copy dist/neon.apk to the server before scanning the QR code.'
    }
    if($Target -in @('aab','all')){
      Invoke-Checked '.\gradlew.bat' @('bundleRelease','--no-daemon')
      $aab=Join-Path (Get-Location) 'app/build/outputs/bundle/release/app-release.aab'
      if(!(Test-Path $aab)){throw 'AAB blev ikke fundet efter build'}
      New-Item -ItemType Directory -Force -Path '../dist' | Out-Null
      Copy-Item $aab '../dist/neon-release-unsigned.aab' -Force
      Write-Warning 'AAB er IKKE konfigureret med release-signering og er ikke klar til Play Store uden signering.'
    }
  }finally{Pop-Location}
}
if($Target -in @('ios','all')){
  if(-not $ExpoUrl -or $ExpoUrl -notmatch '^https://'){throw 'iOS EAS kræver -ExpoUrl https://din-offentlige-spiladresse (WebView viser den hostede app)'}
  if(!(Test-Path 'expo-ios/package.json')){throw 'expo-ios-projekt mangler'}
  Push-Location 'expo-ios'
  try{
    $env:EXPO_PUBLIC_GAME_URL=$ExpoUrl
    if(-not $SkipInstall -or !(Test-Path 'node_modules')){Invoke-Checked 'npm.cmd' @('install')}
    Invoke-Checked 'npx.cmd' @('eas','build','--platform','ios','--profile','production')
    Write-Host 'iOS build bestilt hos Expo EAS. Hent IPA fra EAS, hvis build og signing lykkes.' -ForegroundColor Green
  }finally{Pop-Location}
}
