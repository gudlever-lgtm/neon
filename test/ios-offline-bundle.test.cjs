const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('Expo iOS embeds Neon and needs no internet for Classic and Arcade',()=>{
  const bundle=require('../expo-ios/neon-bundle.generated.json');
  const html=bundle.html;
  assert.match(html,/CLASSIC/);
  assert.match(html,/ARCADE/);
  assert.match(html,/function resetBall/);
  assert.match(html,/window\.NEON_API_BASE = 'https:\/\/dulmens\.dk\/neon'/);
  for(const file of ['styles.css','arcade-rules.js','mobile-utils.js','game.js','online.js']){
    assert.doesNotMatch(html,new RegExp('(?:src|href)="'+file.replace('.','\\.')+'"'));
  }
  assert.equal(bundle.version,require('../package.json').version);
  const app=fs.readFileSync(path.join(root,'expo-ios/App.js'),'utf8');
  assert.match(app,/source=\{\{html:bundle\.html/);
});
test('iOS launcher icon is a full-size opaque PNG and configured in Expo',()=>{
  const expo=require('../expo-ios/app.json').expo;
  assert.equal(expo.icon,'./assets/neon-icon.png');
  assert.equal(expo.ios.icon,expo.icon);
  const png=fs.readFileSync(path.join(root,'expo-ios/assets/neon-icon.png'));
  assert.equal(png.subarray(1,4).toString('ascii'),'PNG');
  assert.equal(png.readUInt32BE(16),1024);
  assert.equal(png.readUInt32BE(20),1024);
  assert.equal(png[25],2,'RGB with no alpha channel');
  const eas=require('../expo-ios/eas.json');
  assert.equal(eas.build.preview.distribution,'internal');
});
