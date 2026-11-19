import { arcadeProgress, persistArcade } from './state.mjs';
import { currentLadder, isMiniGame, miniStage } from './arcade-views.mjs';
import {
  ALPHABET, FRAME_ROUNDS, frameTileCount, ladderDecks, ladderWord, dropDuration,
  newDropGame, catchLetter, newFrameGame, uncoverFrame, guessFrame, nextFrame,
  newLadderGame, selectLadderSlot, changeLadderLetter, undoLadder, hintLadder,
} from './minigames.mjs';

export function makeMiniArcade(activeKind) {
  let game=null, animation=0, deadline=0, remaining=0;
  const stop=()=>{cancelAnimationFrame(animation);animation=0;};
  const active=()=>game?.kind===activeKind();

  function render(focus='') {
    const stage=document.querySelector('#mini-stage');
    if(!stage || !active()) return;
    const oldFocus=document.activeElement;
    const control=stage.contains(oldFocus)?oldFocus.dataset:null;
    if(!focus && control?.act) {
      focus=`[data-act="${control.act}"]`;
      if(control.index!==undefined) focus+=`[data-index="${control.index}"]`;
      if(control.letter!==undefined) focus+=`[data-letter="${control.letter}"]`;
    }
    const template=document.createElement('template');
    template.innerHTML=miniStage(game.kind,game);
    // Open tiles over the same image node: a failed request isn't retried per tap.
    const old=stage.querySelector('.frame-board'), next=template.content.querySelector('.frame-board');
    if(old && next?.dataset.frameId===old.dataset.frameId){
      next.querySelector('.frame-image').replaceWith(old.querySelector('.frame-image'));
      next.classList.toggle('has-release',old.classList.contains('has-release'));
    }
    stage.replaceChildren(template.content);
    const status=document.querySelector('#mini-live'), notice=game.notice||'';
    if(status.textContent!==notice) status.textContent=notice;
    if(focus) (stage.querySelector(focus)||stage.querySelector('.mini-focus'))?.focus({preventScroll:true});
  }

  function saveRecord(g) {
    const r=arcadeProgress.byLevel[g.level];
    if(g.kind==='letters' && g.over && g.solved>r.lettersBest) r.lettersBest=g.solved;
    else if(g.kind==='frames' && g.answers.length===FRAME_ROUNDS && g.score>r.frameBest[g.album]) r.frameBest[g.album]=g.score;
    else if(g.kind==='ladder' && g.over && g.path.length-1<(r.ladderBest[g.puzzle.id]??Infinity)) r.ladderBest[g.puzzle.id]=g.path.length-1;
    else return false;
    return true;
  }
  function show(next, focus='') {
    if(next===game) return;
    const dealt=next.seen && next.seen!==game?.seen;
    game=next;
    if(dealt && next.kind==='letters')arcadeProgress.byLevel[next.level].dropSeen=next.seen;
    if(dealt && next.kind==='frames')arcadeProgress.frameSeen[next.album]=next.seen;
    if(saveRecord(next)||dealt)persistArcade();
    render(next.over?'.mini-focus':focus);
  }

  function paint(left) {
    const fraction=Math.max(0,Math.min(1,left/dropDuration(game)));
    document.querySelector('#drop-board')?.style.setProperty('--fall',`${(1-fraction)*100}%`);
    const bar=document.querySelector('#drop-time-bar');if(bar)bar.style.transform=`scaleX(${fraction})`;
  }
  function arm() {
    stop();
    if(game.over) return;
    paint(remaining);
    if(game.paused) return;
    deadline=performance.now()+remaining;
    const turn=game;
    const tick=now=>{
      if(!active() || game!==turn || game.paused) return;
      if(now>=deadline) pick(null);
      else {paint(deadline-now);animation=requestAnimationFrame(tick);}
    };
    animation=requestAnimationFrame(tick);
  }
  function pick(index) {
    if(!active() || game.kind!=='letters' || game.over || game.paused || document.hidden) return;
    const next=catchLetter(game,performance.now()>=deadline?null:index);
    if(next===game) return;
    show(next);
    remaining=dropDuration(game);
    arm();
  }
  function pause() {
    if(!active() || game.kind!=='letters' || game.over || game.paused) return;
    remaining=Math.max(0,deadline-performance.now());
    stop();
    show({...game,paused:true},'[data-act="drop-pause"]');
    paint(remaining);
  }
  function start(kind) {
    stop();
    const {levels,album,frameSeen,byLevel}=arcadeProgress, level=levels[kind];
    if(kind==='letters') {
      show({...newDropGame(level,byLevel[level].dropSeen),paused:document.hidden},'.mini-focus');
      remaining=dropDuration(game);arm();
    } else show(kind==='frames'?newFrameGame(level,album,frameSeen[album]):newLadderGame(currentLadder(level)),'.mini-focus');
  }
  function click(action, data) {
    const kind=activeKind();
    if(!isMiniGame(kind)) return false;
    if(action==='mini-start') {start(kind);return true;}
    if(!active()) return false;
    const index=Number(data.index);
    if(kind==='letters') {
      if(action==='drop-pick') {pick(index);return true;}
      if(action==='drop-pause' && !game.over) {
        if(game.paused){show({...game,paused:false},'[data-act="drop-pause"]');arm();}
        else pause();
        return true;
      }
    } else if(kind==='frames') {
      if(action==='frame-open'){
        const next=uncoverFrame(game,index);
        if(next!==game) show(next,next.open.length===frameTileCount(game.level)?'[data-act="frame-guess"]':'[data-act="frame-open"]');
        return true;
      }
      if(action==='frame-guess'){show(guessFrame(game,index),'.mini-focus');return true;}
      if(action==='frame-next'){show(nextFrame(game),'.mini-focus');return true;}
    } else {
      if(action==='ladder-slot'){show(selectLadderSlot(game,index));return true;}
      if(action==='ladder-letter'){show(changeLadderLetter(game,data.letter));return true;}
      if(action==='ladder-hint'){show(hintLadder(game));return true;}
      if(action==='ladder-undo'){show(undoLadder(game),'[data-act="ladder-slot"][aria-pressed="true"]');return true;}
      if(action==='ladder-next'){
        const deck=ladderDecks[game.level];
        arcadeProgress.byLevel[game.level].ladderIndex=(deck.indexOf(game.puzzle)+1)%deck.length;
        persistArcade();start(kind);return true;
      }
    }
    return false;
  }
  function key(event) {
    if(!active() || game.over) return;
    const key=event.key, index=/^[1-4]$/.test(key)?Number(key)-1:-1;
    if(game.kind==='letters' && !game.paused && game.letters[index]){event.preventDefault();pick(index);}
    if(game.kind==='frames' && !game.answers[game.round] && game.deck[game.round].choices[index]){event.preventDefault();show(guessFrame(game,index),'.mini-focus');}
    if(game.kind==='ladder') {
      if(key==='ArrowLeft' || key==='ArrowRight'){
        event.preventDefault();
        show(selectLadderSlot(game,Math.max(0,Math.min(ladderWord(game).length-1,game.slot+(key==='ArrowLeft'?-1:1)))));
        document.querySelector('[data-act="ladder-slot"][aria-pressed="true"]')?.focus({preventScroll:true});
      } else if(ALPHABET.includes(key.toLocaleUpperCase('uk'))){event.preventDefault();show(changeLadderLetter(game,key));}
    }
  }
  return {get game(){return game;}, leave(){stop();game=null;}, pause, click, key};
}
