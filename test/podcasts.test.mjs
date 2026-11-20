import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {catalog} from '../app/catalog.mjs';
import {frameDecks} from '../app/minigames.mjs';
import {podcasts,podcastTopics,podcastDirection,filterPodcasts} from '../app/podcasts.mjs';

test('31 podcast cards link to an actual episode and their publisher, with local fallback art',()=>{
  const app=new URL('../app/',import.meta.url);
  const policy=readFileSync(new URL('index.html',app),'utf8').match(/img-src ([^;]+);/)[1];
  assert.ok(policy.includes('https://is1-ssl.mzstatic.com/image/thumb/'));
  assert.ok(existsSync(new URL(`assets/directions/${podcastDirection.id}.webp`,app)));
  assert.equal(podcasts.length,31);
  for(const attr of ['id','title','cover','episodeUrl'])assert.equal(new Set(podcasts.map(p=>p[attr])).size,podcasts.length,attr);
  const legacy=new Set(catalog.map(p=>p.id));
  for(const p of podcasts){
    assert.match(p.id,/^pod-[a-z0-9-]+$/);
    assert.ok(!legacy.has(p.id)&&podcastTopics[p.topic]);
    assert.match(p.episodeUrl,/^https:\/\/podcasts\.apple\.com\/ua\/podcast\/id\d+\?i=\d+$/);
    assert.match(p.authorUrl,/^https:\/\//);
    assert.notEqual(p.authorUrl,p.episodeUrl);
    assert.match(p.image,/^https:\/\/is1-ssl\.mzstatic\.com\/image\/thumb\/Podcasts/);
    assert.ok(p.author&&p.description&&p.episode&&p.cue&&p.minutes>0);
    const cover=readFileSync(new URL(p.cover,app));
    assert.equal(cover.toString('ascii',8,12),'WEBP',p.id);
  }
  assert.equal(frameDecks.catalog.length,48);
});

test('podcasts filter by topic, author, episode and Cyrillic case; Shymanovskyi is a guest',()=>{
  for(const topic of Object.keys(podcastTopics))assert.ok(filterPodcasts({topic}).length>=4,topic);
  const [guest]=podcasts;
  assert.equal(guest.author,'Ukraїner');
  assert.equal(guest.guest.name,'Андрій Шимановський');
  assert.equal(guest.guest.url,'https://www.youtube.com/@ShymanovskyiAndrii');
  assert.deepEqual(filterPodcasts({query:'  ШИМАНОВСЬКИЙ польську  '}),[guest]);
  assert.deepEqual(filterPodcasts({query:'шимановський',topic:'science'}),[]);
  assert.ok(filterPodcasts({query:'КУНШТ',topic:'science'}).some(p=>p.id==='pod-kosatky'));
});
