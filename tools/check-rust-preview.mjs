import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as lexicon from '../experiments/rust-ui/lexicon.mjs';
import * as engine from '../experiments/rust-ui/engine.mjs';
import {arcadeProgressFrom} from '../experiments/rust-ui/arcade-progress.mjs';
import {useRust} from '../experiments/rust-ui/runtime.mjs';

const moduleDir=new URL('../target/svoie-wasm/',import.meta.url);
const bindings=await import(new URL('svoie_client.js',moduleDir));
bindings.initSync({module:await readFile(new URL('svoie_client_bg.wasm',moduleDir))});

function exerciseRules(){
  const old={best:7,miniRecords:{ladder:{'кіт-тут':2}},sessions:{'https://example.test':{token:'example-token'}}};
  return {
    known:['вішка','їжак','ґанок','ВІШКА','ґґґґґ',null].map(lexicon.knownWord),
    paths:[
      lexicon.ladderPath('кішка','варта'),
      lexicon.ladderPath('вішка','варта',['кішка']),
      lexicon.ladderPath('вішка','варта',['варта']),
    ],
    days:[
      engine.dayAt(Date.parse('2026-03-29T21:00:00Z')),
      engine.dayAt(Date.parse('2026-11-24T21:59:59.999Z')),
      engine.dayAt(Date.parse('2026-11-24T22:00:00Z')),
    ],
    decks:['2025-12-31','2026-11-24','2028-02-29'].map(engine.deckFor),
    scores:[0,8000,8001,15000,15001].flatMap(ms=>['обрій','піднебіння'].map(choice=>
      engine.scoreAnswer({id:'p1-3',kind:'riddle',correct:'обрій',explanation:'Обрій'},choice,ms,5)
    )),
    saves:[
      arcadeProgressFrom(null,old),
      arcadeProgressFrom({byLevel:{hard:{ladderIndex:3}}},old),
      arcadeProgressFrom({byLevel:{normal:{wordRound:{target:'казка',draft:'ґа',guesses:['вішка']}}}},old),
    ],
  };
}
const expected=exerciseRules();
const calls=new Set();
const names=['knownWord','ladderPath','kyivDay','dailyDeck','scoreQuest','restoreArcade'];
useRust(Object.fromEntries(names.map(name=>[name,(...args)=>{
  calls.add(name);
  const result=bindings[name](...args);
  assert.notEqual(result,undefined,`${name} returned no value`);
  if(name==='restoreArcade')assert.ok(!args[1].includes('example-token'),'OAuth token in WASM input');
  return result;
}])));
assert.deepEqual(exerciseRules(),expected);
assert.deepEqual(calls,new Set(names));
console.log(`Compiled WASM matches JavaScript through all ${names.length} preview adapters.`);
