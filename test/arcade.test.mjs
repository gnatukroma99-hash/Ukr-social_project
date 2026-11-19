import test from 'node:test';
import assert from 'node:assert/strict';
import { arcadeDecks, arcadeSize, nextArcadeCard, ROUND_SIZE } from '../app/arcade.mjs';
import { LEVELS, sideDuration } from '../app/arcade-levels.mjs';
import { arcadeProgressFrom } from '../app/arcade-progress.mjs';

test('all 720 cards are unique; each level rotates independently and balances ten-card blocks',()=>{
  const cards=Object.values(arcadeDecks).flat();
  assert.equal(arcadeSize,720);
  assert.equal(new Set(cards.map(([word])=>word.toLocaleLowerCase('uk'))).size,arcadeSize);
  let seed=23019;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  for(const [level,deck] of Object.entries(arcadeDecks)){
    let rotation=null, recent=[];
    for(let cycle=0;cycle<2;cycle++){
      const words=new Set();let ua=0;
      for(let i=0;i<deck.length;i++){
        const deal=nextArcadeCard(JSON.parse(JSON.stringify(rotation)),level,random);
        const [word,lang,hint]=deal.card;
        assert.ok(deck.includes(deal.card) && !words.has(word) && !recent.includes(word));
        assert.ok(['ua','ru'].includes(lang) && hint.length>0);words.add(word);ua+=Number(lang==='ua');
        if((i+1)%ROUND_SIZE===0){assert.equal(ua,ROUND_SIZE/2);ua=0;}
        rotation=deal.rotation;recent=[...recent,word].slice(-20);
      }
      assert.equal(words.size,deck.length);
    }
  }
});

test('side difficulty changes lives and time without changing the record ceiling',()=>{
  assert.equal(ROUND_SIZE,10);
  for(const i of [0,4,9]){
    assert.ok(sideDuration('easy',i)>sideDuration('normal',i));
    assert.ok(sideDuration('normal',i)>sideDuration('hard',i));
  }
  assert.deepEqual(Object.values(LEVELS).map(l=>l.side.lives),[5,3,2]);
});

test('arcade progress retains old records on medium and round-trips each level and album separately',()=>{
  const legacy={best:8,arcadeRotation:{seen:['Зрештою'],recent:['Зрештою']},
    miniRecords:{letters:3,frames:27,ladder:{'кіт-тут':3},puzzle:7},saved:['mu-1'],days:{example:1}};
  const old=JSON.stringify(legacy), data=arcadeProgressFrom(null,legacy);
  const {normal,easy,hard}=data.byLevel;
  assert.equal(normal.sideBest,8);
  assert.deepEqual(normal.sideRotation,legacy.arcadeRotation);
  assert.equal(normal.lettersBest,3);
  assert.deepEqual(normal.frameBest,{catalog:27,art:0});
  assert.equal(normal.ladderBest['кіт-тут'],3);
  assert.equal(normal.ladderIndex,7);
  assert.equal(easy.lettersBest,0);
  assert.deepEqual(hard.frameBest,{catalog:0,art:0});
  data.levels.letters='hard';data.levels.side='easy';data.album='art';
  hard.frameBest.art=23;easy.sideBest=6;
  data.frameSeen.art=['cherry'];hard.dropSeen=['ПАСАЖИР'];
  const next=arcadeProgressFrom(JSON.parse(JSON.stringify(data)),legacy);
  assert.deepEqual(next,data);
  assert.equal(JSON.stringify(legacy),old);
  const fallback=arcadeProgressFrom({levels:{side:'toString'},album:'__proto__',byLevel:{}});
  assert.equal(fallback.levels.side,'normal');assert.equal(fallback.album,'catalog');
});
