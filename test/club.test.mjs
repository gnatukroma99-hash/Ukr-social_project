import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeService } from '../server/service.mjs';
import { dayAt, deckFor, shiftDay } from '../app/engine.mjs';

async function open(clock, database) {
  const server=makeService({ now:()=>clock.time, database });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const call=async(path,token,body,method=body?'POST':'GET')=>{
    const res=await fetch(`${base}/api/${path}`,{ method,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined });
    return {status:res.status,data:await res.json()};
  };
  const player=async name=>{const r=await call('players','',{ name });assert.equal(r.status,201);return r.data.token;};
  const close=()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  return {server,call,player,close};
}

test('Kyiv midnight, not device timezone, defines the five tasks',()=>{
  assert.equal(dayAt(Date.parse('2026-07-01T20:59:59Z')),'2026-07-01');
  assert.equal(dayAt(Date.parse('2026-07-01T21:00:00Z')),'2026-07-02');
  assert.equal(dayAt(Date.parse('2026-01-01T22:00:00Z')),'2026-01-02');
  for(let i=0;i<32;i++){
    const day=shiftDay('2026-01-01',i), deck=deckFor(day);
    assert.equal(deck.length,5);assert.equal(new Set(deck.map(q=>q.id)).size,5);
    for(const q of deck){assert.equal(new Set(q.choices).size,4);assert.ok(q.choices.includes(q.correct));}
  }
});

test('two devices, retries, timer, daily cap, streaks, month close and persistence',async t=>{
  const folder=await mkdtemp(join(tmpdir(),'svoie-test-')), database=join(folder,'club.sqlite');
  const clock={time:Date.parse('2026-07-30T12:00:00Z')};let club=await open(clock,database);
  t.after(async()=>{await club.close();await rm(folder,{recursive:true,force:true});});
  const token=await club.player('Мандрівник');let total=0;
  for(let d=0;d<2;d++){
    const day=dayAt(clock.time), deck=deckFor(day);
    for(const [slot,q] of deck.entries()){
      const before=await club.call('answer',token,{day,id:q.id,choice:q.correct});assert.equal(before.status,409);
      const first=await club.call('start',token,{day});assert.equal(first.data.slot,slot);assert.ok(!('correct' in first.data.question));
      clock.time+=10000;await club.call('start',token,{day}); // Re-opening does not restart the bonus timer.
      const [a,b]=await Promise.all([1,2].map(()=>club.call('answer',token,{day,id:q.id,choice:q.correct,points:9999})));
      assert.equal(a.status,200);assert.equal(b.status,200);assert.deepEqual(a.data.answer,b.data.answer);
      const points=20+(q.kind==='riddle'?3:0)+(slot===4?(d+1)*5:0);
      assert.equal(a.data.answer.points,points);assert.equal(a.data.state.done.length,slot+1);total+=points;
    }
    assert.equal((await club.call('start',token,{day})).status,409);
    assert.equal((await club.call('me',token)).data.streak,d+1);
    clock.time+=86400000;
  }
  assert.equal((await club.call('start',token,{day:'2026-07-31'})).status,409);
  await club.close();club=await open(clock,database);
  const me=(await club.call('me',token)).data;assert.equal(me.done.length,0);assert.equal(me.streak,2);assert.equal(me.monthly,0);assert.equal(me.awards[0].points,total);
  await club.call('me',token,{name:'Нове ім’я'},'PATCH');
  const board=(await club.call('leaderboard?month=2026-07',token)).data;assert.ok(board.closed);assert.equal(board.rows[0].name,'Мандрівник');assert.equal(board.mine.rank,1);
});

test('monthly snapshot awards exactly the top 100, and only reviewed suggestions enter the catalog',async t=>{
  const clock={time:Date.parse('2026-08-30T12:00:00Z')},club=await open(clock);t.after(club.close);
  const day=dayAt(clock.time),q=deckFor(day)[0],tokens=[];
  for(let i=0;i<101;i++){
    const token=await club.player('Учасник '+i);tokens.push(token);await club.call('start',token,{day});
    await club.call('answer',token,{day,id:q.id,choice:q.correct});clock.time+=1;
  }
  const board=(await club.call('leaderboard',tokens[100])).data;assert.equal(board.rows.length,100);assert.equal(board.total,101);assert.equal(board.mine.rank,101);
  clock.time=Date.parse('2026-09-01T09:00:00Z');
  assert.equal((await club.call('me',tokens[100])).data.awards.length,0);assert.equal((await club.call('me',tokens[99])).data.awards[0].rank,100);
  const note={type:'pair',category:'music',vibe:'ua',from:'Автор А',to:'Автор Б',description:'Споріднене звучання.',url:'https://example.org/artist'};
  assert.equal((await club.call('support','',note)).status,401);
  const r=await club.call('support',tokens[0],note);assert.equal(r.status,201);
  assert.equal((await club.call('catalog')).data.pairs.length,0);assert.equal(club.server.moderation.list()[0].priority,1);
  assert.ok(club.server.moderation.decide(r.data.id,true));assert.equal((await club.call('catalog')).data.pairs[0].to,note.to);
});
