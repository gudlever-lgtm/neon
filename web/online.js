(() => {
'use strict';
const $=id=>document.getElementById(id);
const apiBase=(window.NEON_API_BASE||'').replace(/\/$/,'');
const wsBase=apiBase?apiBase.replace(/^http/,'ws'):(location.protocol==='https:'?'wss://':'ws://')+location.host;
const net={profileId:null,refreshBusy:false,token:sessionStorage.getItem('neon-token')||'',user:null,ws:null,connected:false,matchId:null,side:null,matchActive:false,retry:null,retries:0,offset:0,query:'',searchTimer:null,lastSnapshot:0,snapshotInterval:50,lastSent:0,pendingX:null,inputTimer:null};
const now=()=>performance.now();
function quality(state){window.NeonRallyBridge?.connection(state)}
function message(text,bad=false){const el=$('online-message');el.textContent=text;el.classList.toggle('error',bad)}
async function api(path,method='GET',body){const headers={'Accept':'application/json'};if(body)headers['Content-Type']='application/json';if(net.token)headers['Authorization']='Bearer '+net.token;const r=await fetch(apiBase+'/api'+path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=r.status===204?{}:await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||`API-fejl ${r.status}`);return data}
function item(parent,title,info,actions){const row=document.createElement('div');row.className='online-row';const detail=document.createElement('div');const name=document.createElement('strong');name.textContent=title;const sub=document.createElement('small');sub.textContent=info;detail.append(name,sub);row.append(detail);for(const a of actions||[]){const b=document.createElement('button');b.type='button';b.className='mini-neon';b.textContent=a.label;b.addEventListener('click',async()=>{b.disabled=true;try{await a.onClick();message(a.done||'Udført');await refresh()}catch(e){message(e.message,true)}finally{b.disabled=false}});row.append(b)}parent.append(row)}
function showAuth(){ $('profile-panel').classList.add('hidden');$('online-login').classList.remove('hidden');$('online-dashboard').classList.add('hidden');$('online-logout').classList.add('hidden');}
function showDashboard(){ $('online-login').classList.add('hidden');$('online-dashboard').classList.remove('hidden');$('online-logout').classList.remove('hidden');}
async function initAuth(){if(!net.token){showAuth();return}try{net.user=await api('/me');showDashboard();connect();await refresh()}catch(e){sessionStorage.removeItem('neon-token');net.token='';showAuth();message('Log ind for at spille online',true)}}
function connect(){if(!net.token||net.ws&&(net.ws.readyState===WebSocket.OPEN||net.ws.readyState===WebSocket.CONNECTING))return;net.connected=false;quality('connecting');const w=new WebSocket(wsBase+'/ws');net.ws=w;w.onopen=()=>{w.send(JSON.stringify({type:'auth',token:net.token}))};w.onmessage=async event=>{let m;try{m=JSON.parse(event.data)}catch{return}
 if(m.type==='authenticated'){net.connected=true;net.retries=0;net.lastSnapshot=0;net.snapshotInterval=50;message('Forbundet til multiplayer-serveren');quality('good');return}
 if(m.type==='invitation_received'){message('Ny invitation fra '+m.from);await refresh();return}
 if(m.type==='match_started'){const same=net.matchActive&&net.matchId===m.matchId;net.matchId=m.matchId;net.side=net.user.id===m.topId?'top':'bottom';net.matchActive=true;if(!same){net.lastSnapshot=0;net.snapshotInterval=50;window.NeonRallyBridge?.startOnline(m)}message(same?'Tilbage i kampen':'Kamp startet');return}
 if(m.type==='game_state'&&net.matchActive&&m.matchId===net.matchId){const time=now();if(net.lastSnapshot)net.snapshotInterval=net.snapshotInterval*.75+(time-net.lastSnapshot)*.25;net.lastSnapshot=time;window.NeonRallyBridge?.snapshot(m)}
 if(m.type==='match_finished'&&m.matchId===net.matchId){net.matchActive=false;quality('hidden');window.NeonRallyBridge?.finishOnline(m);await refresh()}
 if(m.type==='server_error')message(m.message,true);
 };w.onclose=()=>{if(net.ws!==w||!net.token)return;net.connected=false;quality('lost');message('Forbindelsen blev afbrudt. Forsøger igen …',true);net.ws=null;clearTimeout(net.retry);net.retry=setTimeout(connect,Math.min(10000,1000*2**Math.min(4,net.retries++)))};w.onerror=()=>{};
}
function flushX(){net.inputTimer=null;if(net.pendingX===null||!net.matchActive||!net.matchId||net.ws?.readyState!==WebSocket.OPEN)return;net.ws.send(JSON.stringify({type:'paddle',matchId:net.matchId,x:net.pendingX}));net.pendingX=null;net.lastSent=now()}
function sendX(x){if(!Number.isFinite(x))return;net.pendingX=x;if(!net.matchActive||net.ws?.readyState!==WebSocket.OPEN)return;if(now()-net.lastSent>=32){clearTimeout(net.inputTimer);flushX()}else if(!net.inputTimer)net.inputTimer=setTimeout(flushX,32-(now()-net.lastSent))}
async function showProfile(id){
 const data=await api('/players/'+id+'/profile');
 net.profileId=id;
 const area=$('profile-detail');area.replaceChildren();
 const p=data.player,h=data.headToHead;
 item(area,p.username,`${p.points} point · ${p.wins} sejre · ${p.losses} nederlag · ${p.online?'Online':'Offline'}`,[]);
 item(area,'Indbyrdes kampe',`${h.played} kampe · ${h.wins} sejre · ${h.losses} nederlag`,[]);
 $('profile-panel').classList.remove('hidden');
}
async function history(){
 const data=await api('/matches/history?limit=15');
 const area=$('match-history');area.replaceChildren();
 for(const match of data.matches){
   item(area,(match.outcome==='win'?'✓ SEJR':'✕ NEDERLAG')+' mod '+match.opponent,
     match.myScore+' – '+match.theirScore+' · '+(match.finishedAt||''),
     [{label:'PROFIL',onClick:()=>showProfile(match.opponentId)}]);
 }
 if(!data.matches.length)area.textContent='Ingen afsluttede onlinekampe endnu';
}
async function players(reset=true){if(reset)net.offset=0;const q=$('player-search').value.trim();net.query=q;const url='/players?limit=25&offset='+net.offset+'&q='+encodeURIComponent(q);const data=await api(url);const area=$('player-list');if(reset)area.replaceChildren();for(const p of data.players)item(area,p.username,p.online?'● Online':'○ Offline',[{label:'✉ INVITER',onClick:()=>api('/invitations','POST',{recipientId:p.id}),done:'Invitation sendt til '+p.username},{label:'PROFIL',onClick:()=>showProfile(p.id)}]);if(!data.players.length&&reset)area.textContent='Ingen spillere fundet';$('players-more').disabled=!data.hasMore;net.offset+=data.players.length}
async function invitations(){const data=await api('/invitations');const area=$('invite-list');area.replaceChildren();const pending=data.invitations.filter(i=>i.status==='pending');for(const i of pending){const incoming=i.recipient_id===net.user.id;item(area,incoming?i.sender_name:i.recipient_name,incoming?'Har inviteret dig':'Afventer svar',incoming?[{label:'✓ ACCEPTÉR',onClick:()=>api(`/invitations/${i.id}/accept`,'POST')},{label:'✕ AFVIS',onClick:()=>api(`/invitations/${i.id}/decline`,'POST')}]:[{label:'ANNULLER',onClick:()=>api(`/invitations/${i.id}/cancel`,'POST')}])}if(!pending.length)area.textContent='Ingen åbne invitationer'}
async function leaderboard(){const {top}=await api('/leaderboard');const area=$('rank-list');area.replaceChildren();top.forEach((p,i)=>item(area,`${i+1}. ${p.username}`,`${p.points} point · ${p.wins} sejre · ${p.losses} nederlag`,[{label:'PROFIL',onClick:()=>showProfile(p.userId)}]));if(!top.length)area.textContent='Ranglisten er tom. Vind den første onlinekamp!'}
async function refresh(){if(!net.user)return;const jobs=await Promise.allSettled([players(),invitations(),leaderboard(),api('/me'),history()]);if(jobs[3].status==='fulfilled'){net.user=jobs[3].value;$('my-player').textContent=net.user.username+' · '+(net.user.stats?.points||1000)+' point · '+(net.user.stats?.wins||0)+' sejre'}const bad=jobs.find(r=>r.status==='rejected');if(bad)message(bad.reason?.message||'Kunne ikke hente data',true)}
$('online-entry').addEventListener('click',()=>{window.NeonRallyBridge?.openLobby();initAuth()});$('online-back').addEventListener('click',()=>window.NeonRallyBridge?.closeLobby());
$('online-login').addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(e.currentTarget);const register=$('create-account').checked;try{const r=await api('/auth/'+(register?'register':'login'),'POST',{username:data.get('username'),password:data.get('password')});net.token=r.token;sessionStorage.setItem('neon-token',net.token);net.user=r.user;$('login-password').value='';showDashboard();connect();await refresh();message(register?'Konto oprettet':'Logget ind')}catch(e){message(e.message,true)}});
$('online-logout').addEventListener('click',async()=>{try{await api('/auth/logout','POST')}catch{}net.token='';net.user=null;net.connected=false;net.matchActive=false;net.pendingX=null;clearTimeout(net.inputTimer);clearTimeout(net.retry);quality('hidden');sessionStorage.removeItem('neon-token');net.ws?.close();net.ws=null;showAuth();message('Logget ud')});
$('profile-close').addEventListener('click',()=>{net.profileId=null;$('profile-panel').classList.add('hidden')});
$('player-search').addEventListener('input',()=>{clearTimeout(net.searchTimer);net.searchTimer=setTimeout(()=>players().catch(e=>message(e.message,true)),250)});$('players-more').addEventListener('click',()=>players(false).catch(e=>message(e.message,true)));$('online-refresh').addEventListener('click',()=>refresh());
window.NeonRallyOnline={sendX,async forfeit(){if(!net.matchId)return;await api('/matches/'+net.matchId+'/forfeit','POST');net.matchActive=false},open(){initAuth()},get side(){return net.side},get player(){return net.user},get matchId(){return net.matchId}};
setInterval(()=>{if(!net.matchActive||document.hidden)return;quality(window.NeonMobile?.quality(net.lastSnapshot?now()-net.lastSnapshot:Infinity,net.snapshotInterval,net.connected&&net.ws?.readyState===WebSocket.OPEN)||'connecting')},350);
setInterval(async()=>{if(document.hidden||!net.user||net.refreshBusy||$('online-lobby').classList.contains('hidden'))return;
 net.refreshBusy=true;try{await refresh()}catch(e){message(e.message,true)}finally{net.refreshBusy=false}
},12000);
})();
