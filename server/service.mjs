import http from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { competition } from './tournament.mjs';
import { publicPage } from './public-pages.mjs';
import { removals } from './removals.mjs';
import { categories } from '../app/data.mjs';
import { DAILY_LIMIT, dayAt, shiftDay, shiftMonth, deckFor, publicQuestion, scoreAnswer, streakEnding, streakBonus, validMonth, safeUrl } from '../app/engine.mjs';

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new RequestError(status, message); };
const digest = (token) => createHash('sha256').update(token).digest('hex');
const text = (value, min, max) => {
  if (typeof value !== 'string') fail(400, 'Перевір заповнені поля.');
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (cleaned.length < min || cleaned.length > max) fail(400, `Довжина тексту має бути від ${min} до ${max} знаків.`);
  return cleaned;
};

export function openStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;
    CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, hash TEXT UNIQUE NOT NULL, name TEXT NOT NULL, joined INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS starts(player TEXT, day TEXT, slot INTEGER, at INTEGER NOT NULL, PRIMARY KEY(player, day, slot), FOREIGN KEY(player) REFERENCES players(id));
    CREATE TABLE IF NOT EXISTS answers(player TEXT, day TEXT, slot INTEGER, id TEXT, choice TEXT, correct INTEGER, expected TEXT, explanation TEXT, speed INTEGER, bonus INTEGER, points INTEGER, at INTEGER NOT NULL, PRIMARY KEY(player, day, slot), FOREIGN KEY(player) REFERENCES players(id));
    CREATE INDEX IF NOT EXISTS monthly_answers ON answers(day, player);
    CREATE TABLE IF NOT EXISTS closed_months(month TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS winners(month TEXT, player TEXT, name TEXT, rank INTEGER, points INTEGER, correct INTEGER, PRIMARY KEY(month, player));
    CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY, player TEXT NOT NULL, type TEXT NOT NULL, data TEXT NOT NULL, state TEXT DEFAULT 'pending', priority INTEGER DEFAULT 0, at INTEGER NOT NULL, FOREIGN KEY(player) REFERENCES players(id));
  `);
  return db;
}

function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try { const data = work(); db.exec('COMMIT'); return data; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

const ranking = `WITH totals AS (
  SELECT a.player AS id, p.name, SUM(a.points) AS points, SUM(a.correct) AS correct, MAX(a.at) AS lastScore
  FROM answers a JOIN players p ON a.player = p.id WHERE a.day >= ? AND a.day < ? GROUP BY a.player
), ordered AS (
  SELECT id, name, points, correct, ROW_NUMBER() OVER(ORDER BY points DESC, correct DESC, lastScore ASC, id ASC) AS rank FROM totals
)`;

function finalize(db, current) {
  const months = db.prepare(`SELECT DISTINCT substr(day,1,7) AS month FROM answers WHERE day < ? AND substr(day,1,7) NOT IN (SELECT month FROM closed_months)`).all(current + '-01');
  for (const { month } of months) transaction(db, () => {
    db.prepare(`INSERT OR IGNORE INTO winners(month,player,name,rank,points,correct) ${ranking} SELECT ?,id,name,rank,points,correct FROM ordered WHERE rank<=100`).run(month + '-01', shiftMonth(month, 1) + '-01', month);
    db.prepare('INSERT OR IGNORE INTO closed_months VALUES (?)').run(month);
  });
}

function answersFor(db, id, day) {
  return db.prepare('SELECT id,choice,correct,expected,explanation,speed,bonus,points FROM answers WHERE player=? AND day=? ORDER BY slot').all(id, day).map(row => ({ ...row, correct: !!row.correct }));
}

const completed = (db, id) => new Set(db.prepare('SELECT day FROM answers WHERE player=? GROUP BY day HAVING COUNT(*)=?').all(id, DAILY_LIMIT).map(a => a.day));
function snapshot(db, player, day) {
  const month = day.slice(0, 7), done = completed(db, player.id);
  const awards = db.prepare('SELECT month,rank,points FROM winners WHERE player=? ORDER BY month DESC').all(player.id);
  return { player: { id: player.id, name: player.name }, day, done: answersFor(db, player.id, day),
    streak: streakEnding(done.has(day) ? day : shiftDay(day, -1), done), awards,
    monthly: db.prepare('SELECT COALESCE(SUM(points),0) AS sum FROM answers WHERE player=? AND day>=? AND day<?').get(player.id, month + '-01', shiftMonth(month, 1) + '-01').sum };
}

async function payload(req) {
  if (!/^application\/json\b/.test(req.headers['content-type'] || '')) fail(415, 'Потрібен JSON.');
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 9000) fail(413, 'Повідомлення надто велике.'); chunks.push(chunk); }
  try { const object = JSON.parse(Buffer.concat(chunks)); if (!object || typeof object !== 'object' || Array.isArray(object)) throw Error(); return object; }
  catch { fail(400, 'Неправильний формат повідомлення.'); }
}

function noteData(body) {
  if (body.type === 'feedback') return { message: text(body.message, 5, 1200) };
  if (body.type !== 'pair' || !categories.some(c => c.id === body.category) || !['ua','world'].includes(body.vibe)) fail(400, 'Обери напрям і мову.');
  const url = safeUrl(text(body.url, 9, 500));
  if (!url) fail(400, 'Додай HTTPS-посилання на українську альтернативу.');
  return { category: body.category, vibe: body.vibe, from: text(body.from, 2, 70), to: text(body.to, 2, 70), description: text(body.description, 8, 350), url, format: 'Вибір спільноти', action: 'Відкрити' };
}

export function makeService({ database, now = Date.now, tournament=null } = {}) {
  const db = openStore(database || ':memory:');
  const cup=tournament && competition(db,tournament,now);
  const removalQueue=removals(db);
  const clock=cup && setInterval(()=>cup.finalize(),1000).unref();
  const rates = new Map(); let finalizedDay = '';
  function limit(key, max, interval = 60000) {
    const time = now(); let item = rates.get(key);
    if (!item || time >= item.until) {
      if (rates.size > 1000) for (const [id, row] of rates) if (time >= row.until) rates.delete(id);
      item = { until: time + interval, count: 0 }; rates.set(key, item);
    }
    if (++item.count > max) fail(429, 'Забагато запитів. Спробуй трохи пізніше.');
  }
  const service = http.createServer({ requestTimeout: 15000, headersTimeout: 12000, maxHeaderSize: 8192 }, async (req, res) => {
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' });
      res.end(status === 204 ? '' : JSON.stringify(value));
    };
    try {
      if (req.method === 'OPTIONS') return send(204);
      const url = new URL(req.url, 'http://localhost');
      const route = `${req.method} ${url.pathname}`;
      if(['GET /','GET /privacy','GET /delete-account','GET /delete-account/sent'].includes(route)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});return res.end(publicPage(url.pathname));}
      const ip = req.socket.remoteAddress; limit(`request:${ip}`, 900);
      if(route==='POST /delete-account'){
        limit(`removal:${ip}`,20,3600000);
        if(!(req.headers['content-type']||'').startsWith('application/x-www-form-urlencoded'))fail(415,'Надішли вебформу.');
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>2048)fail(413,'Надто багато даних.');chunks.push(chunk);}
        const email=(new URLSearchParams(Buffer.concat(chunks).toString()).get('email')||'').trim().toLowerCase();
        if(email.length>254||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))fail(400,'Перевір пошту.');
        removalQueue.request(email,now());res.writeHead(303,{Location:'/delete-account/sent','Cache-Control':'no-store'});return res.end();
      }
      if (route === 'GET /api/health') return send(200, { service: 'povazhaite-svoie', version: 1, mode:cup?'tournament':'club',end:cup?.end,email:!!tournament?.email });
      if(cup && route==='GET /auth/finish'){
        const code=url.searchParams.get('code')||'';const ok=/^[a-zA-Z0-9_-]{16,256}$/.test(code);
        res.writeHead(ok?200:400,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
        return res.end(ok?`Скопіюй цей одноразовий код і встав у «Поважайте своє» на пристрої, з якого почав вхід:\n\n${code}\n`:'Не отримали код. Повернися в застосунок і почни вхід знову.');
      }
      const day = dayAt(now()), month = day.slice(0, 7);
      if (finalizedDay !== day) { finalize(db, month); finalizedDay = day; }
      if(cup && route==='POST /api/auth/google'){
        const {challenge}=await payload(req);if(typeof challenge!=='string'||!/^[\w-]{43}$/.test(challenge))fail(400,'Почни вхід знову.');return send(200,{url:cup.auth.google(challenge)});
      }
      if(cup && route==='POST /api/auth/google/verify'){
        limit(`oauth:${ip}`,240,3600000);const body=await payload(req),name=text(body.name,2,24),code=text(body.code,16,256),verifier=text(body.verifier,43,128);
        const subject=await cup.auth.exchange(code,verifier),{token,player}=cup.login(subject,name);return send(200,{token,state:snapshot(db,player,dayAt(now()))});
      }
      if (cup && tournament.email && ['POST /api/auth/send','POST /api/auth/verify'].includes(route)) {
        const body=await payload(req), email=text(body.email,3,254).toLowerCase();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Перевір адресу пошти.');
        const sending=route.endsWith('/send');limit(`${route}:${ip}`,sending?60:240,3600000);limit(`${route}:${digest(email)}`,sending?1:8,sending?60000:600000);
        if(sending){await cup.auth.send(email);return send(200,{sent:true});}
        const code=text(body.code,6,10),name=text(body.name,2,24);if(!/^\d+$/.test(code))fail(400,'Введи цифри з листа.');
        const subject=await cup.auth.verify(email,code), {token,player}=cup.login(subject,name);
        return send(200,{token,state:snapshot(db,player,dayAt(now()))});
      }
      if (route === 'POST /api/players') {
        if(cup)fail(401,'Для турніру підтвердь свою пошту.');
        limit(`register:${ip}`, 120, 3600000);
        const { name } = await payload(req), clean = text(name, 2, 24), token = randomBytes(32).toString('base64url');
        const player = { id: randomUUID(), name: clean };
        db.prepare('INSERT INTO players VALUES (?,?,?,?)').run(player.id, digest(token), clean, now());
        return send(201, { token, state: snapshot(db, player, day) });
      }
      if (route === 'GET /api/catalog') return send(200, { pairs: db.prepare("SELECT id,data FROM notes WHERE type='pair' AND state='approved' ORDER BY at DESC LIMIT 300").all().map(row => ({ ...JSON.parse(row.data), id: `community-${row.id}` })) });
      const token = (req.headers.authorization || '').match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
      const player = cup ? cup.identify(token) : token && db.prepare('SELECT id,name FROM players WHERE hash=?').get(digest(token));
      if (!player) fail(401, 'Не вдалося впізнати профіль на цьому сервері. Перевір код профілю.');
      if(cup && route==='GET /api/tournament')return send(200,cup.board(player.id));
      if(cup && route==='POST /api/auth/logout'){cup.logout(token);return send(200,{ok:true});}
      if (route === 'GET /api/me') return send(200, snapshot(db, player, day));
      if (route === 'PATCH /api/me') {
        const name = text((await payload(req)).name, 2, 24);
        db.prepare('UPDATE players SET name=? WHERE id=?').run(name, player.id);
        return send(200, snapshot(db, { ...player, name }, day));
      }
      if (route === 'POST /api/start') {
        const body = await payload(req);
        if(cup)cup.allowed();
        if (body.day !== day) fail(409, 'У Києві вже новий день. Онови завдання.');
        const slot = answersFor(db, player.id, day).length;
        if (slot >= DAILY_LIMIT) fail(409, 'На сьогодні всі п’ять завдань виконано.');
        const q = deckFor(day)[slot];
        db.prepare('INSERT OR IGNORE INTO starts VALUES (?,?,?,?)').run(player.id, day, slot, now());
        return send(200, { day, slot, question: publicQuestion(q) });
      }
      if (route === 'POST /api/answer') {
        const body = await payload(req);
        if (body.day !== day) fail(409, 'У Києві вже новий день. Онови завдання.');
        const answer = transaction(db, () => {
          const existing = answersFor(db, player.id, day);
          const replay = existing.find(item => item.id === body.id);
          if (replay) return replay; // Retrying a lost response cannot earn points twice.
          const received=cup?cup.allowed():now();
          const slot = existing.length, q = deckFor(day)[slot];
          if (!q || q.id !== body.id || !q.choices.includes(body.choice)) fail(409, 'Це завдання вже змінилося. Онови прогрес.');
          const start = db.prepare('SELECT at FROM starts WHERE player=? AND day=? AND slot=?').get(player.id, day, slot);
          if (!start) fail(409, 'Спершу відкрий завдання.');
          const bonus = slot + 1 === DAILY_LIMIT ? streakBonus(streakEnding(shiftDay(day, -1), completed(db, player.id)) + 1) : 0;
          const a = scoreAnswer(q, body.choice, Math.max(0, now() - start.at), bonus);
          db.prepare('INSERT INTO answers VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(player.id, day, slot, q.id, a.choice, +a.correct, a.expected, a.explanation, a.speed, a.bonus, a.points, received);
          return a;
        });
        return send(200, { answer, state: snapshot(db, player, day) });
      }
      if (route === 'GET /api/leaderboard') {
        const selected = url.searchParams.get('month') || month;
        if (!validMonth(selected) || selected > month) fail(400, 'Перевір місяць рейтингу.');
        const closed = selected < month; let rows, mine, total;
        if (closed) {
          rows = db.prepare('SELECT player AS id,name,points,correct,rank FROM winners WHERE month=? ORDER BY rank').all(selected);
          mine = rows.find(row => row.id === player.id) || null;
          total = db.prepare('SELECT COUNT(DISTINCT player) AS count FROM answers WHERE day>=? AND day<?').get(selected + '-01', shiftMonth(selected, 1) + '-01').count;
        } else {
          const dates = [selected + '-01', shiftMonth(selected, 1) + '-01'];
          rows = db.prepare(`${ranking} SELECT * FROM ordered WHERE rank<=100 ORDER BY rank`).all(...dates);
          mine = db.prepare(`${ranking} SELECT * FROM ordered WHERE id=?`).get(...dates, player.id) || null;
          total = db.prepare(`${ranking} SELECT COUNT(*) AS count FROM ordered`).get(...dates).count;
        }
        return send(200, { month: selected, closed, rows, mine, total });
      }
      if (route === 'POST /api/support') {
        limit(`note:${player.id}`, 10, 3600000);
        const body = await payload(req), data = noteData(body);
        const priority = db.prepare('SELECT 1 AS ok FROM winners WHERE player=? LIMIT 1').get(player.id) ? 1 : 0;
        const id = randomUUID(); db.prepare('INSERT INTO notes(id,player,type,data,priority,at) VALUES (?,?,?,?,?,?)').run(id, player.id, body.type, JSON.stringify(data), priority, now());
        return send(201, { id, state: 'pending' });
      }
      fail(404, 'Такої дії немає.');
    } catch (error) {
      if (!error.status) console.error('API:', error.message);
      if (!res.headersSent && !res.destroyed) send(error.status || 500, { error: error.status ? error.message : 'Сервер не зміг завершити дію.' });
    }
  });
  // Administrative actions are available only to the host process, never over HTTP.
  service.moderation = {
    list: () => db.prepare("SELECT n.id,n.type,n.data,n.priority,p.name FROM notes n JOIN players p ON p.id=n.player WHERE n.state='pending' ORDER BY n.priority DESC,n.at LIMIT 100").all().map(row => ({ ...row, data: JSON.parse(row.data) })),
    decide: (id, approved) => db.prepare("UPDATE notes SET state=? WHERE state='pending' AND id=?").run(approved ? 'approved' : 'rejected', id).changes === 1,
  };
  service.on('close', () => {if(clock)clearInterval(clock);db.close();});
  return service;
}
