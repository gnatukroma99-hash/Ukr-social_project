// Exercise the actual Electron renderer in an isolated, disposable profile.
const {app}=require('electron');
const {mkdtempSync,mkdirSync,writeFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const folder=mkdtempSync(path.join(tmpdir(),'svoie-ui-'));
app.setPath('userData',folder);
const {createWindow,registerClub}=require('../desktop/main.cjs');
const watchdog=setTimeout(()=>{console.error('Renderer check exceeded 45 seconds');app.exit(1);},45000);
app.whenReady().then(async()=>{
  registerClub();const window=createWindow();window.setContentSize(1280,920);
  const web=window.webContents,errors=[];web.setBackgroundThrottling(false);
  web.on('console-message',(e)=>{if(e.level==='error')errors.push(e.message);});
  await new Promise(resolve=>web.once('did-finish-load',resolve));
  console.log('Renderer loaded');
  const js=code=>web.executeJavaScript(code,true);
  const wait=async expr=>{
    const result=await js(`new Promise(resolve=>{const until=Date.now()+5000;const poll=()=>{if(${expr})resolve(true);else if(Date.now()>until)resolve(false);else setTimeout(poll,25);};poll()})`);
    assert.ok(result,`UI condition not met: ${expr}`);
  };
  const click=async sel=>{await wait(`document.querySelector(${JSON.stringify(sel)})`);await js(`document.querySelector(${JSON.stringify(sel)}).click()`);};
  const go=async page=>{await js(`location.hash=${JSON.stringify(page)}`);await js('new Promise(r=>setTimeout(r,80))');};
  const hasText=(sel,text)=>`document.querySelector(${JSON.stringify(sel)})?.textContent.includes(${JSON.stringify(text)})`;
  await wait('document.querySelectorAll(".category").length===6');
  const screen=process.env.SVOIE_SCREENSHOTS;
  async function capture(name){if(!screen)return;mkdirSync(screen,{recursive:true});await js('document.fonts.ready.then(()=>true)');writeFileSync(path.join(screen,name+'.png'),(await web.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG());console.log('Captured '+name);}
  await capture('desktop-home');
  await click('a[href="#cat/music"]');await wait(hasText('.pairs','SadSvit'));
  await click('[data-act="save"]');await click('[data-value="world"]');await wait(hasText('.pairs','DakhaBrakha'));
  const {catalog}=await import('../app/catalog.mjs');
  assert.equal(await js('document.querySelectorAll("article.pair").length'),catalog.filter(p=>p.category==='music'&&p.vibe==='world').length);
  assert.ok(!await js(hasText('.pairs','SadSvit')));
  await click('[data-value="all"]');await capture('music');await go('saved');await wait(hasText('.pairs','SadSvit'));
  await go('profile');await click('[data-act="host-start"]');await wait(hasText('.info-panel','Мій клуб'));
  await go('quests');await click('[data-act="start"]');await wait('document.querySelectorAll(".choice").length===4');await capture('quest');
  for(let i=0;i<5;i++){
    if(i===2){await wait('document.querySelector(".ink-clue img")?.naturalWidth>0');await capture('riddle');}
    await click('.choice:not([disabled])');await wait('document.querySelector(".answer-note")');
    if(i<4){await click('.quiz-box [data-act="start"]');await wait('document.querySelector(".choice:not([disabled])")');}
  }
  await click('.quiz-box [data-act="leave-quest"]');await wait(hasText('main','П’ятірку завершено'));
  await go('rank');await wait('document.querySelector(".table-row.mine")');
  await click('footer [data-act="support"]');await click('dialog [data-value="pair"]');
  await js(`{ const f=document.querySelector('#support-form');for(const [key,value] of Object.entries({from:'Автор А',to:'Автор Б',url:'https://example.org/artist',description:'Спільна атмосфера.'}))f.elements[key].value=value;f.requestSubmit();}`);
  await wait('!document.querySelector("dialog")');await go('profile');await click('[data-act="review"]');await click('[data-act="approve"]');
  await go('cat/youtube');await wait(hasText('.pairs','Автор Б'));
  await go('arcade');await click('[data-act="game-start"]');await wait('document.querySelector("#swipe-card")');
  await js(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}))`);await wait(hasText('.quiz-header','2 / 10'));
  await go('profile');await click('[data-act="host-stop"]');await wait(hasText('.info-panel','Приєднатися до клубу'));
  window.setContentSize(390,844);await go('home');await capture('mobile-home');
  assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
  await click('.mobile-nav [data-act="menu"]');await wait('document.querySelector("dialog[open]")');await click('dialog a[href="#authors"]');await wait(hasText('.page-head','Автори'));
  await web.reload();await new Promise(resolve=>web.once('did-finish-load',resolve));await go('saved');await wait(hasText('.pairs','SadSvit'));
  assert.deepEqual(errors,[]);console.log('Desktop renderer, phone layout, daily cap, club scoring, moderation and persisted collection: OK');
  clearTimeout(watchdog);app.exit(0);
}).catch(err=>{console.error(err.message);app.exit(1);});
