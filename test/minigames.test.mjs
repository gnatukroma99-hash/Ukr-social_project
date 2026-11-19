import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { LEVELS } from '../app/arcade-levels.mjs';
import { dropWords } from '../app/minigame-data.mjs';
import { ladderWords, legacyLadderPairs } from '../app/ladder-data.mjs';
import {
  ALPHABET, DROP_WORDS, FRAME_ROUNDS, dropDecks, newDropGame, dropTurn, dropDuration, catchLetter,
  frameDecks, newFrameGame, frameValue, frameTileCount, frameMax, uncoverFrame, guessFrame, nextFrame,
  ladderDecks, ladderPuzzles, newLadderGame, selectLadderSlot, changeLadderLetter, undoLadder, hintLadder, ladderPath,
} from '../app/minigames.mjs';

const levels=Object.keys(LEVELS);
function randomFor(seed) {
  return ()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/2**32);
}
const hasAsset=src=>existsSync(new URL(src,new URL('../app/',import.meta.url)));

test('136 drop clues include 69 images, spelled with the Ukrainian alphabet',()=>{
  assert.equal(dropWords.length,136);
  assert.equal(dropWords.filter(w=>w[2]).length,69);
  assert.equal(new Set(dropWords.map(([word])=>word)).size,dropWords.length);
  for(const [word,clue,src] of dropWords){
    assert.ok([...word].every(ch=>ALPHABET.includes(ch)));
    assert.ok(clue && !clue.toLocaleUpperCase('uk').split(/[^А-ЯІЇЄҐ]+/u).includes(word));
    if(src) assert.ok(hasAsset(src),src);
    assert.ok(Object.values(dropDecks).some(deck=>deck.some(([w])=>w===word)));
  }
});

test('drop levels change lanes, timing and lives; one right letter appears in every drop',()=>{
  const first=levels.map(level=>newDropGame(level,[],randomFor(29)));
  assert.deepEqual(first.map(g=>g.letters.length),[2,3,4]);
  assert.deepEqual(first.map(g=>g.lives),[5,3,2]);
  assert.ok(dropDuration(first[0])>dropDuration(first[1]) && dropDuration(first[1])>dropDuration(first[2]));
  for(const level of levels){
    const random=randomFor(49);
    let g=newDropGame(level,[],random), last=dropDuration(g);
    while(!g.over){
      assert.equal(g.letters.length,LEVELS[level].letters.lanes);
      assert.equal(new Set(g.letters).size,g.letters.length);
      assert.ok(g.letters.includes(dropTurn(g).letter));
      assert.ok(dropDuration(g)<=last && dropDuration(g)>0);
      last=dropDuration(g);
      g=catchLetter(g,g.letters.indexOf(dropTurn(g).letter),random);
    }
    assert.equal(g.solved,DROP_WORDS);
    assert.equal(new Set(g.words.map(w=>w[0])).size,DROP_WORDS);
    assert.equal(g.lives,LEVELS[level].letters.lives);
    assert.strictEqual(catchLetter(g,0,random),g);
  }
});

test('a wrong letter or timeout costs a life and leaves the same word and position',()=>{
  const random=randomFor(32);
  let g=newDropGame('normal',[],random);
  g=catchLetter(g,g.letters.indexOf(dropTurn(g).letter),random);
  const current=dropTurn(g), position=g.position;
  const wrong=g.letters.findIndex(ch=>ch!==current.letter);
  g=catchLetter(g,wrong,random);
  assert.equal(g.lives,2);
  assert.equal(g.position,position);
  assert.deepEqual(dropTurn(g),current);
  g=catchLetter(catchLetter(g,null,random),null,random);
  assert.equal(g.lives,0);
  assert.ok(g.over);
  assert.match(g.notice,new RegExp(current.word));
});

test('leaving after the first word or frame never skips unseen content',()=>{
  const random=randomFor(48);
  for(const level of levels){
    let seen=[];
    for(let i=0;i<dropDecks[level].length;i++){
      const g=newDropGame(level,JSON.parse(JSON.stringify(seen)),random);
      assert.equal(g.words.length,1);
      assert.ok(!seen.includes(g.words[0][0]));
      seen=g.seen;
    }
    const again=newDropGame(level,seen,random);
    assert.equal(again.seen.length,1);
    assert.ok(!seen.slice(-5).includes(again.words[0][0]));
  }
  for(const [album,deck] of Object.entries(frameDecks)){
    assert.equal(deck.length,48);
    assert.equal(new Set(deck.map(i=>i.src)).size,48);
    assert.ok(deck.every(i=>hasAsset(i.src)));
    let seen=[];
    for(let i=0;i<deck.length;i++){
      const level=levels[i%3], g=newFrameGame(level,album,JSON.parse(JSON.stringify(seen)),random);
      const {item,choices}=g.deck[0];
      assert.equal(g.deck.length,1);
      assert.ok(!seen.includes(item.id));
      assert.equal(choices.length,LEVELS[level].frames.choices);
      assert.equal(new Set(choices.map(o=>o.title)).size,choices.length);
      assert.ok(choices.includes(item)&&choices.every(i=>i.category===item.category));
      assert.ok(album==='catalog'?item.url:!item.url);
      seen=g.seen;
    }
    const again=newFrameGame('normal',album,seen,random);
    assert.equal(again.seen.length,1);
    assert.ok(!seen.slice(-5).includes(again.deck[0].item.id));
  }
});

test('frame scoring reflects grid size, rewards fewer tiles and accepts one guess',()=>{
  assert.deepEqual(levels.map(frameTileCount),[4,9,16]);
  assert.deepEqual(levels.map(frameMax),[15,45,80]);
  for(const level of levels){
    const random=randomFor(892), total=frameTileCount(level);
    let g=newFrameGame(level,'art',[],random);
    assert.strictEqual(nextFrame(g,random),g);
    assert.deepEqual(g.open,LEVELS[level].frames.open);
    const top=frameValue(g);
    const closed=Array.from({length:total},(_,i)=>i).find(i=>!g.open.includes(i));
    g=uncoverFrame(g,closed);
    assert.equal(frameValue(g),top-1);
    assert.strictEqual(uncoverFrame(g,closed),g);
    assert.strictEqual(uncoverFrame(g,total),g);
    while(!g.over){
      const {item,choices}=g.deck[g.round];
      if(g.round===2) for(let i=0;i<total;i++)g=uncoverFrame(g,i);
      g=guessFrame(g,g.round===1?choices.findIndex(p=>p!==item):choices.indexOf(item));
      assert.strictEqual(guessFrame(g,choices.indexOf(item)),g);
      assert.strictEqual(uncoverFrame(g,0),g);
      g=nextFrame(g,random);
    }
    assert.equal(new Set(g.deck.map(({item})=>item.id)).size,FRAME_ROUNDS);
    assert.deepEqual(g.answers.map(a=>a.points),[top-1,0,1,top,top]);
    assert.equal(g.score,3*top);
  }
});

test('all 106 ladders have valid answers and hints for their difficulty',()=>{
  const dictionary=new Set(ladderWords);
  assert.equal(ladderPuzzles.length,106);
  assert.equal(new Set(ladderPuzzles.map(p=>p.id)).size,ladderPuzzles.length);
  assert.deepEqual(ladderDecks.normal.slice(0,14).map(p=>[p.start,p.target]),legacyLadderPairs);
  for(const puzzle of ladderPuzzles){
    const {start,target,min,level}=puzzle;
    assert.ok(dictionary.has(start)&&dictionary.has(target));
    assert.equal(start.length,target.length);
    assert.ok(min>=2,puzzle.id);
    if(level==='easy') assert.ok(start.length===3&&min<=3,puzzle.id);
    if(level==='normal') assert.ok(start.length<=4&&min<=5,puzzle.id);
    if(level==='hard') assert.ok(start.length===5&&min>=4||start.length===4&&min>=5,puzzle.id);
    let g=newLadderGame(puzzle);
    for(let i=0;i<min;i++){
      const word=g.path.at(-1), next=ladderPath(word,target,g.path.slice(0,-1))[1];
      const slots=[...word].map((ch,j)=>ch===next[j]?-1:j).filter(j=>j>=0);
      assert.equal(slots.length,1);
      assert.ok(dictionary.has(next));
      g=hintLadder(g);
      assert.equal(g.slot,slots[0]);
      g=changeLadderLetter(g,next[g.slot]);
    }
    assert.equal(g.path.at(-1),target);
    assert.ok(g.over);
    assert.strictEqual(undoLadder(g),g);
  }
});

test('a letter swap keeps the chain on rejected words and undo removes one step',()=>{
  let g=newLadderGame(ladderDecks.normal[0]);
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
