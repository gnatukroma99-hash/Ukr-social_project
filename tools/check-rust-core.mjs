import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {scoreAnswer,streakBonus} from '../app/engine.mjs';
import {formCounts} from '../app/lexicon-data.mjs';
import {ladderDecks,ladderPath} from '../app/minigames.mjs';
import {guessPool,marksFor} from '../app/word-game.mjs';

const tsv=(...fields)=>fields.join('\t');
const commands=[],expected=[];
for(const [level,deck] of Object.entries(ladderDecks)){
  expected.push(tsv('answers',level,guessPool(level).join(' ')));
  for(const p of deck)expected.push(tsv('ladder',level,p.id,p.min,ladderPath(p.start,p.target).join(' ')));
}
const legacyAdditions={3:2,4:1,5:1,6:0};
for(const [len,count] of Object.entries(formCounts))expected.push(tsv('forms',len,count+legacyAdditions[len]));

// Deterministic samples of real answers plus repeated letters and Ukrainian
// characters whose UTF-8 width is not one byte.
const checkMarks=(guess,target)=>{
  const row=tsv('marks',guess,target);
  commands.push(row);
  expected.push(tsv(row,marksFor(guess,target).join(' ')));
};
for(const [guess,target] of [['касса','маска'],['маска','корма'],['вішка','казка'],['ґанок','їжачок']])checkMarks(guess,target);
for(const level of Object.keys(ladderDecks)){
  const pool=guessPool(level);
  for(let i=0;i<50;i++)checkMarks(pool[(i*29)%pool.length],pool[(i*67+3)%pool.length]);
}
for(const kind of ['riddle','translate','context'])for(const elapsed of [0,8000,8001,15000,15001]){
  for(const days of [0,1,7,8])for(const choice of ['вішка','кішка']){
    const row=tsv('score',kind,'вішка',choice,elapsed,days);
    const s=scoreAnswer({kind,correct:'вішка'},choice,elapsed,streakBonus(days));
    commands.push(row);
    expected.push(tsv(row,s.correct,s.speed,s.bonus,s.points));
  }
}
const run=spawnSync('cargo',['run','--quiet','--locked','--offline','-p','svoie-core','--example','parity'],{
  cwd:new URL('../',import.meta.url),encoding:'utf8',input:commands.join('\n')+'\n',maxBuffer:2*1024**2,
});
if(run.error)throw run.error;
assert.equal(run.status,0,run.stderr);
const actual=run.stdout.trimEnd().split(/\r?\n/);
assert.equal(actual.length,expected.length);
for(let i=0;i<expected.length;i++)assert.equal(actual[i],expected[i],`Rust/JS case ${i+1}`);
console.log(`Rust and JS match: ${actual.length} rows, including all 600 ladder paths.`);
