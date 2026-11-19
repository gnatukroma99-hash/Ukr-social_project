import { store, persist } from './state.mjs';
import { currentLadder, isMiniGame, miniStage } from './arcade-views.mjs';
import {
  ALPHABET, FRAME_ROUNDS, FRAME_TILES, ladderPuzzles, ladderWord, dropDuration,
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
    const records=store.miniRecords;
    if(g.kind==='letters' && g.over && g.solved>records.letters) records.letters=g.solved;
    else if(g.kind==='frames' && g.answers.length===FRAME_ROUNDS && g.score>records.frames) records.frames=g.score;
    else if(g.kind==='ladder' && g.over && g.path.length-1<(records.ladder[g.puzzle.id]??Infinity)) records.ladder[g.puzzle.id]=g.path.length-1;
    else return;
    persist();
  }
  function show(next, focus='') {
    if(next===game) return;
    game=next;
    saveRecord(game);
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
    if(kind==='letters') {
      show({...newDropGame(),paused:document.hidden},'.mini-focus');
      remaining=dropDuration(game);arm();
    } else show(kind==='frames'?newFrameGame():newLadderGame(currentLadder()),'.mini-focus');
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
        if(next!==game) show(next,next.open.length===FRAME_TILES?'[data-act="frame-guess"]':'[data-act="frame-open"]');
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
        store.miniRecords.puzzle=(ladderPuzzles.indexOf(game.puzzle)+1)%ladderPuzzles.length;
        persist();start(kind);return true;
      }
    }
    return false;
  }
  function key(event) {
    if(!active() || game.over) return;
    const key=event.key;
    if(game.kind==='letters' && !game.paused && /^[1-3]$/.test(key)){event.preventDefault();pick(Number(key)-1);}
    if(game.kind==='frames' && !game.answers[game.round] && /^[1-3]$/.test(key)){event.preventDefault();show(guessFrame(game,Number(key)-1),'.mini-focus');}
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
