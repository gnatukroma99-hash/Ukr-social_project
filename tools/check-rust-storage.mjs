import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {palettes} from '../app/appearance.mjs';
import {arcadeProgressFrom} from '../app/arcade-progress.mjs';
import {newWordGame,snapshotWord} from '../app/word-game.mjs';

// Synthetic saves only: never read the installed app's profile or tokens.
const legacy={
  saved:['yt-1','pod-1'],
  days:{'2026-11-20':{done:[{id:'p2-4',points:20}],starts:{'p2-4':1795182030123}}},
  best:8,arcadeRotation:{seen:['Родина','лисиця',6],recent:['лисиця']},
  miniRecords:{letters:4,frames:36,ladder:{'кіт-тут':2,'НЕ-ДІЙСНЕ':3,'ґанок-замок':0,'ґанок-замка':6},puzzle:42},
};
const current={
  levels:{side:'easy',letters:'hard',frames:'hard',ladder:'normal',word:'normal'},album:'art',
  frameSeen:{catalog:['yt-1','book-1'],art:['hedgehog']},
  byLevel:{
    easy:{sideBest:10,sideRotation:{seen:['Щоправда','Отнюдь'],recent:['Щоправда']},lettersBest:0,dropSeen:['ЛІТО']},
    normal:{wordSeen:['вітер','вітер','казка',false],wordRound:{target:'казка',draft:'ҐА',guesses:['вішка','вишня']},wordWins:7,wordPlayed:12,wordBest:2},
    hard:{frameBest:{art:76,catalog:42},ladderBest:{'кішка-варта':5},ladderIndex:200},
  },
};
const cases=[
  {},
  {profile:legacy,appearance:'tide'},
  {profile:legacy,arcade:current,appearance:'dawn'},
  {profile:legacy,arcade:{byLevel:null},appearance:'light'},
  {profile:legacy,arcade:{levels:{side:'__proto__',word:'invalid'},album:'invalid',byLevel:{
    easy:{sideBest:2**53,sideRotation:{recent:{0:'Родина'}}},
    normal:{wordRound:{target:'казка',guesses:['казка']},wordWins:-1,wordBest:'3',ladderBest:{'їжак-їжач':1.5}},
    hard:{wordPlayed:Number.MAX_SAFE_INTEGER,wordRound:{target:'Їжачок',draft:'Ї',guesses:[]}},
  }},appearance:'dusk'},
  {profile:{saved:[20,'yt-1',null,'yt-1','pod-1']},arcade:{byLevel:{normal:{
    wordRound:{target:'казка',draft:'наука?',guesses:['вішка']},
  }}},appearance:'typo'},
  {profile:null,arcade:null,appearance:'dark'},
];

const input=cases.map(item=>JSON.stringify({
  profile:JSON.stringify(item.profile),arcade:JSON.stringify(item.arcade),appearance:item.appearance,
})).join('\n')+'\n';
const run=spawnSync('cargo',['run','--quiet','--locked','--offline','-p','svoie-client','--example','storage_parity'],{
  cwd:new URL('../',import.meta.url),encoding:'utf8',input,
});
if(run.error)throw run.error;
assert.equal(run.status,0,run.stderr);
const rows=run.stdout.trimEnd().split(/\r?\n/).map(line=>JSON.parse(line));
assert.equal(rows.length,cases.length);
cases.forEach(({profile,arcade,appearance},i)=>{
  const restored=arcadeProgressFrom(arcade,profile??{});
  const rounds=Object.fromEntries(Object.entries(restored.byLevel).map(([level,records])=>{
    const game=newWordGame(level,records.wordSeen,records.wordRound,()=>0);
    return [level,{...snapshotWord(game),rows:game.rows,seen:game.seen}];
  }));
  assert.deepEqual(rows[i],{
    bookmarks:(profile?.saved??[]).filter(id=>typeof id==='string'),
    days:profile?.days??null,
    appearance:Object.hasOwn(palettes,appearance)?appearance:'dark',
    arcade:restored,
    rounds,
  },`storage case ${i+1}`);
});
console.log(`Rust restored ${cases.length} synthetic profiles the same way as JS, including in-progress word games.`);
