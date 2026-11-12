const test=require('node:test');const assert=require('node:assert/strict');
const rules=require('../web/arcade-rules.js');
test('challenge rules are bounded and fallback to standard',()=>{
  assert.equal(rules.config('rush').duration,90);
  assert.equal(rules.config('chaos').pickupEvery,4);
  assert.equal(rules.config('unknown').name,'Standard');
});
test('pickup picker is deterministic and contains every type',()=>{
  assert.deepEqual([0,.26,.51,.76,1].map(rules.pickupAt),['wide','slow','shield','multiball','multiball']);
});
test('rush time and outcomes handle edges',()=>{
  assert.equal(rules.timeLeft(90,89.01),1);
  assert.equal(rules.timeLeft(90,100),0);
  assert.equal(rules.result(5,2),'win');
  assert.equal(rules.result(2,5),'loss');
  assert.equal(rules.result(3,3),'draw');
});
