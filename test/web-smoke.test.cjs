const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const web=path.join(__dirname,'..','web');
function scenario(){
 const noop=()=>{};
 const nodes=new Map();
 function node(id){
   if(!nodes.has(id)){
     const classes=new Set();
     nodes.set(id,{id,disabled:false,hidden:false,innerHTML:'',textContent:'',dataset:{},handlers:{},
       classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on===undefined?(classes.has(v)?classes.delete(v):classes.add(v)):on?classes.add(v):classes.delete(v),contains:v=>classes.has(v)},
       setAttribute:noop,addEventListener(type,fn){this.handlers[type]=fn},
       querySelector(){return {textContent:''}},
       getBoundingClientRect(){return {left:0,top:0,width:390,height:590}},setPointerCapture:noop});
   }
   return nodes.get(id);
 }
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop});
 node('game').getContext=()=>ctx;
 const diff=['easy','normal','hard'].map(id=>{const x=node(id);x.dataset.difficulty=id;return x});
 const challenges=['standard','rush','chaos'].map(id=>{const x=node(id);x.dataset.challenge=id;return x});
 const document={hidden:false,getElementById:node,querySelector:()=>node('selector'),querySelectorAll:s=>s==='[data-difficulty]'?diff:s==='[data-challenge]'?challenges:[],addEventListener:noop};
 let frame,clock=0;
 const window={addEventListener:noop,matchMedia:()=>({matches:true}),confirm:()=>true};
 const sandbox={window,document,navigator:{vibrate:noop},localStorage:{getItem:()=>null,setItem:noop},performance:{now:()=>clock},requestAnimationFrame:fn=>{frame=fn},Math,console};
 vm.runInNewContext(fs.readFileSync(path.join(web,'arcade-rules.js'),'utf8'),sandbox);
 vm.runInNewContext(fs.readFileSync(path.join(web,'mobile-utils.js'),'utf8'),sandbox);
 vm.runInNewContext(fs.readFileSync(path.join(web,'game.js'),'utf8'),sandbox);
 return {node,window,challenge:id=>node(id).handlers.click(),mode:id=>node(id+'-mode').onclick(),start:()=>node('main-action').onclick(),tick:n=>{for(let i=0;i<n;i++){clock+=32;frame(clock)}}};
}
test('Neon game initializes and draws Classic without runtime errors',()=>{
 const s=scenario();s.start();s.tick(20);assert.equal(s.node('mode-tag').textContent,'CLASSIC MODE');
});
test('Arcade rush challenge runs and updates countdown',()=>{
 const s=scenario();s.mode('arcade');s.challenge('rush');s.start();s.tick(100);
 assert.equal(s.node('mode-tag').textContent,'ARCADE MODE');
 assert.match(s.node('state-tag').textContent,/RUSH \d+s/);
});
test('Arcade chaos with power-up logic stays renderable',()=>{
 const s=scenario();s.mode('arcade');s.challenge('chaos');s.start();s.tick(550);
 assert.equal(s.node('mode-tag').textContent,'ARCADE MODE');
});
test('Multiplayer profile and history controls exist in lobby',()=>{
 const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
 for(const id of ['online-lobby','profile-panel','profile-detail','profile-close','match-history','rank-list']){
   assert.ok(html.includes('id="'+id+'"'),'missing UI #'+id);
 }
});
test('Mobile multiplayer updates score and connection quality without render errors',()=>{
 const s=scenario();s.window.NeonRallyOnline={side:'bottom',player:{id:2}};
 s.window.NeonRallyBridge.startOnline({matchId:7});
 s.window.NeonRallyBridge.snapshot({ball:{x:180,y:260},topX:200,bottomX:175,topScore:1,bottomScore:2,readyMs:0});
 s.window.NeonRallyBridge.connection('slow');s.tick(20);
 assert.equal(s.node('player-score').textContent,2);
 assert.equal(s.node('connection-quality').textContent,'● LANGSOM');
 s.window.NeonRallyBridge.finishOnline({winnerId:2,topScore:3,bottomScore:7});s.tick(6);
 assert.match(s.node('overlay-title').innerHTML,/VANDT/);
});
