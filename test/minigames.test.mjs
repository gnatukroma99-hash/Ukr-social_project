import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { catalog } from '../app/catalog.mjs';
import { dropWords, ladderWords } from '../app/minigame-data.mjs';
import {
  ALPHABET, DROP_WORDS, DROP_LIVES, FRAME_ROUNDS, FRAME_TILES,
  newDropGame, dropTurn, dropDuration, catchLetter,
  newFrameGame, frameValue, uncoverFrame, guessFrame, nextFrame,
  ladderPuzzles, newLadderGame, selectLadderSlot, changeLadderLetter, undoLadder, hintLadder, ladderPath,
} from '../app/minigames.mjs';

function randomFor(seed) {
  return ()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/2**32);
}

test('Буквопад gives five different words with one correct letter per drop',()=>{
  assert.equal(new Set(dropWords.map(([word])=>word)).size,dropWords.length);
  for(const [word,clue,art] of dropWords){
    assert.ok([...word].every(ch=>ALPHABET.includes(ch)));
    assert.ok(clue && !clue.toLocaleUpperCase('uk').split(/[^А-ЯІЇЄҐ]+/u).includes(word));
    if(art) assert.ok(existsSync(new URL(`../app/assets/ink/${art}.png`,import.meta.url)));
  }
  const random=randomFor(49);
  let g=newDropGame(random);
  assert.equal(new Set(g.words.map(([word])=>word)).size,DROP_WORDS);
  let fastest=dropDuration(g);
  while(!g.over){
    assert.equal(g.letters.length,3);
    assert.equal(new Set(g.letters).size,3);
    assert.ok(g.letters.includes(dropTurn(g).letter));
    assert.ok(dropDuration(g)<=fastest && dropDuration(g)>0);
    fastest=dropDuration(g);
    g=catchLetter(g,g.letters.indexOf(dropTurn(g).letter),random);
  }
  assert.equal(g.solved,DROP_WORDS);
  assert.equal(g.lives,DROP_LIVES);
  assert.strictEqual(catchLetter(g,0,random),g);
});

test('a wrong letter or a timeout costs a life without skipping its position',()=>{
  const random=randomFor(32);
  let g=newDropGame(random);
  g=catchLetter(g,g.letters.indexOf(dropTurn(g).letter),random);
  const current=dropTurn(g), position=g.position;
  const wrong=g.letters.findIndex(ch=>ch!==current.letter);
  g=catchLetter(g,wrong,random);
  assert.equal(g.lives,2);
  assert.equal(g.position,position);
  assert.deepEqual(dropTurn(g),current);
  g=catchLetter(catchLetter(g,null,random),null,random);
  assert.ok(g.over);
  assert.equal(g.lives,0);
  assert.match(g.notice,new RegExp(current.word));
});

test('Відкрий кадр draws distinct catalog covers with local art and same-category choices',()=>{
  const appeared=new Set();
  for(let seed=0;seed<150;seed++){
    const g=newFrameGame(randomFor(Math.imul(seed,0x9e3779b9)>>>0));
    assert.equal(new Set(g.deck.map(({pair})=>pair.category)).size,FRAME_ROUNDS);
    for(const {pair,choices} of g.deck){
      appeared.add(pair.id);
      assert.ok(choices.includes(pair));
      assert.equal(new Set(choices.map(p=>p.preview.title)).size,3);
      assert.ok(choices.every(p=>p.category===pair.category && existsSync(new URL(`../app/assets/covers/${p.preview.cover}`,import.meta.url))));
    }
  }
  assert.equal(appeared.size,catalog.length);
});

test('frame scoring rewards fewer tiles and accepts one guess per frame',()=>{
  let g=newFrameGame(randomFor(892));
  assert.strictEqual(nextFrame(g),g);
  assert.deepEqual(g.open,[4]);
  assert.equal(frameValue(g),FRAME_TILES);
  g=uncoverFrame(g,0);
  g=uncoverFrame(g,5);
  assert.equal(frameValue(g),7);
  assert.strictEqual(uncoverFrame(g,0),g);
  assert.strictEqual(uncoverFrame(g,9),g);
  while(!g.over){
    const {pair, choices}=g.deck[g.round];
    if(g.round===2) for(let i=0;i<FRAME_TILES;i++)g=uncoverFrame(g,i);
    g=guessFrame(g,g.round===1?choices.findIndex(p=>p!==pair):choices.indexOf(pair));
    assert.strictEqual(guessFrame(g,choices.indexOf(pair)),g);
    assert.strictEqual(uncoverFrame(g,8),g);
    g=nextFrame(g);
  }
  assert.deepEqual(g.answers.map(a=>a.points),[7,0,1,9,9]);
  assert.equal(g.score,26);
});

test('all ladder puzzles are reachable by real words and every hint gives a legal step',()=>{
  const dictionary=new Set(ladderWords);
  const changeIndex=(a,b)=>[...a].map((ch,i)=>ch===b[i]?-1:i).filter(i=>i>=0);
  assert.equal(new Set(ladderPuzzles.map(p=>p.id)).size,ladderPuzzles.length);
  for(const puzzle of ladderPuzzles){
    assert.equal(puzzle.start.length,puzzle.target.length);
    assert.ok(puzzle.min>=2);
    let g=newLadderGame(puzzle);
    for(let i=0;i<puzzle.min;i++){
      const word=g.path.at(-1), next=ladderPath(word,puzzle.target,g.path.slice(0,-1))[1];
      const cols=changeIndex(word,next);
      assert.equal(cols.length,1);
      assert.ok(dictionary.has(next));
      g=hintLadder(g);
      assert.equal(g.slot,cols[0]);
      g=changeLadderLetter(g,next[g.slot]);
    }
    assert.equal(g.path.at(-1),puzzle.target);
    assert.ok(g.over);
    assert.strictEqual(undoLadder(g),g);
  }
});

test('a letter swap keeps the chain on rejected words and undo removes one step',()=>{
  let g=newLadderGame(ladderPuzzles[0]);
  assert.strictEqual(changeLadderLetter(g,'K'),g);
  g=changeLadderLetter(g,'Ї');
  assert.match(g.notice,/немає у словнику/);
  assert.deepEqual(g.path,['кіт']);
  g=changeLadderLetter(selectLadderSlot(g,1),'И');
  assert.deepEqual(g.path,['кіт','кит']);
  g=changeLadderLetter(g,'І');
  assert.match(g.notice,/вже в ланцюжку/);
  assert.deepEqual(undoLadder(g).path,['кіт']);
});
