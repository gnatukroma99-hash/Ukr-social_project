import * as js from '../../app/arcade-progress.mjs';
import {rust} from './runtime.mjs';

export * from '../../app/arcade-progress.mjs';
export function arcadeProgressFrom(raw,legacy={}){
  if(rust){
    // Pass only old arcade fields, never the profile's sessions or tokens.
    const {best,arcadeRotation,miniRecords}=legacy;
    const data=rust.restoreArcade(JSON.stringify(raw??null),JSON.stringify({best,arcadeRotation,miniRecords}));
    if(data!==undefined)return JSON.parse(data);
  }
  return js.arcadeProgressFrom(raw,legacy);
}
