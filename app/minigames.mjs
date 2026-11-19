import { catalog } from './catalog.mjs';
import { dropWords, ladderPairs, ladderWords } from './minigame-data.mjs';

export const ALPHABET = [...'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'];
export const DROP_WORDS = 5;
export const DROP_LIVES = 3;
export const FRAME_ROUNDS = 5;
export const FRAME_TILES = 9;

function shuffle(list, random) {
  const result = [...list];
  for (let i=result.length-1;i>0;i--) {
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export function dropTurn(g) {
  const [word, clue, art] = g.words[g.solved];
  return { word, clue, art, letter:word[g.position] };
}
export const dropDuration = g => 4300-g.solved*260;
function dealLetters(g, random) {
  if(g.over) return g;
  const { word, letter }=dropTurn(g);
  const distractors=shuffle(ALPHABET.filter(ch=>!word.includes(ch)),random).slice(0,2);
  return {...g, letters:shuffle([letter,...distractors],random)};
}
export function newDropGame(random=Math.random) {
  return dealLetters({kind:'letters', words:shuffle(dropWords,random).slice(0,DROP_WORDS), position:0, solved:0, lives:DROP_LIVES, over:false, notice:''},random);
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
  return dealLetters({...g,solved,position:0,over:solved===DROP_WORDS,notice:`Зібрано: ${word}.`},random);
}

const byCategory=Object.create(null);
for(const pair of catalog) (byCategory[pair.category] ||= []).push(pair);
export function newFrameGame(random=Math.random) {
  const deck=shuffle(Object.keys(byCategory),random).slice(0,FRAME_ROUNDS).map(category=>{
    const [pair,...distractors]=shuffle(byCategory[category],random).slice(0,3);
    return {pair, choices:shuffle([pair,...distractors],random)};
  });
  return {kind:'frames',deck,round:0,open:[4],answers:[],score:0,over:false};
}
export const frameValue = g => FRAME_TILES+1-g.open.length;
export function uncoverFrame(g, tile) {
  if(g.over || g.answers[g.round] || !Number.isInteger(tile) || tile<0 || tile>=FRAME_TILES || g.open.includes(tile)) return g;
  return {...g,open:[...g.open,tile]};
}
export function guessFrame(g, index) {
  if(g.over || g.answers[g.round]) return g;
  const { pair, choices }=g.deck[g.round];
  if(!Number.isInteger(index) || !choices[index]) return g;
  const correct=choices[index]===pair, points=correct?frameValue(g):0;
  return {...g,answers:[...g.answers,{pair,index,correct,points}],score:g.score+points};
}
export function nextFrame(g) {
  if(g.over || !g.answers[g.round]) return g;
  return g.round+1===g.deck.length?{...g,over:true}:{...g,round:g.round+1,open:[4]};
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
export const ladderPuzzles=ladderPairs.map(([start,target])=>({id:`${start}-${target}`,start,target,min:ladderPath(start,target).length-1}));
export function newLadderGame(puzzle) {
  return {kind:'ladder',puzzle,path:[puzzle.start],slot:0,over:false,notice:''};
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
