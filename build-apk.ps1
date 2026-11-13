<#
.SYNOPSIS
  Build Neon on Windows: Android APK/AAB locally; iOS exclusively with Expo EAS.
.EXAMPLE
  .\build-apk.ps1 -Platform apk
  .\build-apk.ps1 -Platform aab -SkipPull
  .\build-apk.ps1 -Platform ios -RegisterIosDevice
  .\build-apk.ps1 -Platform ios
  .\build-apk.ps1 -Platform ios -IosProfile production -Submit
  .\build-apk.ps1 -Target all
#>
[CmdletBinding()]
param(
  [Alias('Platform')][ValidateSet('apk','aab','ios','all')][string]$Target='apk',
  [string]$ProjectRoot=$PSScriptRoot,
  [string]$AndroidSdk='E:\Android',
  [string]$ApiUrl='https://dulmens.dk/neon',
  [ValidateSet('preview','production')][string]$IosProfile='preview',
  [switch]$RegisterIosDevice,
  [switch]$Submit,
  [string]$OutputDirectory=(Join-Path $env:USERPROFILE 'Downloads'),
  [switch]$SkipPull,
  [switch]$SkipInstall
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($Submit -and $Target -notin @('ios','all')){throw '-Submit kan kun bruges med -Platform ios eller all.'}
if($Submit -and $IosProfile -ne 'production'){throw '-Submit kræver -IosProfile production. Preview kan ikke indsendes til TestFlight.'}
if($RegisterIosDevice -and $Target -notin @('ios','all')){throw '-RegisterIosDevice kan kun bruges med -Platform ios eller all.'}
if($RegisterIosDevice -and $IosProfile -ne 'preview'){throw '-RegisterIosDevice bruges kun med -IosProfile preview.'}
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
  $dirty=@(& git status --porcelain)
  if($LASTEXITCODE -ne 0){throw 'git status fejlede'}
  $stashSha=$null
  $skipPullDueToStash=$false
  if($dirty){
    $stashMessage="neon-build-autostash-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host 'Lokale ændringer fundet; gemmer dem midlertidigt med git stash.' -ForegroundColor Yellow
    $stashBefore=(& git stash list -1 --format='%H' | Out-String).Trim()
    & git stash push --include-untracked -m $stashMessage
    $stashExit=$LASTEXITCODE
    $stashAfter=(& git stash list -1 --format='%H' | Out-String).Trim()
    $remaining=@(& git status --porcelain)
    if($LASTEXITCODE -ne 0){throw 'Git status fejlede efter stash-forsøget. Stopper for at beskytte lokale ændringer.'}
    if($stashExit -ne 0){
      if($stashBefore -ne $stashAfter -or (($dirty -join "`n") -ne ($remaining -join "`n"))){
        throw 'Git stash fejlede og ændrede Git-tilstanden. Stopper sikkert. Undersøg git status og git stash list.'
      }
      Write-Warning 'Git stash kunne ikke gennemføres. Springer git pull over og bygger med uændrede lokale filer. Brug git status til at undersøge årsagen.'
      $skipPullDueToStash=$true
    }else{
      $stashSha=$stashAfter
      if(-not $stashSha -or $stashBefore -eq $stashSha){throw 'Git stash oprettede ingen ny stash. Stopper sikkert.'}
      if($remaining){throw "Arbejdsområdet er stadig ændret efter stash. Ændringerne er bevaret i $stashSha. Stopper sikkert."}
    }
  }
  if(-not $skipPullDueToStash){
    try {
      Invoke-Checked 'git' @('pull','--ff-only','origin','main')
    } finally {
      if($stashSha){
        Write-Host "Genskaber lokale ændringer fra stash $stashSha" -ForegroundColor Cyan
        & git stash apply --index $stashSha
        if($LASTEXITCODE -ne 0){
          throw "Git kunne ikke automatisk genskabe alle ændringer. Stash $stashSha er bevaret. Undersøg git status og git stash list; kør ikke endnu et build før konflikten er løst."
        }
        $topStash=(& git rev-parse 'refs/stash').Trim()
        if($LASTEXITCODE -ne 0 -or $topStash -ne $stashSha){
          Write-Warning "Ændringer er genskabt, men stash-listen har ændret sig. Stash $stashSha er bevidst ikke slettet."
        }else{
          Invoke-Checked 'git' @('stash','drop','stash@{0}')
          Write-Host 'Lokale ændringer er genskabt; midlertidig stash er fjernet.' -ForegroundColor Green
        }
      }
    }
  }
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
  # Capacitor sync can recreate default launcher resources. Reapply NEON icons every build.
  if(!(Test-Path 'generate-android-icons.ps1')){throw 'generate-android-icons.ps1 mangler. Hent seneste filer fra GitHub.'}
  & (Join-Path $ProjectRoot 'generate-android-icons.ps1') -ProjectRoot $ProjectRoot
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
      if($OutputDirectory){
        New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
        Copy-Item $apk (Join-Path $OutputDirectory 'neon.apk') -Force
        Write-Host "APK: $(Join-Path $OutputDirectory 'neon.apk')" -ForegroundColor Green
      }
      Write-Host 'APK: dist/neon.apk (lokalt build)' -ForegroundColor Green
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
      if($OutputDirectory){
        New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
        Copy-Item $aab (Join-Path $OutputDirectory 'neon-release-unsigned.aab') -Force
        Write-Host "AAB: $(Join-Path $OutputDirectory 'neon-release-unsigned.aab')" -ForegroundColor Green
      }
      Write-Warning 'AAB er IKKE konfigureret med release-signering og er ikke klar til Play Store uden signering.'
    }
  }finally{Pop-Location}
}
if($Target -in @('ios','all')){
  if(!(Test-Path 'expo-ios/package.json')){throw 'expo-ios-projekt mangler'}
  Invoke-Checked 'node' @('scripts/build-ios-web.mjs')
  Push-Location 'expo-ios'
  try{
    if(-not $SkipInstall -or !(Test-Path 'node_modules/expo') -or !(Test-Path 'node_modules/expo-modules-autolinking')){Invoke-Checked 'npm.cmd' @('install','--include=dev')}
    if($RegisterIosDevice){
      Write-Host 'Registrer iPhone paa Expo/Apple. Aab QR eller registreringslink paa telefonen og foelg trinnene.' -ForegroundColor Cyan
      Invoke-Checked 'npx.cmd' @('eas','device:create')
      Write-Host 'Registrering gennemfoert. Der bygges nu en NY preview IPA med enhedsprofilen.' -ForegroundColor Cyan
    }
    $easArgs=@('eas','build','--platform','ios','--profile',$IosProfile)
    if($Submit){$easArgs+= '--auto-submit'}
    Invoke-Checked 'npx.cmd' $easArgs
    if($IosProfile -eq 'preview'){
      Write-Host 'iOS preview bygget via Expo EAS (ikke lokalt paa Windows, og uden TestFlight).' -ForegroundColor Green
      Write-Host 'Aab Expo build-linket paa din REGISTREREDE iPhone og vaelg Install (eller scan QR fra build-siden).' -ForegroundColor Green
      Write-Host 'Hvis telefonen ikke er registreret: .\build-apk.ps1 -Platform ios -RegisterIosDevice -SkipPull' -ForegroundColor Yellow
      Write-Host 'VIGTIGT: Kun iPhones inkluderet i DENNE builds signeringsprofil kan installere IPA-filen.' -ForegroundColor Yellow
    }elseif($Submit){
      Write-Host 'iOS production build og TestFlight-indsendelse startet via Expo EAS.' -ForegroundColor Green
    }else{
      Write-Host 'iOS production build færdigt hos Expo EAS. Upload én gang med: cd expo-ios; npx eas submit --platform ios --latest' -ForegroundColor Green
    }
  }finally{Pop-Location}
}
