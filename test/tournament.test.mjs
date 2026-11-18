import test from 'node:test';
import assert from 'node:assert/strict';
import {makeService} from '../server/service.mjs';
import {deckFor,dayAt} from '../app/engine.mjs';
test('verified player keeps one score across devices; final is locked at Kyiv midnight',async t=>{
  const end='2026-11-25T00:00:00+02:00';let time=Date.parse(end)-60000;
  const svc=makeService({now:()=>time,tournament:{start:'2026-11-18T00:00:00+02:00',end,auth:{exchange:async()=> 'test-user'}}});
  await new Promise(r=>svc.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{svc.close(r);svc.closeAllConnections();}));
  const call=async(path,body,token,method)=>{let res=await fetch(`http://127.0.0.1:${svc.address().port}/api/${path}`,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body&&JSON.stringify(body)});return [res.status,await res.json()];};
  assert.equal((await call('players',{name:'Tester'}))[0],401);
  const login=()=>call('auth/google/verify',{code:'a'.repeat(32),verifier:'b'.repeat(43),name:'Tester'});const [,a]=await login(),[,b]=await login();assert.equal(a.state.player.id,b.state.player.id);
  const day=dayAt(time),q=deckFor(day)[0];await call('start',{day},a.token);await call('answer',{day,id:q.id,choice:q.correct},a.token);
  assert.equal((await call('tournament',null,b.token))[1].mine.points,20);
  await call('start',{day},a.token);time=Date.parse(end);assert.equal((await call('start',{day:dayAt(time)},a.token))[0],409);
  const final=(await call('tournament',null,b.token))[1];assert.equal(final.closed,true);assert.equal(final.total,1);
  await call('me',{name:'New name'},b.token,'PATCH');assert.deepEqual((await call('tournament',null,b.token))[1],final);
});
