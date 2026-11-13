# Read-only validation of Neon launcher resources. Does not build an APK.
[CmdletBinding()]
param([string]$ProjectRoot = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$res = Join-Path $ProjectRoot 'android\app\src\main\res'
if (-not (Test-Path $res)) {
  throw 'Android-projektet mangler. Generer Android-projektet før ikonkontrol; ingen APK er bygget.'
}

function Assert-Icon([string]$path, [int]$size) {
  if (-not (Test-Path $path)) { throw "Manglende Neon-ikon: $path" }
  $img = [System.Drawing.Image]::FromFile($path)
  try {
    if ($img.Width -ne $size -or $img.Height -ne $size) {
      throw "Forkert ikonstørrelse: $path ($($img.Width)x$($img.Height), forventet ${size}x${size})"
    }
  } finally { $img.Dispose() }
}

foreach ($pair in @(@('mdpi',48),@('hdpi',72),@('xhdpi',96),@('xxhdpi',144),@('xxxhdpi',192))) {
  $dir = Join-Path $res ('mipmap-' + $pair[0])
  Assert-Icon (Join-Path $dir 'ic_launcher.png') $pair[1]
  Assert-Icon (Join-Path $dir 'ic_launcher_round.png') $pair[1]
}

$foreground = Join-Path $res 'drawable-nodpi\neon_launcher_foreground.png'
Assert-Icon $foreground 432
$adaptiveDir = Join-Path $res 'mipmap-anydpi-v26'
foreach ($file in @('ic_launcher.xml','ic_launcher_round.xml')) {
  $xml = Get-Content (Join-Path $adaptiveDir $file) -Raw
  if (-not $xml.Contains('@drawable/neon_launcher_foreground') -or -not $xml.Contains('@color/neon_launcher_bg')) {
    throw "Forkert adaptive ikon: $file"
  }
}

$manifest = Get-Content (Join-Path $ProjectRoot 'android\app\src\main\AndroidManifest.xml') -Raw
if (-not $manifest.Contains('@mipmap/ic_launcher') -or -not $manifest.Contains('@mipmap/ic_launcher_round')) {
  throw 'AndroidManifest henviser ikke til begge Neon-ikonressourcer.'
}
$strings = Get-Content (Join-Path $res 'values\strings.xml') -Raw
if ($strings -notmatch '<string\s+name="app_name">Neon</string>') {
  throw 'Appens synlige Android-navn er ikke Neon.'
}
Write-Host 'PASS Neon: alle launcher-størrelser, adaptive ikoner, manifest og appnavn er korrekte.' -ForegroundColor Green
Write-Host 'Ingen APK bygget.'
