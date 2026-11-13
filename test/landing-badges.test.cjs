const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('store badges have icons, clear coming-soon labels and no dead links',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../landing/index.html'),'utf8');
  const stores=html.match(/<div class="store" aria-disabled="true"[\s\S]*?<\/div>/g)||[];
  assert.equal(stores.length,2);
  for(const [index,name] of ['Google Play','App Store'].entries()){
    assert.match(stores[index],/<svg[^>]*aria-hidden="true"/);
    assert.match(stores[index],/KOMMER SNART/);
    assert.ok(stores[index].includes(name));
    assert.doesNotMatch(stores[index],/<a\s/);
  }
});
