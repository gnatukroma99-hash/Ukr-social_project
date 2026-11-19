import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { nextArcadeCard, ROUND_SIZE } from './arcade.mjs';
import { dayAt, validMonth, safeUrl } from './engine.mjs';
import { store, persist, state, session, connect, authAction, disconnect, clubApi, refresh, refreshCatalog, rename, startQuestion, submitAnswer, toggleSaved } from './state.mjs';
import { shell, home, category, savedView, quests, arcadeView, rankView, esc, eyebrow, external } from './views.mjs';
import { profile, authors, menuBody, supportBody, publicIssue } from './community.mjs';
import { icon } from './icons.mjs';

const root = document.querySelector('#shell'), toast = document.querySelector('#toast');
let authTarget=null;
function tournamentRank(){
  const date=new Intl.DateTimeFormat('uk',{timeZone:'Europe/Kyiv',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(session().end);
  return `<div class="page-head">${eyebrow('Шкільний турнір')}<h1>${scores?.closed?'Підсумки турніру':'Рейтинг турніру'}</h1><p>Приймаємо відповіді до ${esc(date)} за Києвом.</p></div><section class="panel"><button class="btn ghost" data-act="rank-refresh">Оновити таблицю</button>${rankError?`<p>${esc(rankError)}</p>`:!scores?'<p>Завантажуємо бали…</p>':`<p>Учасників: ${scores.total}. Твоє місце: ${scores.mine?.rank??'ще немає відповіді'}.</p><div class="table-row table-head"><span>Місце</span><span>Гравець</span><span>Бали</span></div>${scores.rows.map(r=>`<div class="table-row ${r.id===state().player.id?'mine':''}"><span>${r.rank}</span><b>${esc(r.name)}</b><strong>${r.points}</strong></div>`).join('')}`}</section>`;
}
function signIn(step='start'){
  const email=authTarget.email && step==='start'?'<form id="email-start" class="form"><label>Або введи свою пошту<input name="email" type="email" required></label><button class="btn ghost">Отримати код у листі</button></form>':'';
  showModal('Вхід у турнір',step==='start'?`<p class="muted">Бали з телефона й ПК зберігаємо в одному профілі.</p><button class="btn primary" data-act="google">Увійти через Google</button>${email}`:`<form class="form" id="cup-code"><label>${step==='google'?'Скопіюй код зі сторінки після входу Google й встав сюди.':'Введи код із листа.'}<input name="code" required autocomplete="one-time-code" spellcheck="false"></label><button class="btn primary">Увійти</button></form>`,'Реєстрація');
}
let task=null, answer=null, busy=false, host=null, queue=null, reveal=false, game=null, ticker=0, gameTouch=null;
let month=dayAt().slice(0,7), scores=null, rankError='', rankSerial=0, modal=null, toastTimer=0, lastDay=dayAt();
const route = () => { const [page='home', value='']=(location.hash.slice(1)||'home').split('/'); return {page, value}; };
function notify(message) { clearTimeout(toastTimer);const inside=modal?.querySelector('[data-status]');if(inside){inside.hidden=false;inside.textContent=String(message);inside.scrollIntoView({block:'nearest'});return;}toast.textContent=String(message); toast.hidden=false; toastTimer=setTimeout(()=>{toast.hidden=true;},4400); }
function draw(focus=false) {
  const {page,value}=route();
  const openComparisons=new Set(focus?[]:Array.from(root.querySelectorAll('[data-pair-compare][open]'),d=>d.dataset.pairCompare));
  const content = page==='cat'?category(value):page==='saved'?savedView():page==='quests'?quests(task,answer):page==='arcade'?arcadeView(game):page==='rank'?rankView(month,scores,rankError):page==='profile'?profile(host,queue,reveal):page==='authors'?authors():home();
  root.innerHTML=shell(page,page==='rank'&&session()?.tournament?tournamentRank():content);
  if(openComparisons.size)for(const d of root.querySelectorAll('[data-pair-compare]'))d.open=openComparisons.has(d.dataset.pairCompare);
  if(page==='profile'&&session()?.tournament){const panel=root.querySelector('.info-panel');panel.innerHTML=`${eyebrow('Шкільний турнір')}<h2>Учасник: ${esc(state().player.name)}</h2><p>На іншому пристрої увійди в той самий акаунт.</p><a class="btn primary" href="#rank">Відкрити рейтинг</a><button class="btn ghost" data-act="disconnect">Вийти з турніру</button>`;}
  if(page==='profile'){
    const base=session()?.tournament&&store.active.startsWith('https://')?store.active:'https://ukr-socialproject-production.up.railway.app';
    root.querySelector('.info-panel')?.insertAdjacentHTML('beforeend',`<div class="btn-col" style="margin-top:20px">${external(base+'/privacy','Конфіденційність','text-link')}${external(base+'/delete-account','Запит на видалення акаунта турніру','text-link')}</div>`);
  }
  document.title=`${root.querySelector('h1')?.textContent.replace(/\s+/g,' ').trim() || 'Огляд'} · Своє`;
  if(focus){ const main=document.querySelector('#main'); main.focus({preventScroll:true}); window.scrollTo(0,0); }
}
async function loadRank() {
  const token=++rankSerial; scores=null; rankError=''; draw();
  if(!session()) return;
  try { const data=await clubApi(session().tournament?'/api/tournament':`/api/leaderboard?month=${month}`); if(token===rankSerial) scores=data; }
  catch(e){ if(token===rankSerial) rankError=e.message; }
  if(token===rankSerial && route().page==='rank') draw();
}
function stopClock(){ clearInterval(ticker); ticker=0; }
function routeChanged() {
  closeModal(); toast.hidden=true; gameTouch=null; ++rankSerial; const {page}=route();
  if(page!=='quests'){task=null;answer=null;}
  if(page!=='arcade'){stopClock();game=null;}
  if(page!=='profile'){reveal=false;queue=null;}
  draw(true);
  if(page==='rank') void loadRank();
  if(page==='profile' && window.svoieClub) window.svoieClub.status().then(s=>{host=s;if(route().page==='profile')draw();}).catch(()=>{});
  if(page==='cat' && session()) refreshCatalog().then(()=>{if(route().page==='cat')draw();}).catch(()=>{});
}
window.addEventListener('hashchange',routeChanged);

async function openUrl(raw) {
  const url=safeUrl(raw); if(!url) throw Error('Потрібне коректне HTTPS-посилання.');
  if(Capacitor.isNativePlatform()) await Browser.open({url}); else window.open(url,'_blank','noopener,noreferrer');
}

let restoreFocus=null;
function closeModal(){ if(!modal) return; const d=modal;modal=null;document.body.classList.remove('modal-open');d.remove();if(restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});restoreFocus=null; }
function showModal(title,body,kicker='Спільнота') {
  if(!modal){restoreFocus=document.activeElement;modal=document.createElement('dialog');modal.className='dialog';modal.setAttribute('aria-labelledby','dialog-title');document.body.appendChild(modal);document.body.classList.add('modal-open');
    modal.addEventListener('cancel',e=>{e.preventDefault();closeModal();});modal.addEventListener('click',e=>{if(e.target!==modal)return;const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();});}
  modal.innerHTML=`<div class="dialog-head"><div>${eyebrow(kicker)}<h2 id="dialog-title">${esc(title)}</h2></div><button type="button" class="icon-btn" aria-label="Закрити" data-act="close">${icon('close',19)}</button></div>${body}<p class="notice" role="status" data-status hidden></p>`;
  if(!modal.open){if(typeof modal.showModal==='function')modal.showModal();else modal.setAttribute('open','');}
}
function support(tab='feedback'){showModal('Підтримка',supportBody(tab,route().page==='cat'?route().value:'youtube'));}

function startGame(){stopClock();game={deck:[],index:0,score:0,lives:3,history:[],over:false,last:''};nextTick();}
function nextTick(){
  stopClock();const {card,rotation}=nextArcadeCard(store.arcadeRotation);
  const g=game;g.deck.push(card);store.arcadeRotation=rotation;persist();
  g.duration=6500-Math.min(g.index,8)*360;g.until=performance.now()+g.duration;draw();
  const update=()=>{if(game!==g||g.over||route().page!=='arcade'){stopClock();return;}const left=Math.max(0,g.until-performance.now());const bar=document.querySelector('#clock-bar');if(bar)bar.style.transform=`scaleX(${left/g.duration})`;if(!left)pickSide('time');};
  ticker=setInterval(update,55);
}
function pickSide(side){
  if(!game||game.over||!ticker||route().page!=='arcade'||modal)return;
  stopClock();const g=game,[word,language,hint]=g.deck[g.index];const ok=language===side;
  if(ok)g.score++;else g.lives--;g.history.push({word,ok,hint});g.last=`${ok?'Так!':side==='time'?'Час вийшов.':'Не цього разу.'} ${word} · ${language.toUpperCase()}. ${hint}.`;
  g.index++;gameTouch=null;
  if(!g.lives||g.index===ROUND_SIZE){g.over=true;g.summary=g.lives?'Усі десять карток пройдено.':'Життя скінчилися.';store.best=Math.max(store.best,g.score);persist();draw();}
  else nextTick();
}

async function guarded(el,action) {
  if(busy)return;busy=true;const wasDisabled=el?.disabled;
  if(el){el.disabled=true;el.setAttribute('aria-busy','true');}
  try{await action();}catch(e){notify(e.message || 'Не вдалося завершити дію.');}
  finally{busy=false;if(el?.isConnected){el.disabled=!!wasDisabled;el.removeAttribute('aria-busy');}}
}
document.addEventListener('click',async e=>{
  const external=e.target.closest('[data-external]');if(external){e.preventDefault();try{await openUrl(external.href);}catch(err){notify(err.message);}return;}
  const el=e.target.closest('[data-act]');if(!el){if(e.target.closest('.hero a[href="#cat/music"]')){store.vibe='ua';persist();}if(modal&&e.target.closest('a[href^="#"]'))closeModal();if(e.target.closest('.skip-link')){e.preventDefault();document.querySelector('#main')?.focus();}return;}
  e.preventDefault();const act=el.dataset.act;
  if(act==='close'){closeModal();return;}
  if(act==='menu'){showModal('Меню',menuBody(),'Навігація');return;}
  if(act==='support'||act==='suggest'||act==='support-tab'){support(act==='suggest'?'pair':el.dataset.value||'feedback');return;}
  if(act==='browse'){const b=document.querySelector('#branches');b?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});b?.focus({preventScroll:true});return;}
  if(act==='vibe'){store.vibe=el.dataset.value;persist();draw();document.querySelector(`[data-act="vibe"][data-value="${store.vibe}"]`)?.focus({preventScroll:true});return;}
  if(act==='save'){const id=el.dataset.id,added=toggleSaved(id);draw();document.querySelector(`[data-act="save"][data-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true});notify(added?'Пару збережено у профілі.':'Пару вилучено з колекції.');return;}
  if(act==='leave-quest'){task=null;answer=null;draw(true);return;}
  if(act==='game-start'){startGame();return;}
  if(act==='game-exit'){stopClock();game=null;draw(true);return;}
  if(act==='game-ru'||act==='game-ua'){pickSide(act.slice(-2));return;}
  if(act==='rank-refresh'){await loadRank();return;}
  if(act==='reveal'){reveal=!reveal;draw();return;}
  if(act==='draft'){const form=document.querySelector('#support-form');if(form){store.draft=Object.fromEntries(new FormData(form));persist();notify('Чернетку збережено на цьому пристрої.');}return;}
  await guarded(el,async()=>{
    if(act==='google'){const {url}=await authAction(authTarget,'google');authTarget.method='code';signIn('google');await openUrl(url);return;}
    if(act==='start'){const t=await startQuestion();if(route().page==='quests'){task=t;answer=null;draw(true);}return;}
    if(act==='answer'&&task&&!answer){const t=task;const a=await submitAnswer(t,t.question.choices[Number(el.dataset.index)]);if(task===t)answer=a;draw();return;}
    if(act==='disconnect'){if(session()?.tournament){await clubApi('/api/auth/logout','POST',{}).catch(()=>{});delete store.sessions[store.active];}disconnect();reveal=false;scores=null;draw();notify('Особистий режим увімкнено.');return;}
    if(act==='host-start'){host=await window.svoieClub.start();draw();await connect(host.local,state().player.name);draw();notify('Клуб запущено. Адресу для телефона вказано в профілі.');return;}
    if(act==='host-stop'){host=await window.svoieClub.stop();if(store.active===host.local)disconnect();queue=null;draw();notify('Клуб зупинено. Результати збережено.');return;}
    if(act==='review'){queue=await window.svoieClub.queue();draw();return;}
    if(act==='approve'||act==='reject'){await window.svoieClub.review(el.dataset.id,act==='approve');queue=await window.svoieClub.queue();await refreshCatalog().catch(()=>{});draw();notify('Рішення збережено.');}
  });
});

document.addEventListener('submit',e=>{
  const form=e.target;if(!['name-form','connect-form','support-form','cup-code','email-start'].includes(form.id))return;e.preventDefault();
  const body=Object.fromEntries(new FormData(form));
  void guarded(e.submitter||form.querySelector('button[type="submit"]'),async()=>{
    if(form.id==='name-form'){await rename(body.name);draw();notify('Псевдонім збережено.');return;}
    if(form.id==='connect-form'){const target=await connect(body.origin,body.name,body.code);if(target){authTarget=target;signIn();return;}draw();notify('Ти у клубі!');return;}
    if(form.id==='email-start'){authTarget.address=body.email.trim();await authAction(authTarget,'send',{email:authTarget.address});authTarget.method='otp';signIn('otp');return;}
    if(form.id==='cup-code'){await authAction(authTarget,authTarget.method,{email:authTarget.address,code:body.code.trim()});authTarget=null;closeModal();draw();notify('Ти у турнірі.');return;}
    if(body.type==='pair'&&!safeUrl(body.url))throw Error('Посилання на автора має починатися з https://');
    store.draft=body;persist();
    if(session()){await clubApi('/api/support','POST',body);store.draft=null;persist();closeModal();notify('Надіслано модератору клубу.');}
    else {await openUrl(publicIssue(body));notify('Чернетку збережено. Підтвердь надсилання на GitHub.');}
  });
});
document.addEventListener('change',e=>{if(e.target.id==='rank-month'&&validMonth(e.target.value)){month=e.target.value;void loadRank();}});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&modal){e.preventDefault();closeModal();return;}
  if(modal||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.repeat)return;
  if(route().page==='arcade'&&game&&!game.over&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();pickSide(e.key==='ArrowLeft'?'ru':'ua');}
  if(route().page==='quests'&&task&&!answer&&/^[1-4]$/.test(e.key))document.querySelector(`[data-act="answer"][data-index="${Number(e.key)-1}"]`)?.click();
});
document.addEventListener('pointerdown',e=>{const card=e.target.closest('#swipe-card');if(card&&e.isPrimary){gameTouch={id:e.pointerId,x:e.clientX,y:e.clientY,index:game?.index};card.setPointerCapture?.(e.pointerId);}});
document.addEventListener('pointerup',e=>{const t=gameTouch;gameTouch=null;if(!t||t.id!==e.pointerId||game?.index!==t.index)return;const dx=e.clientX-t.x;if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(e.clientY-t.y))pickSide(dx>0?'ua':'ru');});
document.addEventListener('pointercancel',()=>{gameTouch=null;});

async function dayCheck(){const today=dayAt();if(today===lastDay)return;lastDay=today;task=null;answer=null;month=today.slice(0,7);try{await refresh();}catch(e){notify(e.message);}draw();if(route().page==='rank')void loadRank();}
setInterval(()=>void dayCheck(),15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void dayCheck();});
routeChanged();
if(session())refresh().then(()=>{if(!task&&!game&&!modal)draw();}).catch(e=>notify(e.message));
