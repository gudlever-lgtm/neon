const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../server/src/index.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../web/online.js'),'utf8');

test('history and player profile API routes require a session',()=>{
 assert.match(source,/app\.get\('\/api\/players\/:id\/profile',requireAuth/);
 assert.match(source,/app\.get\('\/api\/matches\/history',requireAuth/);
});
test('history route is registered before generic match lookup',()=>{
 assert.ok(source.indexOf("app.get('/api/matches/history'")<source.indexOf("app.get('/api/matches/:id'"));
});
test('history is scoped to the authenticated participant',()=>{
 assert.match(source,/m\.player_top_id=\? OR m\.player_bottom_id=\?/);
 assert.match(source,/\[req\.user\.id,req\.user\.id,raw\]/);
});
test('match statistics are derived server side, not submitted by the player',()=>{
 assert.match(source,/FROM matches m JOIN users t/);
 assert.match(source,/SELECT user_id,username,wins,losses,points FROM leaderboard/);
 assert.match(ui,/\/matches\/history\?limit=15/);
});
