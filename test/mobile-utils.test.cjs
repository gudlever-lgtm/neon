const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const window={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','web','mobile-utils.js'),'utf8'),{window});
const {boardX,ease,quality}=window.NeonMobile;

test('touch coordinates scale consistently between narrow and wide screens',()=>{
  assert.equal(boardX(195,{left:0,width:390}),195);
  assert.equal(boardX(97.5,{left:0,width:195}),195);
  assert.equal(boardX(297.5,{left:200,width:195}),195);
  assert.equal(boardX(-100,{left:0,width:390}),62);
  assert.equal(boardX(900,{left:0,width:390}),328);
  assert.equal(boardX(NaN,{left:0,width:390}),195);
});
test('frame-rate independent easing approaches the target without overshooting',()=>{
  const one=ease(0,100,.032),two=ease(ease(0,100,.016),100,.016);
  assert.ok(Math.abs(one-two)<1e-9);
  assert.ok(one>0&&one<100);
  assert.equal(ease(0,100,0),0);
  assert.equal(ease(0,NaN,.016),0);
});
test('connection indicator represents snapshot freshness, not invented ping',()=>{
  assert.equal(quality(60,50),'good');
  assert.equal(quality(100,250),'slow');
  assert.equal(quality(700,50),'slow');
  assert.equal(quality(1900,50),'lost');
  assert.equal(quality(Infinity,50),'lost');
  assert.equal(quality(20,50,false),'lost');
});
