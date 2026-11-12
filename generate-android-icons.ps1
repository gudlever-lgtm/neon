# Generate native Android launcher icons for Neon (Pong).
# Safe to rerun after every Capacitor sync. No extra npm packages.
[CmdletBinding()]
param([string]$ProjectRoot = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$androidRes = Join-Path $ProjectRoot 'android\app\src\main\res'
if (-not (Test-Path $androidRes)) { throw "Android resources not found: $androidRes" }
function C([string]$hex) { return [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Draw-Icon([int]$size, [bool]$transparent, [bool]$round, [string]$path) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.ScaleTransform($size / 512.0, $size / 512.0)
  try {
    $g.Clear([System.Drawing.Color]::Transparent)
    if (-not $transparent) {
      $b = [System.Drawing.SolidBrush]::new((C '#080D22'))
      try {
        if ($round) { $g.FillEllipse($b,0,0,512,512) } else { $g.FillRectangle($b,0,0,512,512) }
      } finally { $b.Dispose() }
    }
    # Keep the whole illustration in the adaptive safe-zone (center 2/3).
    $g.TranslateTransform(102,102)
    $g.ScaleTransform(0.6,0.6)
    $penC = [System.Drawing.Pen]::new((C '#49EFFE'),28)
    $penM = [System.Drawing.Pen]::new((C '#FF65DF'),28)
    $penT = [System.Drawing.Pen]::new((C '#227BBA'),15)
    $penC.StartCap = [System.Drawing.Drawing2D.LineCap]::Round; $penC.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penM.StartCap = [System.Drawing.Drawing2D.LineCap]::Round; $penM.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penT.StartCap = [System.Drawing.Drawing2D.LineCap]::Round; $penT.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    try {
      $g.DrawLine($penC,75,100,75,405)
      $g.DrawLine($penM,437,100,437,405)
      $g.DrawLine($penT,150,297,226,263)
      $ballGlow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(95,73,239,254))
      $ball = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
      try {
        $g.FillEllipse($ballGlow,220,210,98,98)
        $g.FillEllipse($ball,240,230,57,57)
      } finally { $ballGlow.Dispose(); $ball.Dispose() }
    } finally { $penC.Dispose(); $penM.Dispose(); $penT.Dispose() }
    $g.ResetTransform()
    if (-not $transparent) {
      $fontSize = if ($round) { 64 } else { 70 }
      $font = [System.Drawing.Font]::new('Arial', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
      $brush = [System.Drawing.SolidBrush]::new((C '#F6FCFF'))
      $fmt = [System.Drawing.StringFormat]::new()
      $fmt.Alignment = [System.Drawing.StringAlignment]::Center
      try { $g.DrawString('NEON',$font,$brush,[System.Drawing.RectangleF]::new(0,390,512,100),$fmt) }
      finally { $font.Dispose(); $brush.Dispose(); $fmt.Dispose() }
    }
    $dir = Split-Path -Parent $path
    New-Item -ItemType Directory -Force $dir | Out-Null
    $bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $g.Dispose(); $bmp.Dispose() }
}
$density = [ordered]@{mdpi=48;hdpi=72;xhdpi=96;xxhdpi=144;xxxhdpi=192}
foreach($name in $density.Keys) {
  $folder = Join-Path $androidRes "mipmap-$name"
  Draw-Icon $density[$name] $false $false (Join-Path $folder 'ic_launcher.png')
  Draw-Icon $density[$name] $false $true (Join-Path $folder 'ic_launcher_round.png')
}
$drawables = Join-Path $androidRes 'drawable'
Draw-Icon 432 $true $false (Join-Path $drawables 'ic_launcher_foreground.png')
$values = Join-Path $androidRes 'values'
New-Item -ItemType Directory -Force $values | Out-Null
$colors = Join-Path $values 'neon_launcher_colors.xml'
[System.IO.File]::WriteAllText($colors, '<?xml version="1.0" encoding="utf-8"?><resources><color name="neon_launcher_bg">#080D22</color></resources>', [System.Text.UTF8Encoding]::new($false))
$anydpi = Join-Path $androidRes 'mipmap-anydpi-v26'
New-Item -ItemType Directory -Force $anydpi | Out-Null
$adaptive = '<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/neon_launcher_bg"/><foreground android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>'
foreach($file in @('ic_launcher.xml','ic_launcher_round.xml')) {
  [System.IO.File]::WriteAllText((Join-Path $anydpi $file),$adaptive,[System.Text.UTF8Encoding]::new($false))
}
# Capacitor may retain Android's default label when appName changes.
$strings = Join-Path $values 'strings.xml'
if(Test-Path $strings) {
  [xml]$xml = Get-Content $strings -Raw
  $node = $xml.resources.string | Where-Object { $_.name -eq 'app_name' } | Select-Object -First 1
  if ($node) {
    $node.InnerText='Neon'
    $xml.Save($strings)
  }
}
Write-Host "NEON launcher icons generated: mipmap densities, adaptive foreground, background." -ForegroundColor Green
