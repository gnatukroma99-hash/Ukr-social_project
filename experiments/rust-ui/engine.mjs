import * as js from '../../app/engine.mjs';
import {rust} from './runtime.mjs';

export * from '../../app/engine.mjs';
export function dayAt(time=Date.now()){
  return (rust&&Number.isSafeInteger(time)?rust.kyivDay(time):undefined)??js.dayAt(time);
}
export function deckFor(date){
  const cards=rust&&typeof date==='string'?rust.dailyDeck(date):undefined;
  return cards===undefined?js.deckFor(date):JSON.parse(cards);
}
export function scoreAnswer(question,choice,elapsed,bonus=0){
  if(rust&&typeof choice==='string'&&typeof question?.correct==='string'
      &&Number.isInteger(elapsed)&&elapsed>=0&&elapsed<=0xffffffff&&Number.isInteger(bonus)&&bonus>=0&&bonus<=35){
    const score=rust.scoreQuest(question.kind,question.correct,choice,elapsed,bonus);
    if(score!==undefined)return {id:question.id,choice,...JSON.parse(score),expected:question.correct,explanation:question.explanation};
  }
  return js.scoreAnswer(question,choice,elapsed,bonus);
}
