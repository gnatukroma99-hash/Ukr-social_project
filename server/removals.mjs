import {randomUUID} from 'node:crypto';

export function removals(db){
  db.exec(`CREATE TABLE IF NOT EXISTS removal_requests(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, created INTEGER NOT NULL)`);
  return {
    // This is an intake form. Receiving someone's address is not proof of ownership.
    request(email,at){ db.prepare('INSERT OR IGNORE INTO removal_requests VALUES (?,?,?)').run(randomUUID(),email,at); },
    list(){return db.prepare('SELECT id,email,created FROM removal_requests ORDER BY created').all();},
    // Operator-only: use a confirmed Supabase subject, never a nickname or an unverified request.
    finish(id,subject){
      if(!db.prepare('SELECT id FROM removal_requests WHERE id=?').get(id))throw Error('Unknown request.');
      db.exec('BEGIN IMMEDIATE');try{
        const exists=name=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
        const p=exists('entrants')&&db.prepare('SELECT player FROM entrants WHERE subject=?').get(subject)?.player;
        if(p){
          for(const f of db.prepare('SELECT event,rows FROM finals').all()){const rows=JSON.parse(f.rows);const kept=rows.filter(r=>r.id!==p);if(kept.length!==rows.length)db.prepare('UPDATE finals SET rows=? WHERE event=?').run(JSON.stringify(kept),f.event);}
          for(const name of ['starts','answers','notes','winners','logins','entrants'])db.prepare(`DELETE FROM ${name} WHERE player=?`).run(p);
          db.prepare('DELETE FROM players WHERE id=?').run(p);
        }
        db.prepare('DELETE FROM removal_requests WHERE id=?').run(id);db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}
    },
  };
}
