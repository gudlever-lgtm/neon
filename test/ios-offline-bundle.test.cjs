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
