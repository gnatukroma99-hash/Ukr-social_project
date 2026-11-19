import test from 'node:test';
import assert from 'node:assert/strict';
import { arcadeSize, nextArcadeCard, ROUND_SIZE } from '../app/arcade.mjs';

test('opening new rounds or reloading cannot repeat a card before exhausting the bank',()=>{
  let rotation=null, seed=23019, recent=[];
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  for(let cycle=0;cycle<3;cycle++){
    const words=new Set();let ua=0;
    for(let i=0;i<arcadeSize;i++){
      // Serialize between draws as if the player exited after only one card.
      const deal=nextArcadeCard(JSON.parse(JSON.stringify(rotation)),random);
      const [word,lang,hint]=deal.card;assert.ok(!words.has(word));assert.ok(!recent.includes(word));
      assert.ok(['ua','ru'].includes(lang)&&hint.length>0);words.add(word);ua+=Number(lang==='ua');
      if((i+1)%ROUND_SIZE===0){assert.equal(ua,ROUND_SIZE/2);ua=0;}
      rotation=deal.rotation;recent=[...recent,word].slice(-20);
    }
    assert.equal(words.size,arcadeSize);
  }
});
