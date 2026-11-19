import test from 'node:test';
import assert from 'node:assert/strict';
import {newWordGame,typeWord,eraseWord,submitWord,marksFor,keyMarks,guessPool,snapshotWord} from '../app/word-game.mjs';
import {knownWord} from '../app/lexicon.mjs';
import {LEVELS} from '../app/arcade-levels.mjs';

const row=(g,word)=>submitWord([...word].reduce(typeWord,g));
test('reserve exact matches before coloring repeated letters, and never downgrade a key',()=>{
  const marks=marksFor('маска','корма');assert.deepEqual(marks,['present','absent','absent','present','exact']);
  assert.deepEqual(marksFor('касса','маска'),['present','exact','exact','absent','exact']);
  const keys=keyMarks([{word:'маска',marks},{word:'арена',marks:['absent','present','absent','absent','exact']}]);
  assert.equal(keys.а,'exact');assert.equal(keys.м,'present');assert.equal(keys.с,'absent');
});
test('a bad, incomplete or duplicate guess costs no attempts; a saved draft resumes',()=>{
  let g=newWordGame('normal',[],{target:'казка',guesses:[],draft:''});
  assert.strictEqual(typeWord(g,'Q'),g);
  g=typeWord(g,'ї');assert.equal(submitWord(g).rows.length,0);
  assert.equal(row(eraseWord(g),'ґґґґґ').rows.length,0);
  g=row(eraseWord(g),'вішка');assert.equal(g.rows.length,1);
  assert.equal(row(g,'вішка').rows.length,1);
  g=typeWord(g,'к');const restored=newWordGame('normal',g.seen,JSON.parse(JSON.stringify(snapshotWord(g))));
  assert.equal(restored.target,g.target);assert.equal(restored.draft,'к');assert.deepEqual(restored.rows,g.rows);
  g=row(eraseWord(restored),'казка');assert.ok(g.over&&g.won);assert.equal(g.rows.length,2);assert.equal(snapshotWord(g),null);
  assert.strictEqual(submitWord(g),g);
});
test('each level has playable distinct targets, reveals the answer on exhaustion, and rotates without early repeats',()=>{
  for(const [level,{word:{size,tries}}] of Object.entries(LEVELS)){
    const pool=guessPool(level);assert.ok(pool.length>=100&&pool.every(w=>w.length===size&&knownWord(w)));
    let seen=[];
    for(let i=0;i<pool.length;i++){
      const g=newWordGame(level,seen,null,()=>0);assert.ok(!seen.includes(g.target));seen=g.seen;
    }
    let g=newWordGame(level,seen,{target:'__proto__',guesses:null},()=>0);
    assert.equal(g.seen.length,1);assert.ok(!seen.slice(-5).includes(g.target));
    for(const w of pool.filter(w=>w!==g.target).slice(0,tries))g=row(g,w);
    assert.ok(g.over&&!g.won);assert.equal(g.rows.length,tries);assert.ok(pool.includes(g.target));
    assert.strictEqual(typeWord(g,'А'),g);
  }
});
