import { categories } from './data.mjs';
import { icon } from './icons.mjs';
import { safeUrl } from './engine.mjs';
import { store } from './state.mjs';
import { esc, back, head, eyebrow, act, link, external } from './views.mjs';
import { ALPHABET, DROP_WORDS, FRAME_ROUNDS, FRAME_TILES, dropTurn, frameValue, ladderPuzzles, ladderWord } from './minigames.mjs';

const games = {
  side: {title:'Свій / Чужий', tag:'01 / Спринт', glyph:'bolt', copy:'Розрізняй українські й російські слова на час.'},
  letters: {title:'Буквопад', tag:'02 / На реакцію', glyph:'bolt', copy:'Лови літери в потрібному порядку. Склади п’ять слів.'},
  frames: {title:'Відкрий кадр', tag:'03 / На впізнавання', glyph:'camera', copy:'Вгадай роботу з каталогу за шматочками обкладинки.'},
  ladder: {title:'Зміни літеру', tag:'04 / Без таймера', glyph:'puzzle', copy:'Дійди до слова-цілі. За хід міняй одну літеру.'},
};
const maxFrameScore=FRAME_ROUNDS*FRAME_TILES;
const records=()=>store.miniRecords;
export const isMiniGame=kind=>kind!=='side' && Object.hasOwn(games,kind);
export const currentLadder=()=>ladderPuzzles[records().puzzle] || ladderPuzzles[0];
const recordLabel=kind=>kind==='side'?`Рекорд: ${store.best} / 10`:kind==='letters'?`Рекорд: ${records().letters} / ${DROP_WORDS} слів`:kind==='frames'?`Рекорд: ${records().frames} / ${maxFrameScore}`:`Розв’язано: ${Object.keys(records().ladder).length} / ${ladderPuzzles.length}`;
const focusTitle=copy=>`<h2 class="mini-focus" tabindex="-1">${copy}</h2>`;

function art(kind) {
  const labels={side:['RU','UA'],letters:['Ї','Є','К'],ladder:['К','І','Т']}[kind];
  return `<div class="arcade-art arcade-art-${kind}" aria-hidden="true">${labels?labels.map(ch=>`<b>${ch}</b>`).join(''):`<div class="art-frame"><img src="./assets/covers/mu-1.webp" alt="" width="640" height="640"><div>${Array.from({length:9},()=>'<i></i>').join('')}</div></div>`}</div>`;
}
export function arcadeLobby() {
  return back()+head('4 мінігри','Аркада','Грай без входу. Твої рекорди зберігаються на цьому пристрої й не впливають на турнір.')+`<div class="arcade-grid">${Object.entries(games).map(([kind,{title,tag,glyph,copy}])=>`<a href="#arcade/${kind}" class="arcade-card arcade-card-${kind}"><div class="arcade-card-copy">${eyebrow(tag,false)}<h2>${title}</h2><p>${copy}</p><span class="arcade-record">${icon('trophy',15)} ${recordLabel(kind)}</span></div>${art(kind)}<span class="arcade-card-icon">${icon(glyph,18)}</span><span class="arcade-card-arrow">${icon('upRight',17)}</span></a>`).join('')}</div>`;
}

export function miniPage(kind, game) {
  const {title,tag}=games[kind];
  return `<div class="mini-page mini-page-${kind}">${back('arcade','До аркади')}<header class="page-head mini-head">${eyebrow(tag)}<h1>${title}</h1></header><div id="mini-stage">${miniStage(kind,game)}</div><p id="mini-live" role="status" class="mini-sr">${esc(game?.notice)}</p></div>`;
}
export function miniStage(kind, game) {
  if(!game) return miniIntro(kind);
  return kind==='letters'?dropView(game):kind==='frames'?frameView(game):ladderView(game);
}
function miniIntro(kind) {
  const [title,copy]=kind==='letters'?['Лови літери','Прочитай підказку й торкнися колонки з потрібною літерою. На клавіатурі натискай 1, 2 або 3. За промах або пропуск втрачаєш життя.']:
    kind==='frames'?['Вгадай за обкладинкою','Відкривай плитки й обирай одну з трьох робіт. Що менше плиток відкриєш до правильної відповіді, то більше балів отримаєш. За раунд побачиш п’ять обкладинок.']:
    ['Побудуй ланцюжок','Обери позицію, потім нову літеру. Після заміни має вийти слово зі словника гри. Можеш скасувати хід або взяти підказку.'];
  const puzzle=currentLadder();
  return `<section class="panel mini-intro arcade-card-${kind}">${art(kind)}<div><h2>${title}</h2><p>${copy}</p>${kind==='ladder'?`<p><b>${esc(puzzle.start.toLocaleUpperCase('uk'))} → ${esc(puzzle.target.toLocaleUpperCase('uk'))}</b></p>`:''}${act('mini-start',kind==='ladder'?'Почати ланцюжок':'Почати гру')}<small class="block-meta">${recordLabel(kind)}</small></div></section>`;
}
const resultActions=button=>`<div class="btn-row">${button}${link('arcade','До аркади','btn ghost','back')}</div>`;

function dropView(g) {
  if(g.over) return `<section class="panel mini-result">${eyebrow(g.lives?'Раунд завершено':'Життя скінчилися')}${focusTitle(`${g.solved} / ${DROP_WORDS} слів`)}<p>${esc(g.notice)} ${recordLabel('letters')}.</p>${resultActions(act('mini-start','Зіграти знову'))}</section>`;
  const {word,clue,art:asset}=dropTurn(g);
  return `<section class="panel mini-panel drop-panel"><div class="mini-top"><span class="count-pill">${icon('layers',15)} Слово ${g.solved+1} / ${DROP_WORDS}</span><span class="count-pill">${icon('heart',15)} Життя: ${g.lives}</span></div>
    <div class="drop-clue">${asset?`<img src="./assets/ink/${asset}.png" width="54" height="54" alt="">`:''}${focusTitle(esc(clue))}</div>
    <div class="drop-spelling" aria-label="Літер зібрано: ${g.position} з ${word.length}">${[...word].map((ch,i)=>`<span aria-hidden="true" class="${i===g.position?'active':''}">${i<g.position?esc(ch):''}</span>`).join('')}</div>
    <div class="game-time drop-time" aria-hidden="true"><i id="drop-time-bar"></i></div>
    <div class="drop-board" id="drop-board" aria-label="Три колонки з літерами">${g.letters.map((ch,i)=>`<button class="drop-lane" data-act="drop-pick" data-index="${i}" aria-label="Колонка ${i+1}: ${g.paused?'пауза':ch}" ${g.paused?'disabled':''}><span class="drop-flight"><b>${g.paused?'':ch}</b></span><span class="drop-index" aria-hidden="true">${i+1}</span></button>`).join('')}${g.paused?`<div class="drop-overlay">${act('drop-pause','Продовжити','btn primary','play')}</div>`:''}</div>
    <div class="mini-top drop-foot"><p class="meta">${esc(g.paused?'Гру призупинено.':g.notice||'Торкнися колонки або натисни 1, 2 чи 3.')}</p>${g.paused?'':act('drop-pause','Пауза','btn ghost','clock')}</div></section>`;
}

function frameView(g) {
  if(g.over) return `<section class="panel mini-result">${eyebrow(`Вгадано: ${g.answers.filter(a=>a.correct).length} / ${FRAME_ROUNDS}`)}${focusTitle(`${g.score} / ${maxFrameScore} балів`)}<p>${recordLabel('frames')}.</p><ul class="mini-frame-results">${g.answers.map(a=>`<li><span>${esc(a.pair.preview.title)}</span><b>+${a.points}</b></li>`).join('')}</ul>${resultActions(act('mini-start','Зіграти знову'))}</section>`;
  const {pair,choices}=g.deck[g.round], answer=g.answers[g.round];
  const {cover,title,artwork,url,action,cue}=pair.preview, image=safeUrl(artwork?.image);
  const category=categories.find(c=>c.id===pair.category)?.name;
  return `<section class="panel mini-panel"><div class="mini-top"><span class="count-pill">Кадр ${g.round+1} / ${FRAME_ROUNDS}</span><span class="count-pill">${icon('trophy',15)} Балів: ${g.score}</span></div><div class="frame-layout">
    <figure class="pair-preview-visual frame-board" data-frame-id="${esc(pair.id)}">
      <div class="pair-preview-media"><div class="frame-image" aria-hidden="true"><img class="pair-preview-cover" src="./assets/covers/${encodeURIComponent(cover)}" alt="" width="640" height="640" draggable="false">${image?`<img class="pair-preview-release" src="${esc(image)}" alt="" referrerpolicy="no-referrer" draggable="false">`:''}</div>
        ${answer?'':`<div class="frame-tiles">${Array.from({length:FRAME_TILES},(_,i)=>g.open.includes(i)?'<span aria-hidden="true"></span>':`<button class="frame-tile" data-act="frame-open" data-index="${i}" aria-label="Відкрити плитку ${i+1}"><span>${`0${i+1}`}</span></button>`).join('')}</div>`}</div>
      ${answer?`<figcaption><span class="frame-local-credit meta">Ілюстрація PhotoCraft</span>${image?`<span class="pair-preview-credit">${external(artwork.source,artwork.label,'text-link')}</span>`:''}</figcaption>`:''}
    </figure><div class="frame-details">${eyebrow(category)}${answer?`${focusTitle(esc(title))}<p class="frame-author">${esc(pair.to)} · ${answer.correct?'Вгадано':'Не вгадано'} · +${answer.points}</p><p class="muted">${esc(cue)}</p>${external(url,action)}${act('frame-next',g.round+1===FRAME_ROUNDS?'Побачити підсумок':'Наступний кадр')}`:`${focusTitle('Що на обкладинці?')}<p class="muted">За правильну відповідь: <b id="frame-value">+${frameValue(g)}</b>. Відкрий ще плитку або обери роботу.</p><div class="frame-choices">${choices.map((p,i)=>`<button class="frame-choice" data-act="frame-guess" data-index="${i}"><span class="frame-digit">${i+1}</span><span><b>${esc(p.preview.title)}</b><small>${esc(p.to)}</small></span></button>`).join('')}</div>`}</div></div></section>`;
}

function ladderView(g) {
  const {puzzle,path,slot}=g, count=path.length-1, index=ladderPuzzles.indexOf(puzzle)+1;
  const upper=word=>esc(word.toLocaleUpperCase('uk'));
  const chain=`<ol class="ladder-chain" aria-label="Твій ланцюжок">${path.map(word=>`<li>${upper(word)}</li>`).join('')}</ol>`;
  if(g.over) return `<section class="panel mini-result">${eyebrow(`Пара ${index} / ${ladderPuzzles.length}`)}${focusTitle('Ланцюжок готовий')}${chain}<p>Твої ходи: <b>${count}</b> · Найкоротший шлях: <b>${puzzle.min}</b> · Твій рекорд: <b>${records().ladder[puzzle.id]}</b></p>${resultActions(act('ladder-next','Наступна пара')+act('mini-start','Повторити пару','btn ghost','play'))}</section>`;
  return `<section class="panel mini-panel ladder-panel"><div class="mini-top"><span class="count-pill">Пара ${index} / ${ladderPuzzles.length}</span><span class="count-pill">Ходів: ${count}</span></div>
    <div class="ladder-layout"><aside class="ladder-route"><span class="small-label">Слово-ціль</span><p class="ladder-goal">${upper(puzzle.target)}</p><span class="meta">Найкоротший шлях: ${puzzle.min}</span>${chain}</aside>
      <div class="ladder-edit">${focusTitle('Яку літеру заміниш?')}<div class="ladder-slots" aria-label="Позиція в поточному слові">${[...ladderWord(g)].map((ch,i)=>`<button data-act="ladder-slot" data-index="${i}" aria-label="Позиція ${i+1}, літера ${upper(ch)}" aria-pressed="${slot===i}">${upper(ch)}</button>`).join('')}</div>
        <div class="ladder-keyboard" aria-label="Українська абетка">${ALPHABET.map(ch=>`<button data-act="ladder-letter" data-letter="${ch}">${ch}</button>`).join('')}</div>
        <p class="ladder-feedback muted">${esc(g.notice||'Обери позицію й натисни нову літеру.')}</p><div class="ladder-actions"><button class="btn ghost" data-act="ladder-undo" ${count?'':'disabled'}>${icon('back',16)} Скасувати хід</button>${act('ladder-hint','Підказка','btn ghost','spark')}${act('ladder-next','Інша пара','btn ghost')}</div></div></div></section>`;
}
