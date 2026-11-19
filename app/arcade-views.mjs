import { icon } from './icons.mjs';
import { safeUrl } from './engine.mjs';
import { arcadeProgress } from './state.mjs';
import { esc, back, head, eyebrow, act, link, external } from './views.mjs';
import { arcadeDecks, arcadeSize, ROUND_SIZE } from './arcade.mjs';
import { FRAME_ALBUMS, LEVELS, sideDuration } from './arcade-levels.mjs';
import { ALPHABET, DROP_WORDS, FRAME_ROUNDS, dropDecks, dropTurn, frameDecks, frameMax, frameTileCount, frameValue, ladderDecks, ladderWord } from './minigames.mjs';

const games = {
  side: {title:'Свій / Чужий', tag:'01 / Спринт', glyph:'bolt', copy:'Розрізняй українські й російські слова на час.'},
  letters: {title:'Буквопад', tag:'02 / На реакцію', glyph:'bolt', copy:'Лови літери в потрібному порядку. Склади п’ять слів.'},
  frames: {title:'Відкрий кадр', tag:'03 / На впізнавання', glyph:'camera', copy:'Вгадай роботу з каталогу або предмет на ілюстрації.'},
  ladder: {title:'Зміни літеру', tag:'04 / Без таймера', glyph:'puzzle', copy:'Дійди до слова-цілі. За хід міняй одну літеру.'},
};
const selected=kind=>arcadeProgress.levels[kind];
const records=level=>arcadeProgress.byLevel[level];
export const isMiniGame=kind=>kind!=='side' && Object.prototype.hasOwnProperty.call(games,kind);
export const currentLadder=(level=selected('ladder'))=>ladderDecks[level][records(level).ladderIndex%ladderDecks[level].length];
function recordLabel(kind, level=selected(kind), album=arcadeProgress.album) {
  const r=records(level);
  if(kind==='side') return `Рекорд: ${r.sideBest} / ${ROUND_SIZE}`;
  if(kind==='letters') return `Рекорд: ${r.lettersBest} / ${DROP_WORDS} слів`;
  if(kind==='frames') return `Рекорд: ${r.frameBest[album]} / ${frameMax(level)}`;
  const puzzles=ladderDecks[level];
  return `Розв’язано: ${puzzles.filter(p=>r.ladderBest[p.id]).length} / ${puzzles.length}`;
}
const focusTitle=copy=>`<h2 class="mini-focus" tabindex="-1">${copy}</h2>`;
const formatTime=ms=>new Intl.NumberFormat('uk',{maximumFractionDigits:2}).format(ms/1000);
const exit=()=>act('arcade-settings','До налаштувань','btn ghost mini-settings-link','tune');

function art(kind) {
  const labels={side:['RU','UA'],letters:['Ї','Є','К'],ladder:['К','І','Т']}[kind];
  return `<div class="arcade-art arcade-art-${kind}" aria-hidden="true">${labels?labels.map(ch=>`<b>${ch}</b>`).join(''):`<div class="art-frame"><img src="./assets/arcade/fox.webp" alt="" width="352" height="352"><div>${Array.from({length:9},()=>'<i></i>').join('')}</div></div>`}</div>`;
}
export function arcadeLobby() {
  return back()+head('4 мінігри','Аркада','Вибери гру та складність. Рекорди лишаються на цьому пристрої й не впливають на турнір.')+`<div class="arcade-grid">${Object.entries(games).map(([kind,{title,tag,glyph,copy}])=>`<a href="#arcade/${kind}" class="arcade-card arcade-card-${kind}"><div class="arcade-card-copy">${eyebrow(tag,false)}<h2>${title}</h2><p>${copy}</p><span class="arcade-record">${icon('trophy',15)} <span>${LEVELS[selected(kind)].name} · ${recordLabel(kind)}</span></span></div>${art(kind)}<span class="arcade-card-icon">${icon(glyph,18)}</span><span class="arcade-card-arrow">${icon('upRight',17)}</span></a>`).join('')}</div>`;
}

export function miniPage(kind, game) {
  const {title,tag}=games[kind];
  return `<div class="mini-page mini-page-${kind}">${back('arcade','До аркади')}<header class="page-head mini-head">${eyebrow(tag)}<h1>${title}</h1></header><div id="mini-stage">${miniStage(kind,game)}</div><p id="mini-live" role="status" class="mini-sr">${esc(game?.notice)}</p></div>`;
}
export function miniStage(kind, game) {
  if(!game) return miniIntro(kind);
  return kind==='side'?sideView(game):kind==='letters'?dropView(game):kind==='frames'?frameView(game):ladderView(game);
}
const descriptions={
  side:'Українське слово змахуй вправо, російське вліво. На ПК натискай стрілки або кнопки під карткою. У раунді до десяти карток.',
  letters:'Торкнися колонки з потрібною літерою або натисни її номер. За промах або пропуск втрачаєш життя. Склади п’ять слів.',
  frames:'Відкривай плитки або одразу обирай відповідь. За правильну відповідь із меншою кількістю відкритих плиток отримаєш більше балів. У раунді п’ять кадрів.',
  ladder:'Обери позицію, потім нову літеру. Після заміни має вийти слово зі словника гри. Можеш скасувати хід або взяти підказку.',
};
const levelCaption=(kind,level)=>{
  const {side,letters,frames}=LEVELS[level], lives=n=>`${n} ${n===5?'життів':'життя'}`;
  if(kind==='side') return `${lives(side.lives)} · від ${formatTime(sideDuration(level,8))} до ${formatTime(side.time)} с на картку`;
  if(kind==='letters') return `${letters.lanes} колонки · ${lives(letters.lives)} · до ${formatTime(letters.time)} с на літеру`;
  if(kind==='frames') return `${frames.grid} × ${frames.grid} плитки · ${frames.choices} варіанти відповіді`;
  return level==='easy'?'3 літери · 2 або 3 ходи':level==='normal'?'3 або 4 літери · до 5 ходів':'4 або 5 літер · від 4 ходів';
};
function toggle(id,value,label,on) {
  return `<button type="button" class="arcade-toggle" data-act="${id}" data-value="${value}" aria-pressed="${on}">${label}</button>`;
}
function miniIntro(kind) {
  const level=selected(kind), album=arcadeProgress.album;
  const puzzle=kind==='ladder'?currentLadder(level):null;
  const stock=kind==='side'?`${arcadeDecks[level].length} із ${arcadeSize} карток`:kind==='letters'?`Слів на рівні: ${dropDecks[level].length}`:
    kind==='frames'?`Кадрів у добірці: ${frameDecks[album].length}`:`${puzzle.start.toLocaleUpperCase('uk')} → ${puzzle.target.toLocaleUpperCase('uk')}`;
  return `<section class="panel mini-intro arcade-card-${kind}">${art(kind)}<div class="mini-setup"><p>${descriptions[kind]}</p>
    <fieldset class="arcade-choice"><legend>Складність</legend><div>${Object.entries(LEVELS).map(([id,{name}])=>toggle('arcade-level',id,name,level===id)).join('')}</div></fieldset>
    <p class="arcade-level-meta meta">${levelCaption(kind,level)}</p>
    ${kind==='frames'?`<fieldset class="arcade-choice"><legend>Добірка</legend><div>${Object.entries(FRAME_ALBUMS).map(([id,name])=>toggle('frame-album',id,name,album===id)).join('')}</div></fieldset>`:''}
    <div class="mini-start-row">${act(kind==='side'?'game-start':'mini-start',kind==='ladder'?'Почати ланцюжок':'Почати гру','btn primary','play')}<div class="meta"><b>${esc(stock)}</b><span>${recordLabel(kind)}</span></div></div></div></section>`;
}
const resultActions=button=>`<div class="btn-row">${button}${exit()}${link('arcade','До аркади','btn ghost','back')}</div>`;

function sideView(g) {
  if(g.over) return `<section class="panel mini-result">${eyebrow(`Підсумок · ${LEVELS[g.level].name}`)}${focusTitle(`${g.score} / ${ROUND_SIZE}`)}<p>${esc(g.summary)} ${recordLabel('side',g.level)}.</p><div class="result-choices">${g.history.map(h=>`<div><span class="${h.ok?'lime-text':''}">${icon(h.ok?'check':'close',15)}</span><b>${esc(h.word)}</b><span>${esc(h.hint)}</span></div>`).join('')}</div>${resultActions(act('game-start','Зіграти знову'))}</section>`;
  return `<section class="narrow"><div class="quiz-header">${eyebrow(LEVELS[g.level].name)}<span class="meta">${g.index+1} / ${ROUND_SIZE} &nbsp; · &nbsp; життя: ${g.lives}</span></div><div class="game-time"><i id="clock-bar"></i></div><div class="swipe-card" id="swipe-card"><span class="eyebrow">Впізнай мову</span><h2>${esc(g.deck[g.index][0])}</h2><p>← RU &nbsp; · &nbsp; UA →</p></div><div class="game-actions"><button class="btn ghost" data-act="game-ru">${icon('back',18)} Чуже · RU</button>${act('game-ua','Своє · UA')}</div><p class="meta game-hint" aria-live="polite">${esc(g.last || 'Змахни картку або обери бік стрілкою чи кнопкою.')}</p>${exit()}</section>`;
}

function dropView(g) {
  if(g.over) return `<section class="panel mini-result">${eyebrow(g.lives?'Раунд завершено':'Життя скінчилися')}${focusTitle(`${g.solved} / ${DROP_WORDS} слів`)}<p>${esc(g.notice)} ${recordLabel('letters',g.level)}.</p>${resultActions(act('mini-start','Зіграти знову'))}</section>`;
  const {word,clue,art:asset}=dropTurn(g);
  return `<section class="panel mini-panel drop-panel"><div class="mini-top"><span class="count-pill">${icon('layers',15)} Слово ${g.solved+1} / ${DROP_WORDS}</span><span class="count-pill">${icon('heart',15)} Життя: ${g.lives}</span></div>
    <div class="drop-clue">${asset?`<img src="${esc(asset)}" width="64" height="64" alt="">`:''}${focusTitle(esc(clue))}</div>
    <div class="drop-spelling" style="--word-length:${word.length}" aria-label="Літер зібрано: ${g.position} з ${word.length}">${[...word].map((ch,i)=>`<span aria-hidden="true" class="${i===g.position?'active':''}">${i<g.position?esc(ch):''}</span>`).join('')}</div>
    <div class="game-time drop-time" aria-hidden="true"><i id="drop-time-bar"></i></div>
    <div class="drop-board" id="drop-board" style="--drop-lanes:${g.letters.length}" aria-label="Колонки з літерами">${g.letters.map((ch,i)=>`<button class="drop-lane" data-act="drop-pick" data-index="${i}" aria-label="Колонка ${i+1}: ${g.paused?'пауза':ch}" ${g.paused?'disabled':''}><span class="drop-flight"><b>${g.paused?'':ch}</b></span><span class="drop-index" aria-hidden="true">${i+1}</span></button>`).join('')}${g.paused?`<div class="drop-overlay">${act('drop-pause','Продовжити','btn primary','play')}</div>`:''}</div>
    <div class="mini-top drop-foot"><p class="meta">${esc(g.paused?'Гру призупинено.':g.notice||'Торкнися колонки або натисни її номер.')}</p>${g.paused?exit():act('drop-pause','Пауза','btn ghost','clock')}</div></section>`;
}

function frameView(g) {
  if(g.over) return `<section class="panel mini-result">${eyebrow(`Вгадано: ${g.answers.filter(a=>a.correct).length} / ${FRAME_ROUNDS}`)}${focusTitle(`${g.score} / ${frameMax(g.level)} балів`)}<p>${recordLabel('frames',g.level,g.album)}.</p><ul class="mini-frame-results">${g.answers.map(a=>`<li><span>${esc(a.item.title)}</span><b>+${a.points}</b></li>`).join('')}</ul>${resultActions(act('mini-start','Зіграти знову'))}</section>`;
  const {item,choices}=g.deck[g.round], answer=g.answers[g.round];
  const {id,category,author,src,title,artwork,url,action,cue}=item, image=safeUrl(artwork?.image);
  return `<section class="panel mini-panel"><div class="mini-top"><span class="count-pill">Кадр ${g.round+1} / ${FRAME_ROUNDS}</span><span class="count-pill">${icon('trophy',15)} Балів: ${g.score}</span></div><div class="frame-layout">
    <figure class="pair-preview-visual frame-board" data-frame-id="${esc(id)}">
      <div class="pair-preview-media"><div class="frame-image" aria-hidden="true"><img class="pair-preview-cover" src="${esc(src)}" alt="" draggable="false">${image?`<img class="pair-preview-release" data-focus="${esc(artwork.focus)}" src="${esc(image)}" alt="" referrerpolicy="no-referrer" draggable="false">`:''}</div>
        ${answer?'':`<div class="frame-tiles" style="--frame-grid:${LEVELS[g.level].frames.grid}">${Array.from({length:frameTileCount(g.level)},(_,i)=>g.open.includes(i)?'<span aria-hidden="true"></span>':`<button class="frame-tile" data-act="frame-open" data-index="${i}" aria-label="Відкрити плитку ${i+1}"><span>${String(i+1).padStart(2,'0')}</span></button>`).join('')}</div>`}</div>
      ${answer?`<figcaption><span class="frame-local-credit meta">Ілюстрація PhotoCraft</span>${image?`<span class="pair-preview-credit">${external(artwork.source,artwork.label,'text-link')}</span>`:''}</figcaption>`:''}
    </figure><div class="frame-details">${eyebrow(category)}${answer?`${focusTitle(esc(title))}<p class="frame-author">${author?`${esc(author)} · `:''}${answer.correct?'Вгадано':'Не вгадано'} · +${answer.points}</p><p class="muted">${esc(cue)}</p>${url?external(url,action):''}${act('frame-next',g.round+1===FRAME_ROUNDS?'Побачити підсумок':'Наступний кадр')}`:`${focusTitle(g.album==='art'?'Що на малюнку?':'Що на обкладинці?')}<p class="muted">За правильну відповідь: <b id="frame-value">+${frameValue(g)}</b>.</p><div class="frame-choices">${choices.map((p,i)=>`<button class="frame-choice" data-act="frame-guess" data-index="${i}"><span class="frame-digit">${i+1}</span><span><b>${esc(p.title)}</b>${p.author?`<small>${esc(p.author)}</small>`:''}</span></button>`).join('')}</div>`}</div></div>${exit()}</section>`;
}

function ladderView(g) {
  const {puzzle,path,slot,level}=g, count=path.length-1, puzzles=ladderDecks[level], index=puzzles.indexOf(puzzle)+1;
  const upper=word=>esc(word.toLocaleUpperCase('uk'));
  const chain=`<ol class="ladder-chain" aria-label="Твій ланцюжок">${path.map(word=>`<li>${upper(word)}</li>`).join('')}</ol>`;
  if(g.over) return `<section class="panel mini-result">${eyebrow(`Пара ${index} / ${puzzles.length}`)}${focusTitle('Ланцюжок готовий')}${chain}<p>Твої ходи: <b>${count}</b> · Найкоротший шлях: <b>${puzzle.min}</b> · Твій рекорд: <b>${records(level).ladderBest[puzzle.id]}</b></p>${resultActions(act('ladder-next','Наступна пара')+act('mini-start','Повторити пару','btn ghost','play'))}</section>`;
  return `<section class="panel mini-panel ladder-panel"><div class="mini-top"><span class="count-pill">Пара ${index} / ${puzzles.length}</span><span class="count-pill">Ходів: ${count}</span></div>
    <div class="ladder-layout"><aside class="ladder-route"><span class="small-label">Слово-ціль</span><p class="ladder-goal">${upper(puzzle.target)}</p><span class="meta">Найкоротший шлях: ${puzzle.min}</span>${chain}</aside>
      <div class="ladder-edit">${focusTitle('Яку літеру заміниш?')}<div class="ladder-slots" aria-label="Позиція в поточному слові">${[...ladderWord(g)].map((ch,i)=>`<button data-act="ladder-slot" data-index="${i}" aria-label="Позиція ${i+1}, літера ${upper(ch)}" aria-pressed="${slot===i}">${upper(ch)}</button>`).join('')}</div>
        <div class="ladder-keyboard" aria-label="Українська абетка">${ALPHABET.map(ch=>`<button data-act="ladder-letter" data-letter="${ch}">${ch}</button>`).join('')}</div>
        <p class="ladder-feedback muted">${esc(g.notice||'Обери позицію й натисни нову літеру.')}</p><div class="ladder-actions"><button class="btn ghost" data-act="ladder-undo" ${count?'':'disabled'}>${icon('back',16)} Скасувати хід</button>${act('ladder-hint','Підказка','btn ghost','spark')}${act('ladder-next','Інша пара','btn ghost')}</div></div></div>${exit()}</section>`;
}
