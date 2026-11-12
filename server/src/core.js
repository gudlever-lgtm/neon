import { scrypt as scryptCallback, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const WIDTH=390, HEIGHT=590, PAD_W=92, BALL_R=7, TOP_Y=40, BOTTOM_Y=548;
export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export const safeId=(s)=>{const n=Number(s);return Number.isSafeInteger(n)&&n>0?n:null};
export const userKey=(v)=>typeof v==='string'?v.trim().toLowerCase():'';
export const validName=(v)=>typeof v==='string'&&/^[A-Za-z0-9_]{3,24}$/.test(v);
export const validPassword=(v)=>typeof v==='string'&&v.length>=10&&v.length<=128;
export const sha256=(value)=>createHash('sha256').update(value).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const digest=await scrypt(password,salt,64);return `scrypt$${salt}$${digest.toString('hex')}`}
export async function verifyPassword(password,stored){if(typeof stored!=='string')return false;const parts=stored.split('$');if(parts.length!==3||parts[0]!=='scrypt'||!/^[a-f0-9]{32}$/.test(parts[1])||!/^[a-f0-9]{128}$/.test(parts[2]))return false;const actual=await scrypt(password,parts[1],64);return timingSafeEqual(actual,Buffer.from(parts[2],'hex'))}
export function newGame(topId,bottomId,matchId){return {id:matchId,topId,bottomId,status:'active',topX:195,bottomX:195,topScore:0,bottomScore:0,ball:{x:195,y:295,vx:90,vy:(Math.random()<.5?1:-1)*270},readyAt:Date.now()+1500,finished:false,disconnects:new Map(),lastInput:new Map()}}
export function resetBall(g,sign){g.ball={x:195,y:295,vx:(Math.random()>.5?1:-1)*95,vy:sign*270};g.readyAt=Date.now()+900}
export function movePaddle(g,uid,x){const side=uid===g.topId?'top':uid===g.bottomId?'bottom':null;if(!side||!Number.isFinite(x))return false;g[side+'X']=clamp(x,PAD_W/2+16,WIDTH-PAD_W/2-16);return true}
export function tick(g,dt,now=Date.now()){
 if(g.status!=='active'||now<g.readyAt)return null;
 const b=g.ball,steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/6)),step=dt/steps;
 for(let i=0;i<steps;i++){
  const before=b.y;b.x+=b.vx*step;b.y+=b.vy*step;
  if(b.x<BALL_R+9&&b.vx<0){b.x=BALL_R+9;b.vx=Math.abs(b.vx)}
  if(b.x>WIDTH-BALL_R-9&&b.vx>0){b.x=WIDTH-BALL_R-9;b.vx=-Math.abs(b.vx)}
  const topPlane=TOP_Y+6,bottomPlane=BOTTOM_Y-6;
  if(b.vy<0&&before-BALL_R>=topPlane&&b.y-BALL_R<=topPlane&&Math.abs(b.x-g.topX)<PAD_W/2+BALL_R){b.y=topPlane+BALL_R;bounce(b,g.topX,1)}
  if(b.vy>0&&before+BALL_R<=bottomPlane&&b.y+BALL_R>=bottomPlane&&Math.abs(b.x-g.bottomX)<PAD_W/2+BALL_R){b.y=bottomPlane-BALL_R;bounce(b,g.bottomX,-1)}
  if(b.y < -16){g.bottomScore++;if(g.bottomScore>=7){g.status='finished';return {winnerId:g.bottomId,reason:'score'}}resetBall(g,1);return {point:'bottom'} }
  if(b.y > HEIGHT+16){g.topScore++;if(g.topScore>=7){g.status='finished';return {winnerId:g.topId,reason:'score'}}resetBall(g,-1);return {point:'top'} }
 }
 return null;
}
function bounce(b,x,direction){const speed=clamp(Math.hypot(b.vx,b.vy)*1.035,280,640),angle=clamp((b.x-x)/(PAD_W/2),-1,1)*1.05;b.vx=Math.sin(angle)*speed;b.vy=direction*Math.cos(angle)*speed;if(Math.abs(b.vx)<30)b.vx=b.vx<0?-30:30}
export function snapshot(g){return {type:'game_state',matchId:g.id,topId:g.topId,bottomId:g.bottomId,topX:g.topX,bottomX:g.bottomX,topScore:g.topScore,bottomScore:g.bottomScore,ball:{x:g.ball.x,y:g.ball.y},status:g.status,readyMs:Math.max(0,g.readyAt-Date.now())}}
