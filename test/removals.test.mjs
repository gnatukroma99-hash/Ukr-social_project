import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../server/service.mjs';
import {competition} from '../server/tournament.mjs';
import {removals} from '../server/removals.mjs';

test('a public deletion request cannot erase anyone; confirmed removal clears only that player',()=>{
  const db=openStore(':memory:');try{
    const cup=competition(db,{start:'2026-01-01T00:00:00Z',end:'2026-02-01T00:00:00Z'},()=>1);
    const a=cup.login('sub-a','Same nickname'),b=cup.login('sub-b','Same nickname');
    const q=removals(db);q.request('test@example.invalid',1);q.request('test@example.invalid',2);
    assert.equal(q.list().length,1);assert.equal(cup.identify(a.token).id,a.player.id);
    db.prepare('INSERT INTO finals VALUES (?,?)').run('finished',JSON.stringify([a.player,b.player]));
    q.finish(q.list()[0].id,'sub-a');assert.ok(!cup.identify(a.token));assert.equal(cup.identify(b.token).id,b.player.id);
    assert.equal(q.list().length,0);assert.deepEqual(JSON.parse(db.prepare('SELECT rows FROM finals').get().rows),[b.player]);
  }finally{db.close();}
});
