import { catalog } from './catalog.mjs';
import { categories } from './data.mjs';
import { illustrations } from './arcade-art.mjs';
import { DEFAULT_ALBUM, DEFAULT_LEVEL, LEVELS } from './arcade-levels.mjs';
import { dropWords } from './minigame-data.mjs';
import { ladderPairs, ladderWords } from './ladder-data.mjs';

export const ALPHABET = [...'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'];
export const DROP_WORDS = 5;
export const FRAME_ROUNDS = 5;

function shuffle(list, random) {
  const result = [...list];
  for (let i=result.length-1;i>0;i--) {
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

// Persist IDs only after dealing a visible item. Reopening a game never skips
// the unseen part of its deck. Avoid a repeat within the current round too.
function drawFrom(pool, history, withinRound, id, random, prefer=()=>true) {
  const ids=new Set(pool.map(id));
  const known=[...new Set(history.filter(key=>ids.has(key)))];
  const previous=new Set(known.length===pool.length?[]:known);
  const fresh=pool.filter(item=>!previous.has(id(item)));
  const blocked=new Set(withinRound), recent=new Set(known.slice(-5));
  const available=fresh.filter(item=>!blocked.has(id(item)));
  const options=available.length?available:fresh;
  const notRecent=options.filter(item=>!recent.has(id(item)));
  const candidates=notRecent.length?notRecent:options;
  const preferred=candidates.filter(prefer), pick=preferred.length?preferred:candidates;
  const item=pick[Math.floor(random()*pick.length)];
  return {item,seen:[...previous,id(item)]};
}

export function dropTurn(g) {
  const [word, clue, art] = g.words[g.solved];
  return { word, clue, art, letter:word[g.position] };
}
const dropLimits={easy:[3,5],normal:[4,8],hard:[7,14]};
export const dropDecks=Object.fromEntries(Object.entries(dropLimits).map(([level,[min,max]])=>
  [level,dropWords.filter(([word])=>word.length>=min&&word.length<=max)]));
export const dropDuration = g => LEVELS[g.level].letters.time-g.solved*LEVELS[g.level].letters.step;
function dealLetters(g, random) {
  if(g.over) return g;
  const { word, letter }=dropTurn(g);
  const count=LEVELS[g.level].letters.lanes-1;
  const distractors=shuffle(ALPHABET.filter(ch=>!word.includes(ch)),random).slice(0,count);
  return {...g, letters:shuffle([letter,...distractors],random)};
}
function nextDropWord(g,random) {
  const {item,seen}=drawFrom(dropDecks[g.level],g.seen,g.words.map(w=>w[0]),w=>w[0],random);
  return dealLetters({...g,seen,words:[...g.words,item]},random);
}
export function newDropGame(level=DEFAULT_LEVEL, seen=[], random=Math.random) {
  return nextDropWord({kind:'letters', level, seen, words:[], position:0, solved:0, lives:LEVELS[level].letters.lives, over:false, notice:''},random);
}
export function catchLetter(g, lane, random=Math.random) {
  if(g.over || (lane!==null && (!Number.isInteger(lane) || !g.letters[lane]))) return g;
  const { word, letter }=dropTurn(g);
  if(g.letters[lane]!==letter) {
    const lives=g.lives-1, notice=lane===null?'Літера впала. Спробуй ще раз.':'Це інша літера. Спробуй ще раз.';
    return dealLetters({...g,lives,over:lives===0,notice:lives?notice:`Цього разу слово: ${word}.`},random);
  }
  if(g.position+1<word.length) return dealLetters({...g,position:g.position+1,notice:`Є літера «${letter}».`},random);
  const solved=g.solved+1;
  const next={...g,solved,position:0,over:solved===DROP_WORDS,notice:`Зібрано: ${word}.`};
  return next.over?next:nextDropWord(next,random);
}

export const frameDecks={
  catalog:catalog.map(p=>({
    id:p.id, category:categories.find(c=>c.id===p.category).name, author:p.to,
    ...p.preview, src:`./assets/covers/${p.preview.cover}`, url:p.preview.url??p.url, action:p.preview.action??p.action,
  })),
  art:illustrations.map(({id,word,clue,category,src})=>({id,category,src,cue:clue,title:word[0]+word.slice(1).toLocaleLowerCase('uk')})),
};
function dealFrame(g,random) {
  const settings=LEVELS[g.level].frames, pool=frameDecks[g.album];
  const shown=new Set(g.deck.map(({item})=>item.category));
  const {item,seen}=drawFrom(pool,g.seen,g.deck.map(r=>r.item.id),i=>i.id,random,i=>!shown.has(i.category));
  const distractors=shuffle(pool.filter(i=>i.category===item.category && i!==item),random).slice(0,settings.choices-1);
  const choices=shuffle([item,...distractors],random);
  return {...g,seen,deck:[...g.deck,{item,choices}],open:[...settings.open]};
}
export function newFrameGame(level=DEFAULT_LEVEL, album=DEFAULT_ALBUM, seen=[], random=Math.random) {
  return dealFrame({kind:'frames',level,album,seen,deck:[],round:0,answers:[],score:0,over:false},random);
}
export const frameTileCount=level=>LEVELS[level].frames.grid**2;
export const frameValue = g => frameTileCount(g.level)+1-g.open.length;
export const frameMax=level=>FRAME_ROUNDS*(frameTileCount(level)+1-LEVELS[level].frames.open.length);
export function uncoverFrame(g, tile) {
  if(g.over || g.answers[g.round] || !Number.isInteger(tile) || tile<0 || tile>=frameTileCount(g.level) || g.open.includes(tile)) return g;
  return {...g,open:[...g.open,tile]};
}
export function guessFrame(g, index) {
  if(g.over || g.answers[g.round]) return g;
  const { item, choices }=g.deck[g.round];
  if(!Number.isInteger(index) || !choices[index]) return g;
  const correct=choices[index]===item, points=correct?frameValue(g):0;
  return {...g,answers:[...g.answers,{item,index,correct,points}],score:g.score+points};
}
export function nextFrame(g,random=Math.random) {
  if(g.over || !g.answers[g.round]) return g;
  return g.round+1===FRAME_ROUNDS?{...g,over:true}:dealFrame({...g,round:g.round+1},random);
}

const dictionary=new Set(ladderWords);
const lowercase=ALPHABET.map(ch=>ch.toLocaleLowerCase('uk'));
function replaceLetter(word, index, ch) { return word.slice(0,index)+ch+word.slice(index+1); }
const neighbors=new Map(ladderWords.map(word=>[word,[...word].flatMap((ch,index)=>lowercase.filter(next=>next!==ch)
  .map(next=>replaceLetter(word,index,next)).filter(next=>dictionary.has(next)))]));
export function ladderPath(start, target, excluded=[]) {
  const seen=new Set([...excluded,start]), queue=[[start]];
  for(const path of queue){
    const word=path[path.length-1];
    if(word===target) return path;
    for(const next of neighbors.get(word) || []){
      if(seen.has(next)) continue;
      seen.add(next);queue.push([...path,next]);
    }
  }
  return null;
}
export const ladderDecks=Object.fromEntries(Object.entries(ladderPairs).map(([level,pairs])=>[level,pairs.map(([start,target])=>{
  const path=ladderPath(start,target);
  return {id:`${start}-${target}`,level,start,target,min:path?path.length-1:0};
})]));
export const ladderPuzzles=Object.values(ladderDecks).flat();
export function newLadderGame(puzzle) {
  return {kind:'ladder',level:puzzle.level,puzzle,path:[puzzle.start],slot:0,over:false,notice:''};
}
export const ladderWord = g => g.path[g.path.length-1];
export function selectLadderSlot(g, slot) {
  if(g.over || !Number.isInteger(slot) || slot<0 || slot>=ladderWord(g).length || slot===g.slot) return g;
  return {...g,slot,notice:''};
}
export function changeLadderLetter(g, char) {
  const ch=String(char).toLocaleUpperCase('uk');
  if(g.over || !ALPHABET.includes(ch)) return g;
  const word=ladderWord(g), next=replaceLetter(word,g.slot,ch.toLocaleLowerCase('uk'));
  if(next===word) return {...g,notice:'Обери іншу літеру.'};
  if(!dictionary.has(next)) return {...g,notice:`«${next}» немає у словнику гри.`};
  if(g.path.includes(next)) return {...g,notice:'Це слово вже в ланцюжку. Можеш скасувати хід.'};
  return {...g,path:[...g.path,next],over:next===g.puzzle.target,notice:`Новий крок: ${next}.`};
}
export function undoLadder(g) {
  return g.over || g.path.length<2?g:{...g,path:g.path.slice(0,-1),notice:'Хід скасовано.'};
}
export function hintLadder(g) {
  if(g.over) return g;
  const word=ladderWord(g), next=ladderPath(word,g.puzzle.target,g.path.slice(0,-1))?.[1];
  if(!next) return {...g,notice:'Скасуй хід, щоб спробувати інший шлях.'};
  const slot=[...word].findIndex((ch,i)=>ch!==next[i]);
  return {...g,slot,notice:`Літера ${slot+1}: заміни «${word[slot].toLocaleUpperCase('uk')}» на «${next[slot].toLocaleUpperCase('uk')}».`};
}
