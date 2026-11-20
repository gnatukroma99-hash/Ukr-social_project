import {arcadeDecks,nextArcadeCard,ROUND_SIZE} from '../app/arcade.mjs';
import {LEVELS,sideDuration} from '../app/arcade-levels.mjs';
import {
  catchLetter,dropDecks,dropDuration,dropTurn,frameDecks,frameMax,frameTileCount,
  guessFrame,newDropGame,newFrameGame,nextFrame,uncoverFrame,
} from '../app/minigames.mjs';

const levels=Object.keys(LEVELS);
const randomFor=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);

export function arcadeTrace(row){
  const trace=[], add=(...fields)=>trace.push(row(...fields));
  for(const level of levels){
    let rotation={seen:['not-a-card'],recent:['not-a-card']};
    const next=randomFor(23019);
    for(let i=0;i<2*arcadeDecks[level].length;i++){
      const deal=nextArcadeCard(rotation,level,next);
      rotation=deal.rotation;
      add('side-deal',level,i,...deal.card,rotation.seen.length,rotation.recent.join('|'));
    }
    for(const mode of ['win','lose']){
      const rng=randomFor(123);
      let deal=nextArcadeCard(rotation,level,rng),lives=LEVELS[level].side.lives,score=0;
      for(let i=0;i<ROUND_SIZE&&lives;i++){
        const [word]=deal.card;
        const result=mode==='win'?'ok':i===0?'wrong':'time';
        if(result==='ok')score++;else lives--;
        const after=i+1<ROUND_SIZE&&lives?nextArcadeCard(deal.rotation,level,rng):null;
        add('side-play',level,mode,i,word,sideDuration(level,i),result,score,lives,(after??deal).rotation.seen.length);
        deal=after;
      }
    }
    let seen=['not-a-card'];
    const draw=randomFor(32);
    for(let i=0;i<=dropDecks[level].length;i++){
      const game=newDropGame(level,seen,draw);
      const {word,clue,art}=dropTurn(game);
      add('letters-deal',level,i,word,clue,art??'-',game.letters.join(''),game.seen.length);
      seen=game.seen;
    }
    for(const mode of ['win','lose']){
      const rng=randomFor(49);
      let g=newDropGame(level,[],rng);
      for(let i=0;;i++){
        add('letters-play',level,mode,i,g.words.at(-1)[0],g.letters.join(''),g.position,g.solved,g.lives,dropDuration(g),g.over,g.seen.join('|'));
        if(g.over)break;
        const {letter}=dropTurn(g);
        const lane=i===0?g.letters.length:i===1?g.letters.findIndex(ch=>ch!==letter):mode==='lose'?null:g.letters.indexOf(letter);
        g=catchLetter(g,lane,rng);
      }
    }
  }
  const choices=turn=>turn.choices.map(c=>c.id).join('|');
  for(const [album,deck] of Object.entries(frameDecks)){
    let seen=['not-a-card'];
    const draw=randomFor(48);
    for(let i=0;i<=deck.length;i++){
      const g=newFrameGame(levels[i%levels.length],album,seen,draw);
      const {item}=g.deck[0];
      add('frames-deal',album,i,item.id,item.category,item.title,item.cue,item.src,item.author??'-',item.meta??'-',item.url??'-',item.action??'-',choices(g.deck[0]),g.seen.length);
      seen=g.seen;
    }
    for(const level of levels){
      const rng=randomFor(892);
      let g=newFrameGame(level,album,[],rng);
      while(!g.over){
        const {round}=g,turn=g.deck[round];
        const tiles=Array.from({length:frameTileCount(level)},(_,i)=>i);
        if(round===0)g=uncoverFrame(g,tiles.find(i=>!g.open.includes(i)));
        if(round===2)for(const i of tiles)g=uncoverFrame(g,i);
        g=guessFrame(g,turn.choices.findIndex(c=>(c===turn.item)===(round!==1)));
        const {item,index,correct,points}=g.answers.at(-1);
        add('frames-play',album,level,round,item.id,g.open.join(','),choices(turn),index,correct,points,g.score,frameMax(level),g.seen.join('|'));
        g=nextFrame(g,rng);
      }
    }
  }
  return trace;
}
