import { formCounts, formText } from './lexicon-data.mjs';

export const ALPHABET=[...'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'];
export const lowerAlphabet=ALPHABET.map(c=>c.toLowerCase());
// Keep the four forms accepted in 0.2.6 that are absent from this Hunspell edition.
const legacy={3:['ток','різ'],4:['малю'],5:['комом']};
export const lexiconSize=Object.values(formCounts).reduce((a,b)=>a+b,0)+4;
const sets=new Map();
function bank(n){
  if(!formCounts[n])return null;
  if(!sets.has(n))sets.set(n,new Set([...formText[n].split(/\s+/),...(legacy[n]||[])]));
  return sets.get(n);
}
export const knownWord=w=>typeof w==='string' && !!bank(w.length)?.has(w);
export const replaceLetter=(word,index,ch)=>word.slice(0,index)+ch+word.slice(index+1);

// Compute only the neighborhood visited by a hint, never the full dictionary at startup.
const cache=new Map();
export function adjacent(word){
  if(cache.has(word))return cache.get(word);
  const words=bank(word.length),out=[];
  if(!words)return out;
  for(let i=0;i<word.length;i++){
    const left=word.slice(0,i),right=word.slice(i+1);
    for(const ch of lowerAlphabet){
      if(ch===word[i])continue;
      const next=left+ch+right;if(words.has(next))out.push(next);
    }
  }
  if(cache.size>=4096)cache.clear();
  cache.set(word,out);return out;
}

// Expand the smaller frontier a full layer at a time, then reconstruct through
// parent pointers. Even a dead end never stores a separate path for every node.
export function ladderPath(start,target,excluded=[]){
  const blocked=new Set(excluded);
  if(start.length!==target.length||!knownWord(start)||!knownWord(target)||blocked.has(target))return null;
  if(start===target)return [start];
  const trail=(parents,word)=>{const out=[];while(word!==null){out.push(word);word=parents.get(word);}return out;};
  let left=[start],right=[target],prev=new Map([[start,null]]),after=new Map([[target,null]]),forward=true;
  while(left.length && right.length){
    if(left.length>right.length){[left,right]=[right,left];[prev,after]=[after,prev];forward=!forward;}
    const upcoming=[];
    for(const word of left)for(const next of adjacent(word)){
      if(blocked.has(next)||prev.has(next))continue;
      if(after.has(next)){
        const path=[...trail(prev,word).reverse(),...trail(after,next)];
        return forward?path:path.reverse();
      }
      prev.set(next,word);upcoming.push(next);
    }
    left=upcoming;
  }
  return null;
}
