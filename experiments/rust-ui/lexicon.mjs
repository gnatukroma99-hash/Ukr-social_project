import * as js from '../../app/lexicon.mjs';
import {rust} from './runtime.mjs';

export * from '../../app/lexicon.mjs';
export function knownWord(word){
  return rust?typeof word==='string'&&rust.knownWord(word):js.knownWord(word);
}
export function ladderPath(start,target,excluded=[]){
  if(rust&&typeof start==='string'&&typeof target==='string'&&Array.isArray(excluded)&&excluded.every(w=>typeof w==='string')){
    const path=rust.ladderPath(start,target,JSON.stringify(excluded));
    if(path!==undefined)return JSON.parse(path);
  }
  return js.ladderPath(start,target,excluded);
}
