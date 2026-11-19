import {LEVELS} from './arcade-levels.mjs';
import {ALPHABET, knownWord} from './lexicon.mjs';
import {wordAnswers} from './answer-data.mjs';

export function marksFor(guess,target){
  const marks=Array(guess.length).fill('absent'),left=new Map();
  for(let i=0;i<target.length;i++){
    if(guess[i]===target[i])marks[i]='exact';
    else left.set(target[i],(left.get(target[i])||0)+1);
  }
  for(let i=0;i<guess.length;i++)if(marks[i]!=='exact' && left.get(guess[i])>0){
    marks[i]='present';left.set(guess[i],left.get(guess[i])-1);
  }
  return marks;
}
export function keyMarks(rows){
  const best={},rank={absent:1,present:2,exact:3};
  for(const {word,marks} of rows)for(let i=0;i<word.length;i++){
    if(!best[word[i]]||rank[marks[i]]>rank[best[word[i]]])best[word[i]]=marks[i];
  }
  return best;
}
export const guessPool=level=>wordAnswers[LEVELS[level].word.size];
const empty=(level,target,seen)=>({kind:'word',level,target,seen,draft:'',rows:[],over:false,won:false,notice:''});
export function newWordGame(level,history=[],saved=null,random=Math.random){
  const pool=guessPool(level),valid=new Set(pool),{size,tries}=LEVELS[level].word;
  let seen=[...new Set(history.filter(w=>valid.has(w)))];
  if(saved && valid.has(saved.target) && Array.isArray(saved.guesses) && saved.guesses.length<tries && new Set(saved.guesses).size===saved.guesses.length && saved.guesses.every(w=>typeof w==='string' && w.length===size && w!==saved.target && knownWord(w))){
    if(!seen.includes(saved.target))seen.push(saved.target);
    const rows=saved.guesses.map(word=>({word,marks:marksFor(word,saved.target)}));
    const draft=typeof saved.draft==='string' && saved.draft.length<=size && [...saved.draft].every(c=>ALPHABET.includes(c.toUpperCase()))?saved.draft.toLowerCase():'';
    return {...empty(level,saved.target,seen),rows,draft};
  }
  let choices=pool.filter(w=>!seen.includes(w));
  if(!choices.length){choices=pool.filter(w=>!seen.slice(-5).includes(w));seen=[];}
  const target=choices[Math.floor(random()*choices.length)];
  return empty(level,target,[...seen,target]);
}
export function typeWord(g,ch){
  if(g.over||typeof ch!=='string'||!ALPHABET.includes(ch.toUpperCase())||g.draft.length>=g.target.length)return g;
  return {...g,draft:g.draft+ch.toLowerCase(),notice:''};
}
export const eraseWord=g=>!g.over && g.draft?{...g,draft:g.draft.slice(0,-1),notice:''}:g;
export function submitWord(g){
  if(g.over)return g;
  const {size,tries}=LEVELS[g.level].word,word=g.draft;
  if(word.length!==size)return {...g,notice:`Потрібно літер: ${size}. Зараз: ${word.length}.`};
  if(!knownWord(word))return {...g,notice:`«${word}» немає у словнику. Лічильник спроб не змінився.`};
  if(g.rows.some(r=>r.word===word))return {...g,notice:`Ти вже перевіряв це слово. Спробуй інше.`};
  const marks=marksFor(word,g.target),rows=[...g.rows,{word,marks}],won=word===g.target;
  return {...g,draft:'',rows,won,over:won||rows.length===tries,notice:won?'Слово відгадано.':`На місці: ${marks.filter(m=>m==='exact').length}. На іншій позиції: ${marks.filter(m=>m==='present').length}.`};
}
export const snapshotWord=g=>g.over?null:{target:g.target,draft:g.draft,guesses:g.rows.map(r=>r.word)};
