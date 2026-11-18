import { randomBytes, randomUUID, createHash } from 'node:crypto';

const hash = token => createHash('sha256').update(token).digest('hex');
const reject = (status, message) => { throw Object.assign(new Error(message), { status }); };

export function emailProvider(url, key, origin) {
  const base = new URL(url);
  if (base.protocol !== 'https:' || !key) throw Error('Set SUPABASE_URL (HTTPS) and SUPABASE_PUBLISHABLE_KEY.');
  async function post(path, body) {
    const res = await fetch(`${base.origin}/auth/v1/${path}`, { method:'POST', headers:{ apikey:key,'Content-Type':'application/json' }, body:JSON.stringify(body), signal:AbortSignal.timeout(10000), redirect:'error' });
    if (!res.ok) reject(res.status===429?429:400, res.status===429?'Спробуй пізніше.':'Перевір код або запроси новий лист.');
    return res.json();
  }
  return {
    google(challenge){
      const dest=new URL('auth/v1/authorize',base.origin);dest.search=new URLSearchParams({provider:'google',redirect_to:new URL('/auth/finish',origin).href,code_challenge:challenge,code_challenge_method:'s256'});return dest.href;
    },
    async exchange(code,verifier){const {user}=await post('token?grant_type=pkce',{auth_code:code,code_verifier:verifier});if(!user?.id||!user.email_confirmed_at)reject(401,'Не вдалося підтвердити акаунт Google.');return user.id;},
    send: email => post('otp',{email,create_user:true}),
    verify: async (email,token) => {
      const {user}=await post('verify',{email,token,type:'email'});
      if (!user?.id || !user.email_confirmed_at || user.email?.toLowerCase()!==email) reject(401,'Не вдалося підтвердити пошту.');
      return user.id;
    },
  };
}

export function tournamentFromEnv(env=process.env) {
  if (env.CLUB_MODE !== 'tournament') return null;
  const origin=env.PUBLIC_ORIGIN || (env.RAILWAY_PUBLIC_DOMAIN && `https://${env.RAILWAY_PUBLIC_DOMAIN}`);
  if(!origin||new URL(origin).protocol!=='https:')throw Error('Generate a public HTTPS domain and set PUBLIC_ORIGIN.');
  return { start:env.TOURNAMENT_START || '2026-11-18T00:00:00+02:00', end:env.TOURNAMENT_END || '2026-11-25T00:00:00+02:00', email:env.ALLOW_EMAIL_OTP==='true', auth:emailProvider(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,origin) };
}

export function competition(db, cfg, now) {
  const start=Date.parse(cfg.start), end=Date.parse(cfg.end);
  if (!Number.isFinite(start)||!Number.isFinite(end)||start>=end) throw Error('Invalid tournament dates');
  db.exec(`CREATE TABLE IF NOT EXISTS entrants(subject TEXT PRIMARY KEY,player TEXT UNIQUE NOT NULL REFERENCES players(id));
    CREATE TABLE IF NOT EXISTS logins(hash TEXT PRIMARY KEY,player TEXT NOT NULL REFERENCES players(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS finals(event TEXT PRIMARY KEY,rows TEXT NOT NULL);`);
  const event=`${start}/${end}`;
  function rows(){return db.prepare(`WITH totals AS (SELECT a.player AS id,p.name,SUM(a.points) points,SUM(a.correct) correct,MAX(a.at) last FROM answers a JOIN entrants e ON e.player=a.player JOIN players p ON p.id=a.player WHERE a.at>=? AND a.at<? GROUP BY a.player)
    SELECT id,name,points,correct,ROW_NUMBER() OVER(ORDER BY points DESC,correct DESC,last,id) rank FROM totals ORDER BY rank`).all(start,end);}
  function finalize(){if(now()<end)return; if(!db.prepare('SELECT 1 FROM finals WHERE event=?').get(event))db.prepare('INSERT OR IGNORE INTO finals VALUES (?,?)').run(event,JSON.stringify(rows()));}
  function board(id){finalize();const result=db.prepare('SELECT rows FROM finals WHERE event=?').get(event);const list=result?JSON.parse(result.rows):rows();return {start,end,closed:!!result,rows:list.slice(0,100),total:list.length,mine:list.find(r=>r.id===id)||null};}
  function allowed(){const t=now();if(t<start||t>=end)reject(409,t<start?'Турнір ще не розпочався.':'Час вийшов. Підсумки вже в рейтингу.');return t;}
  function identify(token){return token&&db.prepare('SELECT p.id,p.name FROM logins l JOIN players p ON p.id=l.player WHERE l.hash=? AND l.expires>?').get(hash(token),now());}
  function login(subject,name){const token=randomBytes(32).toString('base64url');db.exec('BEGIN IMMEDIATE');try{
    let p=db.prepare('SELECT p.id,p.name FROM entrants e JOIN players p ON p.id=e.player WHERE e.subject=?').get(subject);
    if(!p){p={id:randomUUID(),name};db.prepare('INSERT INTO players VALUES (?,?,?,?)').run(p.id,hash(randomBytes(32)),name,now());db.prepare('INSERT INTO entrants VALUES (?,?)').run(subject,p.id);}
    db.prepare('DELETE FROM logins WHERE expires<=?').run(now());db.prepare('INSERT INTO logins VALUES (?,?,?)').run(hash(token),p.id,now()+30*86400000);db.exec('COMMIT');return {token,player:p};
  }catch(e){db.exec('ROLLBACK');throw e;}}
  return { start,end,finalize,board,allowed,identify,login,auth:cfg.auth,logout:token=>db.prepare('DELETE FROM logins WHERE hash=?').run(hash(token)) };
}
