import { icon, clueMarkup } from './icons.mjs';
import { categories } from './data.mjs';
import { store, state, allPairs, session, otherModeToday, localPoints } from './state.mjs';
import { dayAt, dayLabel, monthLabel, shiftMonth, deckFor, totalPoints, safeUrl } from './engine.mjs';

export const esc = v => String(v ?? '').replace(/[&<>"']/g, x => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[x]));
export const repo = 'https://github.com/gnatukroma99-hash/Ukr-social_project';
export const external = (url, label, cls='btn ghost') => safeUrl(url) ? `<a class="${cls}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer" data-external>${esc(label)} ${icon('upRight',16)}</a>` : '';
export const link = (destination, label, cls='btn primary', symbol='arrow') => `<a class="${cls}" href="#${destination}">${esc(label)} ${icon(symbol,17)}</a>`;
export const act = (id, label, cls='btn primary', symbol='arrow') => `<button class="${cls}" data-act="${id}">${esc(label)} ${icon(symbol,17)}</button>`;
export const eyebrow = (text, dot=true) => `<div class="eyebrow">${dot ? '<i></i>' : ''}${esc(text)}</div>`;
export const back = (route='home', text='На головну') => `<a class="back" href="#${route}">${icon('back',16)} ${esc(text)}</a>`;
export const empty = (glyph, title, text, cta='') => `<div class="empty"><span class="empty-ico">${icon(glyph,27)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${cta}</div>`;
export const head = (kicker, title, copy) => `<div class="page-head">${eyebrow(kicker)}<h1>${esc(title)}</h1><p>${esc(copy)}</p></div>`;
const bars = n => `<span class="bars" role="img" aria-label="${n} з 5 виконано">${Array.from({length:5},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;
const nav = [['home','home','Огляд'],['quests','flag','Квести'],['arcade','game','Аркада'],['rank','trophy','Рейтинг']];
const navLinks = active => nav.map(([path,symbol,name])=>`<a class="navlink ${active === path?'current':''}" ${active === path?'aria-current="page"':''} href="#${path}">${icon(symbol,17)}<span>${name}</span></a>`).join('');
export function shell(page, content) {
  const {player,done,streak} = state(), active = page === 'cat' ? 'home' : page;
  return `<header class="site-header"><div class="header-wrap"><a class="brand" href="#home" aria-label="Своє — головна"><img src="./assets/mark.svg" width="34" height="34" alt=""><span>своє<span class="brand-dot">.</span></span></a>
    <nav aria-label="Основна навігація" class="desktop-nav">${navLinks(active)}</nav><div class="header-side"><a class="head-progress" href="#quests" title="Щоденні квести">${icon('flag',15)} ${done.length}/5</a><a href="#quests" class="streak" title="Серія завершених днів">${icon('flame',17)} ${streak}</a><a href="#profile" class="avatar" aria-label="Профіль: ${esc(player.name)}">${esc([...player.name][0]?.toLocaleUpperCase('uk') || 'С')}</a></div></div></header>
    <main id="main" class="wrap" tabindex="-1">${content}</main>
    <footer class="footer wrap"><span class="footer-brand"><img alt="" width="20" height="20" src="./assets/mark.svg">Поважайте своє</span><div><button data-act="support">${icon('heart',15)} Підтримка</button><a href="#authors">Автори ${icon('upRight',13)}</a></div></footer>
    <nav class="mobile-nav" aria-label="Нижня навігація">${navLinks(active)}<button class="navlink ${['profile','authors','saved'].includes(page)?'current':''}" data-act="menu">${icon('dots',18)}<span>Меню</span></button></nav>`;
}

function directionCard(c, index) {
  return `<a class="category ${c.color}" href="#cat/${c.id}">
    <img class="direction-cover" src="./assets/directions/${c.id}.webp" alt="" width="480" height="480">
    <div class="direction-details"><div class="direction-meta" aria-hidden="true"><span>${String(index+1).padStart(2,'0')} / 06</span>${icon('upRight',16)}</div><h3>${esc(c.name)}</h3><p>${esc(c.copy)}</p></div>
  </a>`;
}

export function home() {
  const { day, done } = state(), n = done.length;
  return `<div class="home-hero"><section class="hero"><div class="hero-art" aria-hidden="true"></div><div class="hero-body">${eyebrow('У навушниках')}<h1>Поважайте<br><em>своє<span>.</span></em></h1><p>Сьогодні слухаємо «Касету» SadSvit.<br>Почни з басу у вступі.</p>${link('cat/music','Платина → SadSvit','btn primary','upRight')}</div><span class="hero-imprint">SadSvit &nbsp;/&nbsp; Касета</span></section>
    <section class="daily-tile"><div class="row between"><span class="eyebrow violet-text"><i></i> Квест дня</span><span class="flag-tag">${icon('flag',19)}</span></div><div><p class="daily-date">${esc(dayLabel(day))} · за Києвом</p><h2>Щоденна п’ятірка</h2><p class="muted daily-copy">Обери переклад, виправ фразу й розгадай ребуси.</p></div><div class="daily-progress"><div class="row between"><strong>${n} <small>/ 5</small></strong><span class="meta">виконано</span></div>${bars(n)}</div>${link('quests', n===5?'Мій результат':n?'Продовжити':'До квестів', 'btn quest-btn')}</section></div>
    <section id="branches" tabindex="-1" class="branches"><div class="section-top"><div>${eyebrow('Каталог / 01',false)}<h2>Обери свій напрям</h2></div><span class="count-pill">${icon('layers',14)} 06 напрямів</span></div><div class="category-grid">${categories.map(directionCard).join('')}</div></section>
    <div class="home-strip"><div class="row"><span class="strip-icon">${icon('game',25)}</span><div><span class="eyebrow">Аркада / 02</span><h3>П’ять мініігор</h3><p>Відгадай слово за літерами або побудуй ланцюжок між двома словами.</p></div></div>${link('arcade','До аркади','btn ghost')}</div>`;
}

const communityCovers = {youtube:'yt-1.webp',shorts:'sh-2.webp',music:'mu-2.webp',instagram:'in-2.webp',art:'ar-4.webp',games:'gm-1.webp'};
function pairBookmark(p) {
  const saved = store.saved.includes(p.id);
  return `<button type="button" class="icon-btn ${saved?'is-saved':''}" data-act="save" data-id="${esc(p.id)}" aria-pressed="${saved}" aria-label="${saved?'Вилучити зі збереженого':'Зберегти пару'}">${icon('save',18)}</button>`;
}
function pairCard(p) {
  const { cover = communityCovers[p.category] || 'ar-4.webp', title, meta, cue, artwork, url = p.url, action = p.action } = p.preview || {};
  const releaseImage = safeUrl(artwork?.image);
  const glyph = categories.find(c=>c.id===p.category)?.icon || 'layers';
  return `<article class="pair pair-preview">
    <figure class="pair-preview-visual">
      <div class="pair-preview-media">
        <img class="pair-preview-cover" src="./assets/covers/${encodeURIComponent(cover)}" width="640" height="640" alt="" loading="lazy" decoding="async">
        ${releaseImage ? `<img class="pair-preview-release" data-focus="${esc(artwork.focus)}" src="${esc(releaseImage)}" alt="${esc(artwork.alt)}" aria-hidden="true" referrerpolicy="no-referrer" loading="lazy" decoding="async">` : ''}
      </div>
      ${releaseImage ? `<figcaption class="pair-preview-credit">${external(artwork.source,artwork.label,'text-link')}</figcaption>` : ''}
    </figure>
    <div class="pair-preview-body">
      <div class="pair-preview-head"><div><span class="small-label lime-text">${p.vibe==='ua'?'Український автор':'Наші у світі'}</span><h3>${esc(p.to)}</h3></div>${pairBookmark(p)}</div>
      <div class="pair-preview-context"><span class="pair-preview-source">Звичне: <b>${esc(p.from)}</b></span><span class="format">${esc(p.format)}</span></div>
      ${title ? `<div class="pair-preview-track"><span class="pair-preview-note">${icon(glyph,20)}</span><div><span class="small-label">З чого почати</span><div class="pair-preview-trackline"><strong>${esc(title)}</strong><span>${esc(meta)}</span></div><p>${esc(cue)}</p></div></div>` : ''}
      ${external(url,action,'btn primary pair-preview-listen')}
      <details class="pair-preview-compare" data-pair-compare="${esc(p.id)}"><summary>Чим схожі? ${icon('arrow',15)}</summary><p>${esc(p.description)}</p></details>
    </div>
  </article>`;
}
export function category(id) {
  const c = categories.find(a=>a.id===id); if(!c) return empty('layers','Такого напряму немає','Повернися до каталогу.',link('home','До каталогу'));
  const pairs = allPairs().filter(p=>p.category===id && (store.vibe==='all'|| p.vibe===store.vibe)), i = categories.indexOf(c);
  return `${back()}<div class="page-head cat-head ${c.color}"><div>${eyebrow(`Каталог / 0${i+1}`)}<h1>${esc(c.name)}</h1><p>${esc(c.copy)}. Від звичного — до свого.</p></div><span class="big-tile">${icon(c.icon,39)}</span></div><div class="filter-row"><span class="filter-label">${icon('tune',16)} Свій вайб</span><div class="tabs" aria-label="Фільтр авторів">${[['all','Усі'],['ua','Тільки українською'],['world','Наші у світі · ENG/UA']].map(([v,n])=>`<button data-act="vibe" data-value="${v}" aria-pressed="${store.vibe===v}" class="${store.vibe===v?'selected':''}">${n}</button>`).join('')}</div></div><div class="pairs">${pairs.length ? pairs.map(pairCard).join('') : empty('layers','Поки немає пар','Спробуй інший вайб або запропонуй свого автора.')}</div><div class="end-cta"><span>Знаєш ще одну влучну пару?</span>${act('suggest','Запропонувати аналог','btn ghost','chat')}</div>`;
}
export function savedView() {
  const pairs = allPairs().filter(p=>store.saved.includes(p.id));
  return back('profile','До профілю') + head('Моя колекція','Збережені пари','Автори, до яких хочеться повернутися.') + (pairs.length ? `<div class="pairs">${pairs.map(pairCard).join('')}</div>` : empty('save','Колекція ще порожня','Натисни закладку біля імені автора у будь-якій парі.',link('home','До каталогу')));
}

const kinds = { translate:['Переклад','book'], riddle:['Мальований ребус','puzzle'], context:['Контекст-батл','chat'] };
export function quests(task, answer) {
  const { day, done, streak } = state(), n = done.length;
  if(task && (task.day!==day || (!answer && task.slot!==n))) task = null;
  if(task) {
    const q=task.question, [kind,glyph]=kinds[q.kind], prompt=esc(q.prompt).replace(/\[([^\]]+)\]/g,'<mark>$1</mark>');
    return `<div class="narrow">${act('leave-quest','До п’ятірки','back','back')}<div class="quiz-header"><span class="eyebrow"><i></i>${kind}</span><span class="meta">Завдання ${task.slot+1} / 5</span></div>${bars(n)}<div class="quiz-box">${q.clue?clueMarkup(q.clue):`<span class="empty-ico">${icon(glyph,24)}</span>`}<p class="quiz-lead">${q.kind==='translate'?'Як це сказати українською?':q.kind==='context'?'Заміни виділений фрагмент':'Розгадай за підказкою'}</p><h1 class="question">${q.kind==='translate'?`«${prompt}»`:prompt}</h1><div class="choices">${q.choices.map((v,i)=>`<button class="choice ${answer && v===answer.expected?'right':''} ${answer && !answer.correct && v===answer.choice?'wrong':''}" data-act="answer" data-index="${i}" ${answer?'disabled':''}><span>${i+1}</span>${esc(v)}${answer&&v===answer.expected?icon('check',18):''}</button>`).join('')}</div>${answer?`<div role="status" class="answer-note ${answer.correct?'correct':'incorrect'}"><strong>${answer.correct?'Правильно!':'Запам’ятай на майбутнє'} · +${answer.points} балів</strong><p>${esc(answer.explanation)}</p>${answer.speed?`<small>За швидкість: +${answer.speed}.</small>`:''} ${answer.bonus?`<small>За серію: +${answer.bonus}.</small>`:''}</div>${act(n===5?'leave-quest':'start',n===5?'Побачити результат':'Наступне завдання')}`:''}</div></div>`;
  }
  const deck=deckFor(day), blocked=otherModeToday();
  return back() + head('Практика / 05','Щоденна п’ятірка',`${dayLabel(day)} · нова серія опівночі за Києвом.`) + `<div class="split"><section class="panel"><div class="row between"><h2>${n===5?'П’ятірку завершено':'Маршрут на сьогодні'}</h2><span class="count-pill">${n} / 5</span></div>${bars(n)}<div class="steps">${deck.map((q,i)=>`<div class="step ${i===n?'next':''}"><span class="step-icon">${icon(done[i]?(done[i].correct?'check':'book'):kinds[q.kind][1],18)}</span><div><strong>${kinds[q.kind][0]}</strong><small>${done[i]?esc(done[i].expected):i===n?'Наступне завдання':'Далі в серії'}</small></div><span class="step-no">${done[i]?`+${done[i].points}`:`0${i+1}`}</span></div>`).join('')}</div>${blocked?`<p class="notice">Сьогоднішню серію розпочато в іншому профілі. Повернися до нього, щоб продовжити.</p>${link('profile','До профілю','btn ghost')}`:n===5?link('arcade','Зіграти в аркаду'):act('start',n?'Продовжити серію':'Почати п’ятірку')}</section><aside class="panel info-panel">${eyebrow('Як рахуються бали')}<h2>${n===5?`${totalPoints(done)} балів сьогодні`:'Одна відповідь — один шанс'}</h2><p>Правильна відповідь дає <b>20 балів</b>. За ребус — ще 5 балів до 8 секунд або 3 бали до 15 секунд.</p><p>Заверши всі п’ять, щоб продовжити серію. Бонус за день: 5 × довжина серії, до 35 балів.</p><div class="stat-line">${icon('flame',18)} Днів поспіль <b>${streak}</b></div><div class="stat-line">${icon('trophy',18)} Балів сьогодні <b>${totalPoints(done)}</b></div>${!session()?`<p class="notice">Граєш особисто. Для спільного рейтингу приєднайся до клубу перед першою відповіддю дня.</p>${link('profile','До профілю','text-link')}`:''}</aside></div>`;
}

export function rankView(month, data, error) {
  const s=state(), current=dayAt().slice(0,7), isClub=!!session();
  const selects=Array.from(new Set([current,...Array.from({length:11},(_,i)=>shiftMonth(current,-i-1)),...s.awards.map(a=>a.month),month])).sort().reverse();
  return back()+head('Спільнота / Рейтинг','Топ-100 місяця','П’ять завдань щодня. Один спільний залік до кінця місяця.')+`<div class="split"><section class="panel"><div class="row between wrap-row"><h2>${isClub?'Таблиця клубу':'Особистий результат'}</h2><select id="rank-month" aria-label="Місяць рейтингу">${selects.map(m=>`<option value="${m}" ${month===m?'selected':''}>${esc(monthLabel(m))}</option>`).join('')}</select></div>${!isClub?`<div class="personal-score"><span class="empty-ico">${icon('trophy',25)}</span><strong>${localPoints(month)}</strong><p>балів за ${esc(monthLabel(month))}</p></div><p class="muted">Щоб змагатися з іншими, під’єднайся до клубу. Особисті тренування зберігаються на цьому пристрої.</p>${link('profile','Приєднатися до клубу')}`:error?empty('signal','Не вдалося оновити рейтинг',error,act('rank-refresh','Спробувати знову','btn ghost')):!data?'<p class="muted" role="status">Завантажуємо результати…</p>':!data.rows.length?empty('flag','Поки немає результатів',data.closed?'Цього місяця у клубі не було відповідей.':'Перший результат з’явиться після першої відповіді.',!data.closed?link('quests','До квестів'):''):`<p class="meta">${data.closed?'Підсумковий рейтинг':'Поточний рейтинг'} · учасників: ${data.total}</p><div class="leader-table" role="table" aria-label="Топ-100"><div class="table-row table-head" role="row"><span role="columnheader">Місце</span><span role="columnheader">Гравець</span><span role="columnheader">Бали</span></div>${data.rows.map(r=>`<div class="table-row ${r.id===s.player.id?'mine':''}" role="row"><span role="cell">${r.rank}</span><b role="cell">${esc(r.name)} ${r.id===s.player.id?'<small>ти</small>':''}</b><strong role="cell">${r.points}</strong></div>`).join('')}</div>${data.mine?.rank>100?`<p>Твоє місце: ${data.mine.rank} · ${data.mine.points} балів</p>`:''}`}</section><aside class="panel info-panel"><span class="badge-art">${icon('medal',44)}</span>${eyebrow('Нагорода місяця')}<h2>Майстер слова</h2><p>Перша сотня отримує бейдж із місцем і місяцем та пріоритет для своїх пропозицій у каталозі. Відзнаки залишаються в профілі.</p><p>За рівних балів вище той, у кого більше правильних відповідей, а далі — той, хто раніше набрав результат.</p></aside></div>`;
}
