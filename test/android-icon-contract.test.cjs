const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const build = fs.readFileSync(path.join(root, 'build-apk.ps1'), 'utf8');
const icons = fs.readFileSync(path.join(root, 'generate-android-icons.ps1'), 'utf8');

test('Neon Android launcher art is reapplied after Capacitor sync', () => {
  const sync = build.indexOf("@('cap','sync','android')");
  const generate = build.indexOf("'generate-android-icons.ps1') -ProjectRoot");
  assert.ok(sync >= 0 && generate > sync, 'Generate launcher resources after cap sync');
  assert.match(icons, /'Neon'/, 'Native app label must be Neon');
  assert.match(icons, /neon_launcher_foreground\.png/);
  assert.match(icons, /@mipmap\/ic_launcher/);
  assert.match(icons, /@mipmap\/ic_launcher_round/);
  assert.match(icons, /mipmap-anydpi-v26/);
  for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    assert.ok(icons.includes(`${density}=`), `Missing Android density: ${density}`);
  }
});
test('Android builds stay local while only iOS uses Expo EAS',()=>{
  assert.match(build,/\[Alias\('Platform'\)\]/);
  assert.match(build,/gradlew\.bat' @\('assembleDebug'/);
  assert.match(build,/gradlew\.bat' @\('bundleRelease'/);
  assert.match(build,/if\(\$Target -in @\('ios','all'\)\)/);
  assert.match(build,/\$easArgs=@\('eas','build','--platform','ios'/);
  assert.match(build,/if\(\$Submit\)\{\$easArgs\+= '--auto-submit'\}/);
  assert.match(build,/Copy-Item \$apk \(Join-Path \$OutputDirectory 'neon\.apk'\)/);
  assert.match(build,/Copy-Item \$aab \(Join-Path \$OutputDirectory 'neon-release-unsigned\.aab'\)/);
});
