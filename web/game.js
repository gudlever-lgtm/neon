(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'); const ctx = canvas.getContext('2d');
  const W = 390, H = 590, PADY = 40, PADH = 548, PADW = 92, PADHEIGHT = 12, BALLR = 7;
  const game = {difficulty:'normal',stats:{played:0,wins:0,streak:0,best:0},state:'menu',mode:'classic', scoreAI:0,scorePlayer:0, playerX:W/2,aiX:W/2,ball:{x:W/2,y:H/2,vx:0,vy:0}, trail:[],particles:[],boost:2,shield:1,boostReady:false,shieldReady:false, countdown:0, matchNumber:0, flash:0, hitGlow:0, screenShake:0, arenaTime:0, arcadeChallenge:'standard', arcadeElapsed:0, pickup:null, pickupAt:8, wideUntil:0, extraBall:null, aiError:0, aiTarget:W/2, aiClock:0, pointerDown:false, activePointerId:null, multiPointers:{top:null,bottom:null}, multiHadBoth:false, pauseReason:null, sound:false, last:0,toastUntil:0};
  const arcade=window.NeonArcade;
  let audio;
  try { const saved=JSON.parse(localStorage.getItem('neon-rally-settings')||'{}'); if(['easy','normal','hard'].includes(saved.difficulty)) game.difficulty=saved.difficulty; game.sound=!!saved.sound; }catch(_){}
  try { const saved=JSON.parse(localStorage.getItem('neon-rally-stats')||'{}'); for(const k of ['played','wins','streak','best']) if(Number.isSafeInteger(saved[k])&&saved[k]>=0)game.stats[k]=saved[k]; }catch(_){}
  function saveSettings(){try{localStorage.setItem('neon-rally-settings',JSON.stringify({difficulty:game.difficulty,sound:game.sound}))}catch(_){}}
  function saveStats(){try{localStorage.setItem('neon-rally-stats',JSON.stringify(game.stats))}catch(_){}}
  function renderStats(){const s=game.stats;$('stats').textContent=`KAMPE ${s.played} · SEJRE ${s.wins} · BEDSTE STIME ${s.best}`}
  function selectDifficulty(d){if(!['easy','normal','hard'].includes(d))return;game.difficulty=d;document.querySelectorAll('[data-difficulty]').forEach(b=>{b.classList.toggle('active',b.dataset.difficulty===d);b.setAttribute('aria-pressed',String(b.dataset.difficulty===d))});saveSettings()}
  function rumble(ms){if(navigator.vibrate)try{navigator.vibrate(ms)}catch(_){}}
  function celebrate(x,y,color,n=28){particles(x,y,color,n);game.flash=.85;game.screenShake=8;rumble(35)}
  function tone(freq=300,dur=.07,type='sine',volume=.028){if(!game.sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+dur)}catch(e){/* optional sound */}}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function updateUI(){ $('top-label').textContent=game.mode==='online'?'MODSTANDER':game.mode==='versus'?'SPILLER 2':'COMPUTER'; $('bottom-label').textContent=game.mode==='online'?'DIG':game.mode==='versus'?'SPILLER 1':'DIG'; $('control-heading').textContent=game.mode==='online'?'ONLINE DUEL':game.mode==='versus'?'2 SPILLERE':'DRAG TO MOVE'; $('control-hint').textContent=game.mode==='online'?'Træk for at styre · livekamp':game.mode==='versus'?'Begge holder fingeren på banen':'Hold fingeren på banen · slip for pause'; $('ai-score').textContent=game.scoreAI; $('player-score').textContent=game.scorePlayer; $('mode-tag').textContent=game.mode.toUpperCase()+' MODE'; $('state-tag').textContent=game.mode==='arcade'&&game.arcadeChallenge==='rush'&&game.state==='playing'?`RUSH ${arcade.timeLeft(90,game.arcadeElapsed)}s`:game.state==='playing'?'FØRST TIL 7':game.state==='paused'?(game.pauseReason==='touch'?'LØFTET FINGER':'PAUSE'):'FØRST TIL 7'; $('powerups').hidden=game.mode!=='arcade'||game.state==='menu'; $('boost-count').textContent=game.boost; $('shield-count').textContent=game.shield; $('boost').disabled=game.boost<=0||game.boostReady||game.state!=='playing'; $('shield').disabled=game.shield<=0||game.shieldReady||game.state!=='playing'; $('pause').disabled=game.mode==='online'; $('pause').textContent=game.state==='paused'?'▶':'Ⅱ'; $('pause').setAttribute('aria-label',game.state==='paused'?'Fortsæt':'Pause'); }
  function overlay(kicker,title,desc,btn,tip,select){$('overlay-kicker').textContent=kicker; $('overlay-title').innerHTML=title; $('overlay-desc').innerHTML=desc; $('main-action').innerHTML=btn+' <span>➜</span>'; $('overlay-tip').textContent=tip; $('mode-select').hidden=!select; $('overlay').classList.toggle('compact',!select);$('menu-config').hidden=!select;$('overlay-home').classList.toggle('hidden',select);$('overlay').classList.remove('hidden');}
  function hideOverlay(){$('overlay').classList.add('hidden');$('overlay').classList.remove('compact')}
  function showToast(t){$('toast').textContent=t;$('toast').classList.remove('hidden');game.toastUntil=performance.now()+1000}
  function chooseMode(mode){if(game.state!=='menu'||!['classic','arcade','versus'].includes(mode))return;game.mode=mode;for(const m of ['classic','arcade','versus'])$(m+'-mode').classList.toggle('active',mode===m);$('multiplayer-help').classList.toggle('hidden',mode!=='versus');document.querySelector('.difficulty').classList.toggle('hidden',mode==='versus');$('arcade-challenges').classList.toggle('hidden',mode!=='arcade');updateUI()}
  function resetBall(direction){game.pauseReason=null;if(game.mode!=='versus'){game.pointerDown=false;game.activePointerId=null;}game.ball={x:W/2,y:H/2,vx:(Math.random()>.5?1:-1)*105,vy:direction*270};game.trail=[];game.extraBall=null;game.aiClock=0;game.aiTarget=W/2;game.countdown=.8;game.state='playing';updateUI()}
  function startGame(){game.arcadeElapsed=0;game.pickup=null;game.extraBall=null;game.pickupAt=arcade.config(game.arcadeChallenge).pickupEvery;game.wideUntil=0;game.arenaTime=0;game.pauseReason=null;game.pointerDown=false;game.activePointerId=null;game.multiPointers={top:null,bottom:null};game.multiHadBoth=false;hideTouchPause();game.scoreAI=0;game.scorePlayer=0;game.playerX=W/2;game.aiX=W/2;game.boost=2;game.shield=1;game.boostReady=false;game.shieldReady=false;game.matchNumber++;hideOverlay();resetBall(Math.random()>.5?1:-1);if(game.mode==='versus')setPaused(true,'touch');tone(550,.15)}
  function goHome(){
    if(game.mode==='online' && game.state==='online'){
      if(!window.confirm('Forlad onlinekampen? Det tæller som nederlag.'))return;
      window.NeonRallyOnline?.forfeit().catch(e=>showToast(e.message));return;
    }
    // An unfinished game is deliberately not counted in the statistics.
    if(game.state==='playing' || game.state==='paused'){
      if(!window.confirm('Afslut kampen og gå til forsiden?'))return;
    }
    if(game.mode==='online'&&game.state==='online-finished'){game.mode='classic';game.state='menu';window.NeonRallyBridge.openLobby();window.NeonRallyOnline?.open();return}
    game.mode='classic';game.state='menu';game.pauseReason=null;game.pointerDown=false;game.activePointerId=null;game.multiPointers={top:null,bottom:null};game.multiHadBoth=false;
    game.countdown=0;game.trail=[];game.particles=[];game.flash=0;
    game.scoreAI=0;game.scorePlayer=0;game.playerX=W/2;game.aiX=W/2;
    game.boostReady=false;game.shieldReady=false;
    hideTouchPause();$('countdown').classList.add('hidden');$('toast').classList.add('hidden');game.toastUntil=0;
    renderStats();
    $('main-action').onclick=()=>{if(game.state==='paused'){setPaused(false);return}startGame()};
    overlay('MOBILE ARCADE','NEON','Pong, genopfundet til touch.<br>Først til 7 point vinder.','SPIL NU','Vælg Classic, Arcade eller 2 spillere.',true);
    updateUI();
  }
  function showTouchPause(){ $('touch-pause').classList.remove('hidden');$('touch-pause').querySelector('span').textContent=game.mode==='versus'?'Begge spillere skal holde en finger på banen':'Sæt fingeren på banen for at fortsætte' }
  function hideTouchPause(){ $('touch-pause').classList.add('hidden') }
  function setPaused(p,reason='manual'){
    if(p&&game.state==='playing'){
      game.state='paused';game.pauseReason=reason;
      if(reason==='touch')showTouchPause();
      else {hideTouchPause();overlay('SPILLET ER SAT PÅ PAUSE','PAUSE','Tag en kort pause. Din kamp er gemt i denne session.','FORTSÆT','Tryk Fortsæt for at vende tilbage til banen.',false)}
    }else if(!p&&game.state==='paused'){
      if(game.mode==='versus'&&!bothPresent()){game.pauseReason='touch';hideOverlay();showTouchPause();updateUI();return;}
      game.state='playing';game.pauseReason=null;game.countdown=.7;hideTouchPause();hideOverlay();
    }
    updateUI();
  }
  function finish(){
    game.state='finished';
    const outcome=game.mode==='arcade'&&game.arcadeChallenge==='rush'?arcade.result(game.scorePlayer,game.scoreAI):(game.scorePlayer>=7?'win':'loss');const win=outcome==='win';
    if(game.mode!=='versus'){
      game.stats.played++;if(win){game.stats.wins++;game.stats.streak++;game.stats.best=Math.max(game.stats.best,game.stats.streak)}else game.stats.streak=0;
      saveStats();renderStats();
    }
    celebrate(W/2,H/2,win?'#36f4ff':'#f25aff',34);tone(win?880:170,.35,'triangle');
    const title=outcome==='draw'?'<em>UAFGJORT!</em>':game.mode==='versus'?(win?'SPILLER 1 <em>VINDER!</em>':'SPILLER 2 <em>VINDER!</em>'):(win?'DU <em>VANDT!</em>':'PRØV <em>IGEN</em>');
    const desc=game.mode==='versus'?`SPILLER 1 ${game.scorePlayer} – ${game.scoreAI} SPILLER 2`:`${game.scorePlayer} – ${game.scoreAI}<br>${win?'Fantastisk spillet!':'Computeren tog denne runde.'}`;
    overlay('KAMP SLUT',title,desc,'SPIL IGEN',game.mode==='versus'?'Begge spillere skal holde fingeren på banen.':'Ny kamp starter med samme spiltype.',false);updateUI();
  }
  function point(toPlayer){if(toPlayer)game.scorePlayer++;else game.scoreAI++;game.flash=1;rumble(toPlayer?26:65);particles(W/2,H/2,toPlayer?'#30efff':'#fa5cde',18);showToast(game.mode==='versus'?(toPlayer?'POINT TIL SPILLER 1!':'POINT TIL SPILLER 2!'):(toPlayer?'POINT TIL DIG!':'POINT TIL COMPUTEREN'));tone(toPlayer?730:170,.22,'sawtooth',.016);if(game.scorePlayer>=7||game.scoreAI>=7){finish();return}resetBall(toPlayer?1:-1)}
  function particles(x,y,color,n=9){if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)n=Math.min(n,5);for(let i=0;i<n;i++){let a=Math.random()*Math.PI*2,s=30+Math.random()*130;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.3,color})}}
  function update(dt){if(game.state!=='playing')return;game.arenaTime+=dt;game.screenShake=Math.max(0,game.screenShake-35*dt);game.hitGlow=Math.max(0,game.hitGlow-4*dt);if(game.countdown>0){game.countdown=Math.max(0,game.countdown-dt);return}
    const b=game.ball;const beforeY=b.y;
    const aiConfig={easy:{reaction:.22,error:110,speed:167},normal:{reaction:.12,error:54,speed:245},hard:{reaction:.07,error:22,speed:315}}[game.difficulty];
    // AI predicts impact near the top paddle, updating the target in intervals (non-perfect opponent).
    if(game.mode!=='versus'){game.aiClock-=dt;if(game.aiClock<=0){game.aiClock=aiConfig.reaction;const travel=Math.max(0,(b.y-(PADY+PADHEIGHT/2))/Math.max(100,-b.vy));let projected=b.x+(b.vy<0?b.vx*travel:0);const left=BALLR+9,right=W-BALLR-9,span=right-left;const period=2*span;const phase=((projected-left)%period+period)%period;projected=left+(phase<=span?phase:period-phase);game.aiError=(Math.random()-.5)*aiConfig.error;game.aiTarget=clamp(projected+game.aiError,PADW/2+12,W-PADW/2-12)}
    game.aiX+=clamp(game.aiTarget-game.aiX,-aiConfig.speed*dt,aiConfig.speed*dt);}
    if(game.mode==='arcade'){
      game.arcadeElapsed+=dt;
      const challenge=arcade.config(game.arcadeChallenge);
      if(challenge.duration && game.arcadeElapsed>=challenge.duration){finish();return}
      if(challenge.duration)$('state-tag').textContent='RUSH '+arcade.timeLeft(challenge.duration,game.arcadeElapsed)+'s';
      if(game.arcadeElapsed>=game.pickupAt){
        if(!game.pickup)game.pickup={type:arcade.pickupAt(Math.random()),x:55+Math.random()*(W-110),y:170+Math.random()*250,ttl:9};
        game.pickupAt=game.arcadeElapsed+challenge.pickupEvery;
      }
      if(game.pickup){game.pickup.ttl-=dt;if(game.pickup.ttl<=0)game.pickup=null}
    }
    const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/5));const step=dt/steps;
    for(let i=0;i<steps;i++){
      let oldY=b.y;b.x+=b.vx*step;b.y+=b.vy*step;
      if(b.x<BALLR+9&&b.vx<0){b.x=BALLR+9;b.vx=Math.abs(b.vx);tone(185,.035)}if(b.x>W-BALLR-9&&b.vx>0){b.x=W-BALLR-9;b.vx=-Math.abs(b.vx);tone(185,.035)}
      // Crossing planes, prevents ball tunneling at faster speeds.
      if(b.vy<0&&oldY-BALLR>=PADY+PADHEIGHT/2&&b.y-BALLR<=PADY+PADHEIGHT/2&&Math.abs(b.x-game.aiX)<PADW/2+BALLR){b.y=PADY+PADHEIGHT/2+BALLR;bounce(game.aiX,false);particles(b.x,b.y,'#26eeff',15);rumble(13)}
      if(b.vy>0&&oldY+BALLR<=PADH-PADHEIGHT/2&&b.y+BALLR>=PADH-PADHEIGHT/2&&Math.abs(b.x-game.playerX)<playerPadWidth()/2+BALLR){b.y=PADH-PADHEIGHT/2-BALLR;bounce(game.playerX,true);particles(b.x,b.y,'#ef55fd',15);rumble(18)}
      if(game.mode==='arcade'&&game.pickup&&Math.hypot(b.x-game.pickup.x,b.y-game.pickup.y)<BALLR+17){
        const kind=game.pickup.type;game.pickup=null;collectPickup(kind);
      }
      if(b.y<-16){point(true);break}
      if(b.y>H+16){if(game.shieldReady){game.shieldReady=false;b.y=PADH-32;b.vy=-Math.abs(b.vy);b.vx+=(Math.random()-.5)*70;particles(b.x,PADH,'#67d6ff',22);showToast('SKJOLD REDDER DIG!');tone(620,.2);updateUI()}else{point(false);break}}
    }
    if(game.state!=='playing')return;
    advanceExtraBall(dt);
    if(game.state!=='playing')return;
    if(Math.abs(b.y-beforeY)>0)game.trail.push({x:b.x,y:b.y,life:.36});if(game.trail.length>60)game.trail.shift();for(const t of game.trail)t.life-=dt;game.trail=game.trail.filter(t=>t.life>0);
    for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}game.particles=game.particles.filter(p=>p.life>0);game.flash=Math.max(0,game.flash-2*dt);
  }
  // Extra Arcade ball: independent physics; missing it never costs a life.
  // Scoring with it triggers the same server-free, local point logic as the main ball.
  function advanceExtraBall(dt){
    const b=game.extraBall;if(!b||game.mode!=='arcade')return;
    const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/5)),step=dt/steps;
    for(let i=0;i<steps;i++){
      const oldY=b.y;b.x+=b.vx*step;b.y+=b.vy*step;
      if(b.x<=BALLR+9&&b.vx<0){b.x=BALLR+9;b.vx=-b.vx}
      if(b.x>=W-BALLR-9&&b.vx>0){b.x=W-BALLR-9;b.vx=-b.vx}
      if(b.vy<0&&oldY-BALLR>=PADY+PADHEIGHT/2&&b.y-BALLR<=PADY+PADHEIGHT/2&&Math.abs(b.x-game.aiX)<=PADW/2+BALLR){
        b.y=PADY+PADHEIGHT/2+BALLR;b.vy=Math.abs(b.vy);b.vx+=clamp((b.x-game.aiX)/PADW,-.5,.5)*120;
        particles(b.x,b.y,'#ffbcf2',8);
      }
      if(b.vy>0&&oldY+BALLR<=PADH-PADHEIGHT/2&&b.y+BALLR>=PADH-PADHEIGHT/2&&Math.abs(b.x-game.playerX)<=playerPadWidth()/2+BALLR){
        b.y=PADH-PADHEIGHT/2-BALLR;b.vy=-Math.abs(b.vy);b.vx+=clamp((b.x-game.playerX)/PADW,-.5,.5)*120;
        particles(b.x,b.y,'#ffc7ef',8);
      }
      if(b.y<-16){game.extraBall=null;point(true);return}
      if(b.y>H+16){game.extraBall=null;return}
    }
  }
  function playerPadWidth(){return game.mode==='arcade'&&game.wideUntil>game.arcadeElapsed?PADW*1.5:PADW}
  function collectPickup(kind){
    if(kind==='wide'){game.wideUntil=game.arcadeElapsed+9;showToast('BREDT BAT · 9 SEK')}
    else if(kind==='slow'){game.ball.vx*=.72;game.ball.vy*=.72;showToast('SLOWMOTION!')}
    else if(kind==='shield'){game.shield=Math.min(3,game.shield+1);showToast('EKSTRA SKJOLD')}
    else if(kind==='multiball'){const b=game.ball;game.extraBall={x:b.x,y:b.y,vx:Math.abs(b.vx)<70?160:-b.vx,vy:-Math.max(290,Math.abs(b.vy))};showToast('MULTIBALL!')}
    particles(game.ball.x,game.ball.y,'#f3c570',23);tone(780,.16,'triangle');rumble(20);updateUI();
  }
  function bounce(paddleX,isPlayer){game.hitGlow=1;game.screenShake=Math.max(game.screenShake,3);const b=game.ball;const hit=clamp((b.x-paddleX)/((isPlayer?playerPadWidth():PADW)/2),-1,1);let speed=clamp(Math.hypot(b.vx,b.vy)*1.035,280,640);if(isPlayer&&game.boostReady){speed=Math.min(690,speed*1.36);game.boostReady=false;showToast('TURBO HIT!');particles(b.x,b.y,'#ffce69',20);tone(790,.15,'sawtooth');updateUI()}else tone(isPlayer?430:320,.055,'triangle');const angle=hit*1.05;b.vx=Math.sin(angle)*speed;b.vy=(isPlayer?-1:1)*Math.cos(angle)*speed;if(Math.abs(b.vx)<30)b.vx=b.vx<0?-30:30}
  function draw(){ctx.clearRect(0,0,W,H);ctx.save();if(game.screenShake>0&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){ctx.translate((Math.random()-.5)*game.screenShake,(Math.random()-.5)*game.screenShake);}const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#081b31');bg.addColorStop(.5,'#080c22');bg.addColorStop(1,'#20102d');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.lineWidth=.6;ctx.strokeStyle='#2d51732a';for(let x=24;x<W;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=18;y<H;y+=35){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    ctx.save();ctx.shadowBlur=15;ctx.shadowColor='#20eaff';ctx.strokeStyle='#21d8f4';ctx.lineWidth=2;ctx.strokeRect(7,8,W-14,H-16);ctx.shadowColor='#d445fc';ctx.strokeStyle='#c344e4';ctx.beginPath();ctx.moveTo(7,H-8);ctx.lineTo(W-7,H-8);ctx.stroke();ctx.restore();
    const pulse=.5+.5*Math.sin(game.arenaTime*1.8);
    ctx.save();ctx.globalAlpha=.10+.10*pulse;ctx.fillStyle='#2de9ff';ctx.fillRect(8,H/2-2,W-16,4);ctx.restore();
    ctx.save();ctx.setLineDash([10,10]);ctx.strokeStyle='#9b75dd99';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(10,H/2);ctx.lineTo(W-10,H/2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    if(game.shieldReady){ctx.save();ctx.strokeStyle='#67d6ff';ctx.shadowColor='#67d6ff';ctx.shadowBlur=18;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(30,H-27);ctx.lineTo(W-30,H-27);ctx.stroke();ctx.restore()}
    if(game.mode==='versus'){ctx.save();ctx.fillStyle='#f367de12';ctx.fillRect(8,8,W-16,95);ctx.fillStyle='#3deaff10';ctx.fillRect(8,H-103,W-16,95);ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#f7a2e3';ctx.fillText('SPILLER 2',W/2,88);ctx.fillStyle='#85efff';ctx.fillText('SPILLER 1',W/2,H-82);ctx.restore();}
    if(game.mode==='arcade'&&game.pickup){
      const p=game.pickup;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(game.arenaTime*.7);ctx.shadowBlur=25;ctx.shadowColor='#ffd86b';ctx.fillStyle='#201b38';ctx.strokeStyle='#ffd86b';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-16,-16,32,32,7);ctx.fill();ctx.stroke();ctx.restore();
      ctx.save();ctx.fillStyle='#fff0b0';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.type==='wide'?'W':p.type==='slow'?'S':p.type==='shield'?'+':'×2',p.x,p.y);ctx.restore();
    }
    drawPaddle(game.aiX,PADY,'#23e9f3');drawPaddle(game.playerX,PADH,'#eb52ef',playerPadWidth());
    // Soft continuous glow and a dotted tail provide speed feedback without altering physics.
    if(game.trail.length>1){ctx.save();ctx.lineCap='round';for(let i=1;i<game.trail.length;i++){const a=game.trail[i-1],c=game.trail[i],f=Math.max(0,c.life/.36);ctx.strokeStyle=`rgba(32,210,255,${f*.30})`;ctx.lineWidth=1+f*9;ctx.shadowBlur=12;ctx.shadowColor='#29bcff';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke()}ctx.restore()}
    for(const t of game.trail){ctx.beginPath();ctx.fillStyle=`rgba(100,230,255,${(t.life/.36)*.22})`;ctx.arc(t.x,t.y,BALLR*.65*(t.life/.36),0,Math.PI*2);ctx.fill()}
    for(const p of game.particles){ctx.globalAlpha=clamp(p.life/.6,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
    if(game.mode==='arcade'&&game.extraBall){const b=game.extraBall;ctx.save();ctx.shadowBlur=23;ctx.shadowColor='#ff65df';ctx.fillStyle='#fff2fa';ctx.beginPath();ctx.arc(b.x,b.y,BALLR,0,Math.PI*2);ctx.fill();ctx.restore()}
    const b=game.ball;ctx.save();ctx.shadowBlur=23;ctx.shadowColor='#43cfff';ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,BALLR,0,Math.PI*2);ctx.fill();ctx.restore();
    if(game.boostReady){ctx.save();ctx.strokeStyle='#f7c95d';ctx.shadowBlur=18;ctx.shadowColor='#edc252';ctx.lineWidth=2;ctx.strokeRect(game.playerX-PADW/2-4,PADH-PADHEIGHT/2-5,PADW+8,PADHEIGHT+10);ctx.restore()}
    if(game.hitGlow>0){ctx.save();ctx.strokeStyle='rgba(255,255,255,'+(game.hitGlow*.35)+')';ctx.lineWidth=2+game.hitGlow*6;ctx.strokeRect(8,8,W-16,H-16);ctx.restore()}
    if(game.flash>0){ctx.fillStyle=`rgba(255,255,255,${game.flash*.08})`;ctx.fillRect(0,0,W,H)}
    if(game.countdown>0&&game.state==='playing'){ctx.save();ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillStyle='#ddf9ff';ctx.shadowColor='#27dfff';ctx.shadowBlur=15;ctx.fillText('KLAR?',W/2,H/2-20);ctx.restore()}
    ctx.restore();
  }
  function drawPaddle(x,y,color,width=PADW){ctx.save();ctx.shadowBlur=21;ctx.shadowColor=color;ctx.fillStyle=color;roundRect(ctx,x-width/2,y-PADHEIGHT/2,width,PADHEIGHT,6);ctx.fill();ctx.fillStyle='#ffffff88';roundRect(ctx,x-width/2+5,y-PADHEIGHT/2+2,width-10,3,2);ctx.fill();ctx.restore()}
  function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
  function frame(time){const dt=game.last?Math.min((time-game.last)/1000,.032):0;game.last=time;update(dt);draw();if(game.toastUntil&&time>game.toastUntil){$('toast').classList.add('hidden');game.toastUntil=0}requestAnimationFrame(frame)}
  function pointerPosition(e){const r=canvas.getBoundingClientRect();return clamp((e.clientX-r.left)/r.width*W,PADW/2+16,W-PADW/2-16)}
  function pointerSide(e){const r=canvas.getBoundingClientRect();return ((e.clientY-r.top)/r.height)<.5?'top':'bottom'}
  function bothPresent(){return game.multiPointers.top!==null&&game.multiPointers.bottom!==null}
  function move(e){
    if(game.state!=='playing')return;
    if(game.mode==='versus'){
      if(game.multiPointers.top===e.pointerId)game.aiX=pointerPosition(e);
      if(game.multiPointers.bottom===e.pointerId)game.playerX=pointerPosition(e);
    }else game.playerX=pointerPosition(e);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(game.mode==='online' && game.state==='online'){game.activePointerId=e.pointerId;try{canvas.setPointerCapture(e.pointerId)}catch(_){};window.NeonRallyOnline?.sendX(pointerPosition(e));return}
    if(game.state!=='playing'&&!(game.state==='paused'&&game.pauseReason==='touch'))return;
    if(game.mode==='versus'){
      const side=pointerSide(e);
      if(game.multiPointers[side]!==null)return;
      // One pointer ID is allowed to control exactly one paddle.
      if(game.multiPointers.top===e.pointerId||game.multiPointers.bottom===e.pointerId)return;
      game.multiPointers[side]=e.pointerId;
      try{canvas.setPointerCapture(e.pointerId)}catch(_){}
      if(bothPresent()){
        game.multiHadBoth=true;
        if(game.state==='paused'&&game.pauseReason==='touch')setPaused(false);
      }else if(game.state==='playing'&&game.multiHadBoth){setPaused(true,'touch')}
      if(side==='top')game.aiX=pointerPosition(e);else game.playerX=pointerPosition(e);
      return;
    }
    if(game.activePointerId!==null)return;
    game.activePointerId=e.pointerId;game.pointerDown=true;
    try{canvas.setPointerCapture(e.pointerId)}catch(_){}
    if(game.pauseReason==='touch')setPaused(false);
    move(e);
  });
  canvas.addEventListener('pointermove',e=>{
    if(game.mode==='online' && game.state==='online'){if(game.activePointerId===e.pointerId)window.NeonRallyOnline?.sendX(pointerPosition(e));return}
    if(game.mode==='versus'){
      if(game.multiPointers.top===e.pointerId||game.multiPointers.bottom===e.pointerId)move(e);
    }else if(game.activePointerId===e.pointerId&&game.pointerDown)move(e);
  });
  function releasePointer(e){
    if(game.mode==='online'){if(game.activePointerId===e.pointerId)game.activePointerId=null;return}
    if(game.mode==='versus'){
      let changed=false;
      for(const side of ['top','bottom'])if(game.multiPointers[side]===e.pointerId){game.multiPointers[side]=null;changed=true}
      if(changed&&game.multiHadBoth&&game.state==='playing')setPaused(true,'touch');
      return;
    }
    if(e.pointerId!==game.activePointerId)return;
    game.pointerDown=false;game.activePointerId=null;
    if(e.pointerType==='touch'||e.pointerType==='pen')setPaused(true,'touch');
  }
  canvas.addEventListener('pointerup',releasePointer);
  canvas.addEventListener('pointercancel',releasePointer);
  canvas.addEventListener('lostpointercapture',releasePointer);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key.toLowerCase()==='p'){e.preventDefault();if(game.state==='playing')setPaused(true);else if(game.state==='paused')setPaused(false)}if(game.state==='playing'){if(game.mode==='versus'){if(e.key.toLowerCase()==='j'){game.aiX=clamp(game.aiX-34,PADW/2+16,W-PADW/2-16);e.preventDefault()}if(e.key.toLowerCase()==='l'){game.aiX=clamp(game.aiX+34,PADW/2+16,W-PADW/2-16);e.preventDefault()}}if(['ArrowLeft','a','A'].includes(e.key)){game.playerX=clamp(game.playerX-34,PADW/2+16,W-PADW/2-16);e.preventDefault()}if(['ArrowRight','d','D'].includes(e.key)){game.playerX=clamp(game.playerX+34,PADW/2+16,W-PADW/2-16);e.preventDefault()}}});
  document.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>selectDifficulty(b.dataset.difficulty));selectDifficulty(game.difficulty);renderStats();$('sound').textContent=game.sound?'♫':'♪̸';
  document.querySelectorAll('[data-challenge]').forEach(button=>button.addEventListener('click',()=>{
    game.arcadeChallenge=button.dataset.challenge;
    document.querySelectorAll('[data-challenge]').forEach(b=>b.classList.toggle('active',b===button));
    showToast('ARCADE: '+arcade.config(game.arcadeChallenge).name.toUpperCase());
  }));
  $('classic-mode').onclick=()=>chooseMode('classic');$('arcade-mode').onclick=()=>chooseMode('arcade');$('versus-mode').onclick=()=>chooseMode('versus');
  $('home').onclick=goHome;
  $('overlay-home').onclick=goHome;
  $('main-action').onclick=()=>{if(game.state==='paused'){setPaused(false);return}startGame()};
  $('pause').onclick=()=>{if(game.mode==='online')return;if(game.state==='playing')setPaused(true);else if(game.state==='paused')setPaused(false)};
  $('sound').onclick=()=>{game.sound=!game.sound;$('sound').textContent=game.sound?'♫':'♪̸';$('sound').setAttribute('aria-label',game.sound?'Slå lyd fra':'Slå lyd til');saveSettings();tone(520,.1)};
  $('boost').onclick=()=>{if(game.mode!=='arcade'||game.state!=='playing'||game.boost<=0||game.boostReady)return;game.boost--;game.boostReady=true;showToast('TURBO AKTIVERET');tone(700,.1);updateUI()};
  $('shield').onclick=()=>{if(game.mode!=='arcade'||game.state!=='playing'||game.shield<=0||game.shieldReady)return;game.shield--;game.shieldReady=true;showToast('SKJOLD AKTIVERET');tone(600,.12);updateUI()};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.state==='playing')setPaused(true)});
  window.NeonRallyBridge={
    openLobby(){if(game.mode==='online'&&game.state==='online')return;game.state='menu';game.mode='classic';$('online-lobby').classList.remove('hidden');document.querySelector('.game-shell').hidden=true;updateUI()},
    closeLobby(){ $('online-lobby').classList.add('hidden');document.querySelector('.game-shell').hidden=false;goHome()},
    startOnline(m){ $('online-lobby').classList.add('hidden');document.querySelector('.game-shell').hidden=false;game.mode='online';game.state='online';game.activePointerId=null;game.trail=[];game.scoreAI=0;game.scorePlayer=0;game.aiX=W/2;game.playerX=W/2;game.onlineSide=window.NeonRallyOnline?.side;hideOverlay();hideTouchPause();updateUI();showToast('ONLINE KAMP STARTER!')},
    snapshot(m){if(game.mode!=='online'||game.state!=='online')return;const s=window.NeonRallyOnline?.side;if(!s)return;const bx=game.ball.x,by=game.ball.y;game.aiX=s==='top'?m.bottomX:m.topX;game.playerX=s==='top'?m.topX:m.bottomX;game.scoreAI=s==='top'?m.bottomScore:m.topScore;game.scorePlayer=s==='top'?m.topScore:m.bottomScore;game.ball={x:m.ball.x,y:s==='top'?H-m.ball.y:m.ball.y,vx:0,vy:0};if(Math.hypot(bx-game.ball.x,by-game.ball.y)<85){game.trail.push({x:game.ball.x,y:game.ball.y,life:.36});if(game.trail.length>16)game.trail.shift()}else game.trail=[];for(const t of game.trail)t.life-=.05;game.trail=game.trail.filter(t=>t.life>0);$('top-label').textContent='MODSTANDER';$('bottom-label').textContent='DIG';$('ai-score').textContent=game.scoreAI;$('player-score').textContent=game.scorePlayer;$('state-tag').textContent=m.readyMs>0?'KLAR?':'LIVE · FØRST TIL 7'},
    finishOnline(m){if(game.mode!=='online')return;const isTop=window.NeonRallyOnline?.side==='top';game.scorePlayer=isTop?m.topScore:m.bottomScore;game.scoreAI=isTop?m.bottomScore:m.topScore;game.state='online-finished';const win=m.winnerId===window.NeonRallyOnline?.player?.id;overlay('ONLINE KAMP SLUT',win?'DU <em>VANDT!</em>':'DU <em>TABTE</em>',`Resultat ${game.scorePlayer} – ${game.scoreAI}`,'TIL FORSIDE','Se Top 10 og find nye modstandere.',false);$('main-action').onclick=()=>{game.mode='classic';game.state='menu';window.NeonRallyBridge.openLobby();window.NeonRallyOnline?.open()};updateUI()}
  };
  game.state='menu';chooseMode('classic');updateUI();requestAnimationFrame(frame);
})();
