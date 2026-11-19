import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { dayAt, shiftDay, deckFor, scoreAnswer, streakEnding, streakBonus, totalPoints, apiOrigin } from './engine.mjs';
import { catalog } from './catalog.mjs';

const key = 'svoie.v1';
const initial = () => ({ name: 'Слухач', saved: [], days: {}, best: 0, arcadeRotation: null, miniRecords: { letters:0, frames:0, ladder:{}, puzzle:0 }, sessions: {}, active: '', played: {}, draft: null, vibe: 'all' });
function load() {
  try { return Object.assign(initial(), JSON.parse(localStorage.getItem(key)) || {}); }
  catch { return initial(); }
}
export const store = load();
export const persist = () => localStorage.setItem(key, JSON.stringify(store));
export const session = () => store.active && store.sessions[store.active];
const localDay = day => store.days[day] || { done: [], starts: {} };
export const allPairs = () => [...catalog, ...(session()?.pairs || [])];
export const localPoints = month => Object.entries(store.days).filter(([d]) => d.startsWith(month)).reduce((a,[,v]) => a + totalPoints(v.done), 0);
function localCompleted() { return new Set(Object.keys(store.days).filter(day => localDay(day).done.length === 5)); }

export function state() {
  if (session()) return session().state;
  const day = dayAt(), done = localDay(day).done, completed = localCompleted();
  return { player: { id: 'solo', name: store.name }, day, done, awards: [], monthly: localPoints(day.slice(0, 7)),
    streak: streakEnding(completed.has(day) ? day : shiftDay(day, -1), completed) };
}

const source = () => session() ? `club:${session().state.player.id}` : 'solo';
export const otherModeToday = () => !!store.played[dayAt()] && store.played[dayAt()] !== source();
const offlineError = 'Клуб не відповідає. Перевір адресу, з’єднання й те, чи запущено сервер.';
async function request(origin, path, method = 'GET', body, token = '') {
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) };
  let status, data;
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.request({ url: origin + path, method, headers, data: body, connectTimeout: 7500, readTimeout: 9000, disableRedirects: true });
      status = res.status; data = res.data;
    } else {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 9000);
      try {
        const res = await fetch(origin + path, { method, headers, body: body && JSON.stringify(body), signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store' });
        status = res.status; data = await res.json();
      } finally { clearTimeout(timer); }
    }
  } catch { throw Error(offlineError); }
  if (status < 200 || status >= 300 || !data || typeof data !== 'object') throw Error(data?.error || offlineError);
  return data;
}

export async function connect(input, name, code = '') {
  const origin = apiOrigin(input);
  if (!origin) throw Error('Вкажи HTTPS-адресу клубу або локальну HTTP-адресу у своїй Wi-Fi мережі.');
  name = name.trim(); code = code.trim();
  if (name.length < 2 || name.length > 24) throw Error('Псевдонім: від 2 до 24 знаків.');
  if (code && !/^[a-zA-Z0-9_-]{43}$/.test(code)) throw Error('Код профілю має містити 43 знаки.');
  const health = await request(origin, '/api/health');
  if (health.service !== 'povazhaite-svoie' || health.version !== 1) throw Error('За цією адресою немає сумісного клубу.');
  let token = code || store.sessions[origin]?.token; let current;
  if(health.mode==='tournament')return {origin,name,email:!!health.email,end:health.end};
  if (token) current = await request(origin, '/api/me', 'GET', null, token);
  else { const created = await request(origin, '/api/players', 'POST', { name }); current = created.state; token = created.token; }
  store.sessions[origin] = { token, state: current, pairs: store.sessions[origin]?.pairs || [] };
  store.active = origin; persist();
  await refreshCatalog().catch(() => {});
}

export function disconnect() { store.active = ''; persist(); }
export async function authAction(target, step, values={}){
  if(step==='google'){
    const b64=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    target.verifier=b64(crypto.getRandomValues(new Uint8Array(48)));
    const challenge=b64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(target.verifier)));
    return request(target.origin,'/api/auth/google','POST',{challenge});
  }
  if(step==='send')return request(target.origin,'/api/auth/send','POST',{email:values.email});
  const r=await request(target.origin,'/api/auth/'+(step==='code'?'google/verify':'verify'),'POST',{name:target.name,verifier:target.verifier,...values});
  store.active=target.origin;store.sessions[target.origin]={token:r.token,state:r.state,pairs:[],tournament:true,end:target.end};persist();
  await refreshCatalog().catch(()=>{});
}
export async function clubApi(path, method, body) {
  if (!session()) throw Error('Спершу приєднайся до клубу в профілі.');
  return request(store.active, path, method, body, session().token);
}
export async function refresh() {
  if (!session()) return;
  const s = session(), fresh = await clubApi('/api/me'); s.state = fresh; persist();
}
export async function refreshCatalog() {
  if (!session()) return;
  const s = session(), { pairs } = await clubApi('/api/catalog'); s.pairs = pairs; persist();
}
export async function rename(value) {
  const name = value.trim(); if (name.length < 2 || name.length > 24) throw Error('Потрібно від 2 до 24 знаків.');
  if (session()) session().state = await clubApi('/api/me', 'PATCH', { name }); else store.name = name;
  persist();
}

export async function startQuestion() {
  if (otherModeToday()) throw Error('Сьогодні ти вже почав серію в іншому профілі. Продовж там або повертайся завтра.');
  if (session()) { await refresh(); return clubApi('/api/start', 'POST', { day: state().day }); }
  const { day, done } = state(), slot = done.length;
  if (slot >= 5) throw Error('Сьогоднішню п’ятірку завершено.');
  const entry = store.days[day] ||= localDay(day), question = deckFor(day)[slot];
  entry.starts[question.id] ??= Date.now(); persist();
  return { day, slot, question };
}
export async function submitAnswer(task, choice) {
  if (otherModeToday()) throw Error('Цю серію розпочато в іншому профілі.');
  let answer;
  if (session()) {
    const s = session(), result = await clubApi('/api/answer', 'POST', { day: task.day, id: task.question.id, choice });
    s.state = result.state; answer = result.answer;
  } else {
    const { day, done } = state(), q = deckFor(day)[done.length];
    if (day !== task.day || !q || q.id !== task.question.id || !q.choices.includes(choice)) throw Error('Завдання змінилося. Відкрий щоденну п’ятірку ще раз.');
    const bonus = done.length === 4 ? streakBonus(streakEnding(shiftDay(day, -1), localCompleted()) + 1) : 0;
    answer = scoreAnswer(q, choice, Math.max(0, Date.now() - localDay(day).starts[q.id]), bonus);
    store.days[day].done.push(answer);
  }
  store.played[task.day] = source(); persist(); return answer;
}

export function toggleSaved(id) {
  const old = store.saved.includes(id); store.saved = old ? store.saved.filter(x => x !== id) : [...store.saved, id]; persist(); return !old;
}
