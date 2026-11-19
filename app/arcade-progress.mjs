import { DEFAULT_ALBUM, DEFAULT_LEVEL, FRAME_ALBUMS, GAMES, LEVELS, isAlbum, isLevel } from './arcade-levels.mjs';

export const ARCADE_STORAGE_KEY='svoie.arcade.v2';
const object=value=>value && typeof value==='object' && !Array.isArray(value)?value:{};
const count=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const seen=value=>Array.isArray(value)?value.filter(x=>typeof x==='string'):[];
const entries=(keys,make)=>Object.fromEntries(keys.map(k=>[k,make(k)]));
const levels=Object.keys(LEVELS), albums=Object.keys(FRAME_ALBUMS);

export function arcadeProgressFrom(raw, legacy={}) {
  const data=object(raw), settings=object(data.levels);
  const old=object(legacy.miniRecords);
  const migrate=!Object.prototype.hasOwnProperty.call(data,'byLevel');
  return {
    levels:entries(GAMES,kind=>isLevel(settings[kind])?settings[kind]:DEFAULT_LEVEL),
    album:isAlbum(data.album)?data.album:DEFAULT_ALBUM,
    frameSeen:entries(albums,album=>seen(data.frameSeen?.[album])),
    byLevel:entries(levels,level=>{
      const defaults=migrate&&level===DEFAULT_LEVEL;
      const existing=object(data.byLevel?.[level]);
      const rotation=object(existing.sideRotation??(defaults?legacy.arcadeRotation:null));
      return {
        sideBest:count(existing.sideBest??(defaults?legacy.best:0)),
        sideRotation:{seen:seen(rotation.seen),recent:seen(rotation.recent)},
        lettersBest:count(existing.lettersBest??(defaults?old.letters:0)),
        dropSeen:seen(existing.dropSeen),
        frameBest:entries(albums,album=>count(existing.frameBest?.[album]??(defaults&&album==='catalog'?old.frames:0))),
        ladderBest:Object.fromEntries(Object.entries(object(existing.ladderBest??(defaults?old.ladder:null))).filter(([key,best])=>/^[а-щьюяєіїґ]+-[а-щьюяєіїґ]+$/u.test(key)&&count(best)>0)),
        ladderIndex:count(existing.ladderIndex??(defaults?old.puzzle:0)),
      };
    }),
  };
}
