export const APPEARANCE_KEY='svoie.appearance.v1';
export const palettes={
  dark:{name:'Темна',description:'Графіт і лайм',colors:['#24232d','#474055','#d3fa73'],scheme:'dark',chrome:'#151419'},
  light:{name:'Світла',description:'Папір і чорнило',colors:['#fcfaf3','#e3dfd0','#365844'],scheme:'light',chrome:'#faf8f0'},
  tide:{name:'Приплив',description:'Індиго й бірюза',colors:['#394d89','#205866','#83e5c9'],scheme:'dark',chrome:'#132a3d'},
  dusk:{name:'Сутінки',description:'Слива й лаванда',colors:['#663b60','#423675','#d6b4ff'],scheme:'dark',chrome:'#302339'},
  dawn:{name:'Світанок',description:'Абрикос і пелюстка',colors:['#ffcda5','#f3c1ce','#854046'],scheme:'light',chrome:'#ffebdf'},
};
const valid=id=>typeof id==='string' && Object.prototype.hasOwnProperty.call(palettes,id);
export function applyPalette(id,remember=true){
  if(!valid(id))return false;
  const {scheme,chrome}=palettes[id],root=document.documentElement;
  root.dataset.theme=id;root.dataset.scheme=scheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',chrome);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content',scheme);
  if(remember)try{localStorage.setItem(APPEARANCE_KEY,id);}catch{/* Still apply in memory. */}
  return true;
}
export function restorePalette(){
  let id;try{id=localStorage.getItem(APPEARANCE_KEY);}catch{}
  applyPalette(valid(id)?id:'dark',false);
}
