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
  const {catalog}=await import('../app/catalog.mjs');
  const {dropWords}=await import('../app/minigame-data.mjs');
  const {arcadeDecks}=await import('../app/arcade.mjs');
  const {frameDecks,ladderDecks}=await import('../app/minigames.mjs');
  const artworkUrls=new Set(catalog.flatMap(p=>p.preview.artwork?[p.preview.artwork.image]:[]));
  const liveArtwork=process.env.SVOIE_LIVE_ARTWORK==='1';
  if(!liveArtwork)web.session.webRequest.onBeforeRequest({urls:['https://*/*']},(details,reply)=>reply({cancel:artworkUrls.has(details.url)}));
  web.on('console-message',(e)=>{
    if(e.level==='error'&&!(!liveArtwork&&artworkUrls.has(e.sourceId)&&e.message.includes('ERR_BLOCKED_BY_CLIENT')))errors.push(e.message);
  });
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
  const checkCover=async online=>{
    await wait('document.querySelector(".pair-preview-cover")?.naturalWidth===960');
    await js('document.querySelector(".pair-preview-release").loading="eager"');
    await wait('document.querySelector(".pair-preview-release")?.complete');
    if(online){
      await wait('document.querySelector(".pair-preview-visual.has-release .pair-preview-release")?.naturalWidth===700');
      assert.equal(await js('document.querySelector(".pair-preview-credit a").href'),'https://sadsvit.bandcamp.com/track/--2');
    }else{
      assert.ok(await js('document.querySelector(".pair-preview-release").naturalWidth===0 && !document.querySelector(".pair-preview-visual.has-release") && getComputedStyle(document.querySelector(".pair-preview-cover")).visibility==="visible" && getComputedStyle(document.querySelector(".pair-preview-credit")).display==="none"'));
    }
    const media=await js(`(()=>{
      const frame=document.querySelector('.pair-preview-media');
      const image=frame.querySelector('.pair-preview-${online?'release':'cover'}');
      const a=frame.getBoundingClientRect(),b=image.getBoundingClientRect();
      return {width:a.width,height:a.height,flush:['x','y','width','height'].every(key=>a[key]===b[key]),
        radius:parseFloat(getComputedStyle(frame).borderTopLeftRadius),clip:getComputedStyle(frame).overflow,
        padding:getComputedStyle(image).padding,fit:getComputedStyle(image).objectFit};
    })()`);
    assert.ok(Math.abs(media.width-media.height)<1 && media.flush && media.radius>0 && media.clip==='hidden' && media.padding==='0px' && media.fit==='cover',JSON.stringify(media));
  };
  await wait('document.querySelectorAll(".category").length===6');
  const screen=process.env.SVOIE_SCREENSHOTS;
  async function capture(name,selector){
    if(!screen)return;
    mkdirSync(screen,{recursive:true});await js('document.fonts.ready.then(()=>true)');
    const rect=selector?await js(`(async()=>{
      const el=document.querySelector(${JSON.stringify(selector)});
       await Promise.all(Array.from(el.querySelectorAll('img'),img=> !img.closest('[aria-hidden="true"]') && getComputedStyle(img).visibility==='visible'?img.decode():null));
      el.scrollIntoView({block:'center',behavior:'instant'});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const r=el.getBoundingClientRect();
      return {x:Math.floor(r.left),y:Math.floor(r.top),width:Math.ceil(r.right)-Math.floor(r.left),height:Math.ceil(r.bottom)-Math.floor(r.top)};
    })()`):undefined;
    writeFileSync(path.join(screen,name+'.png'),(await web.capturePage(rect,{stayHidden:true,stayAwake:true})).toPNG());console.log('Captured '+name);
  }
  await capture('desktop-home');
  await click('a[href="#cat/music"]');await wait(hasText('.pairs','SadSvit'));
  const comparison='.pair-preview details';
  await checkCover(liveArtwork);
  assert.equal(await js('document.querySelectorAll(".pair-preview").length'),catalog.filter(p=>p.category==='music'&&p.vibe==='ua').length);
  assert.equal(await js('document.querySelector(".pair-preview-listen").href'),'https://www.youtube.com/watch?v=EGLoIaHwKfE');
  assert.equal(await js(`document.querySelector('${comparison}').open`),false);
  await click(`${comparison} summary`);await wait(`document.querySelector('${comparison}').open`);
  await capture('kaseta-desktop','.pair-preview');
  await click('.pair-preview [data-act="save"]');
  assert.ok(await js(`document.querySelector('${comparison}').open && document.querySelector('.pair-preview [aria-pressed="true"]')!==null`));
  await click('[data-value="world"]');await wait(hasText('.pairs','DakhaBrakha'));
  assert.equal(await js('document.querySelectorAll("article.pair").length'),catalog.filter(p=>p.category==='music'&&p.vibe==='world').length);
  assert.ok(!await js(hasText('.pairs','SadSvit')));
  await click('[data-value="all"]');await capture('music');await go('saved');await wait(hasText('.pair-preview','SadSvit'));
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
   await go('arcade');await wait('document.querySelectorAll(".arcade-card").length===4');await capture('arcade-desktop');
   const readKeys=keys=>js(`{const s=JSON.parse(localStorage.getItem('svoie.v1'));Object.fromEntries(${JSON.stringify(keys)}.map(k=>[k,s[k]]));}`);
   const protectedKeys=['sessions','played','days','saved','best','arcadeRotation','miniRecords'];
   const beforeArcade=await readKeys(protectedKeys);
   const arcade=()=>js('JSON.parse(localStorage.getItem("svoie.arcade.v2"))');
   const chooseLevel=level=>click(`[data-act="arcade-level"][data-value="${level}"]`);
   const key=key=>js(`document.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(key)},bubbles:true}))`);
   await click('.arcade-card-side');await chooseLevel('easy');await click('[data-act="game-start"]');
   await wait(hasText('.quiz-header','життя: 5'));
   for(let i=0;i<10;i++){
     const word=await js('document.querySelector("#swipe-card h2").textContent');
     await key(arcadeDecks.easy.find(c=>c[0]===word)[1]==='ua'?'ArrowRight':'ArrowLeft');
   }
   await wait(hasText('.mini-result h2','10 / 10'));
   assert.equal((await arcade()).byLevel.easy.sideBest,10);
   assert.equal((await arcade()).byLevel.normal.sideBest,0);
   await click('[data-act="arcade-settings"]');await chooseLevel('hard');await click('[data-act="game-start"]');
   await wait(hasText('.quiz-header','життя: 2'));
   await go('arcade/letters');await click('[data-act="mini-start"]');
   await wait('parseFloat(document.querySelector("#drop-board")?.style.getPropertyValue("--fall"))>1');
   const firstClue=await js('document.querySelector(".drop-clue h2").textContent');
   const [firstWord]=dropWords.find(([,clue])=>clue===firstClue);
   const lane=async ch=>await js(`Array.from(document.querySelectorAll('.drop-flight b'),el=>el.textContent).indexOf(${JSON.stringify(ch)})`);
   await click('[data-act="drop-pause"]');await wait('document.querySelectorAll(".drop-lane:disabled").length===3');
   await key('1');assert.ok(await js(hasText('.mini-top','Життя: 3')));
   await click('[data-act="drop-pause"]');
   await key(String(1+await lane(firstWord[0])));
   for(const ch of firstWord.slice(1))await click(`[data-act="drop-pick"][data-index="${await lane(ch)}"]`);
   await wait(hasText('.mini-top','Слово 2 / 5'));
   const nextClue=await js('document.querySelector(".drop-clue h2").textContent');
   const [nextWord]=dropWords.find(([,clue])=>clue===nextClue);
   for(let i=0;i<2;i++)await click(`[data-act="drop-pick"][data-index="${((await lane(nextWord[0]))+1)%3}"]`);
   await wait(hasText('.mini-top','Життя: 1'));
   await wait(hasText('.mini-result','1 / 5 слів'));
   await click('[data-act="arcade-settings"]');await chooseLevel('easy');await click('[data-act="mini-start"]');
   await wait('document.querySelectorAll(".drop-lane").length===2');await wait(hasText('.mini-top','Життя: 5'));
   await go('arcade');await go('arcade/letters');await chooseLevel('hard');await click('[data-act="mini-start"]');
   await wait('document.querySelectorAll(".drop-lane").length===4');await wait(hasText('.mini-top','Життя: 2'));
   const hardClue=await js('document.querySelector(".drop-clue h2").textContent');
   const [hardWord]=dropWords.find(([,clue])=>clue===hardClue);
   assert.ok(hardWord.length>=7);
   const fourth=await lane(hardWord[0])===3;
   await key('4');await wait(fourth?hasText('.drop-foot','Є літера'):hasText('.mini-top','Життя: 1'));
   await go('arcade/frames');await click('[data-act="mini-start"]');
   await wait('document.querySelectorAll(".frame-tile").length===8 && document.querySelector(".frame-image img").naturalWidth>0');
   await js('window.openedArt=document.querySelector(".frame-image img")');
   await click('.frame-tile');await wait(hasText('#frame-value','+8'));
   assert.ok(await js('document.querySelector(".frame-image img")===window.openedArt'));
   for(let i=0;i<5;i++){
     const id=await js('document.querySelector(".frame-board").dataset.frameId');
     const title=catalog.find(p=>p.id===id).preview.title;
     const choice=await js(`Array.from(document.querySelectorAll('.frame-choice b'),el=>el.textContent).indexOf(${JSON.stringify(title)})`);
     await key(String(choice+1));await wait(hasText('.frame-details h2',title));
     if(!liveArtwork) assert.ok(await js('getComputedStyle(document.querySelector(".frame-local-credit")).display!=="none"'));
     assert.ok(await js('document.querySelector(".frame-details a[data-external]") && !document.querySelector(".frame-tile")'));
     await click('[data-act="frame-next"]');
   }
   await wait(hasText('.mini-result h2','44 / 45'));
   await click('[data-act="arcade-settings"]');await chooseLevel('hard');await click('[data-act="frame-album"][data-value="art"]');
   await capture('frames-setup-desktop');await click('[data-act="mini-start"]');
   await wait('document.querySelectorAll(".frame-tile").length===15 && document.querySelectorAll(".frame-choice").length===4 && document.querySelector(".frame-image img").naturalWidth===352');
   let artScore=0;
   for(let i=0;i<5;i++){
     const id=await js('document.querySelector(".frame-board").dataset.frameId');
     const {title}=frameDecks.art.find(p=>p.id===id);
     const index=await js(`Array.from(document.querySelectorAll('.frame-choice b'),el=>el.textContent).indexOf(${JSON.stringify(title)})`);
     const chosen=i===0?3:index;
     if(chosen===index)artScore+=16;
     await key(String(chosen+1));await wait(hasText('.frame-details h2',title));
     assert.ok(await js('document.querySelector(".frame-local-credit") && !document.querySelector(".frame-details a")'));
     await click('[data-act="frame-next"]');
   }
   await wait(hasText('.mini-result h2',`${artScore} / 80`));
   await go('arcade/ladder');await click('[data-act="mini-start"]');
   await click('[data-act="ladder-letter"][data-letter="Ї"]');await wait(hasText('.ladder-feedback','немає у словнику'));
   await click('[data-act="ladder-hint"]');await wait(hasText('.ladder-feedback','заміни «І» на «У»'));
   await click('[data-act="ladder-letter"][data-letter="У"]');await wait(hasText('.ladder-chain li:last-child','КУТ'));
   await click('[data-act="ladder-undo"]');await wait(hasText('.ladder-chain li:last-child','КІТ'));
   await key('у');await key('ArrowLeft');await key('т');await wait(hasText('.mini-result h2','Ланцюжок готовий'));
   await click('[data-act="arcade-settings"]');await chooseLevel('hard');await click('[data-act="mini-start"]');
   await wait(hasText('.ladder-goal',ladderDecks.hard[0].target.toLocaleUpperCase('uk')));
   await click('[data-act="arcade-settings"]');await chooseLevel('normal');await wait(hasText('.mini-start-row','1 / 44'));
   assert.deepEqual(await readKeys(protectedKeys),beforeArcade);
   const records=(await arcade()).byLevel;
   assert.equal(records.normal.lettersBest,1);
   assert.deepEqual(records.normal.frameBest,{catalog:44,art:0});
   assert.deepEqual(records.hard.frameBest,{catalog:0,art:artScore});
   assert.deepEqual(records.normal.ladderBest,{'кіт-тут':2});
  await go('profile');await click('[data-act="host-stop"]');await wait(hasText('.info-panel','Приєднатися до клубу'));
  if(window.isMaximized()){
    const restored=new Promise(resolve=>window.once('unmaximize',resolve));
    window.unmaximize();await restored;
  }
  window.setContentSize(390,844);
  await wait('innerWidth>=360 && innerWidth<=420');
  await go('cat/music');await checkCover(liveArtwork);
  const phoneWidth=await js('innerWidth');assert.ok(phoneWidth>=360&&phoneWidth<=420,`Expected phone viewport, got ${phoneWidth}px`);
  assert.ok(await js('document.documentElement.scrollWidth<=innerWidth && document.querySelector(".pair-preview-cover").getBoundingClientRect().bottom < document.querySelector(".pair-preview h3").getBoundingClientRect().top'));
  await capture('kaseta-mobile','.pair-preview');
  await go('arcade');await capture('arcade-mobile');
  for(const kind of ['letters','frames','ladder']){
    await click(`.arcade-card-${kind}`);
    await wait('document.querySelector(".mini-setup")');
    assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
    if(kind==='frames') await capture('frames-setup-mobile');
    await click('[data-act="mini-start"]');
    assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
    if(kind==='letters')await capture('letters-mobile');
    if(kind==='frames')await capture('frames-mobile');
    if(kind==='ladder')await capture('ladder-mobile');
    await go('arcade');
  }
  for(const [category,id] of Object.entries({youtube:'yt-1',shorts:'sh-7',instagram:'in-5',art:'ar-7',games:'gm-7'})){
    await go('cat/'+category);
    assert.equal(await js('document.querySelectorAll("article.pair-preview").length'),8);
    assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
    const sel=`article:has([data-pair-compare="${id}"])`;
    await js(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'center',behavior:'instant'})`);
    await wait(`document.querySelector(${JSON.stringify(sel+' .pair-preview-cover')})?.naturalWidth===640`);
    if(liveArtwork)await wait(`document.querySelector(${JSON.stringify(sel+' .has-release')})`);
    await capture('catalog-'+category,sel);
  }
  await go('home');await capture('mobile-home');
  assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
  await click('.mobile-nav [data-act="menu"]');await wait('document.querySelector("dialog[open]")');await click('dialog a[href="#authors"]');await wait(hasText('.page-head','Автори'));
  await web.reload();await new Promise(resolve=>web.once('did-finish-load',resolve));await go('saved');await checkCover(liveArtwork);
  await go('arcade');await wait(hasText('.arcade-card-ladder','1 / 44'));await wait(hasText('.arcade-card-letters','Складно'));await wait(hasText('.arcade-card-frames',`${artScore} / 80`));
  await click('.arcade-card-frames');
  await wait('document.querySelector(\'[data-value="art"][aria-pressed="true"]\')');
  await click('[data-act="frame-album"][data-value="catalog"]');await chooseLevel('normal');await wait(hasText('.mini-start-row','44 / 45'));
  assert.deepEqual(errors,[]);console.log('Desktop and phone layouts, difficulty settings, both frame albums, local records and club scoring: OK');
  clearTimeout(watchdog);app.exit(0);
}).catch(err=>{console.error(err.message);app.exit(1);});
