import { fileURLToPath } from 'node:url';
import { openStore } from './service.mjs';

const db = openStore(process.env.DB_PATH || fileURLToPath(new URL('./data/svoie.sqlite', import.meta.url)));
const [action = 'list', id] = process.argv.slice(2);
try {
  if (action === 'list') {
    const rows = db.prepare("SELECT n.id,n.type,p.name,n.data,n.priority FROM notes n JOIN players p ON p.id=n.player WHERE n.state='pending' ORDER BY n.priority DESC,n.at").all();
    for (const row of rows) console.log(JSON.stringify({ ...row, data: JSON.parse(row.data) }));
    console.log(`Очікують розгляду: ${rows.length}`);
  } else if (['approve', 'reject'].includes(action) && id) {
    const result = db.prepare("UPDATE notes SET state=? WHERE id=? AND state='pending'").run(action === 'approve' ? 'approved' : 'rejected', id);
    console.log(`Оновлено: ${result.changes}`);
  } else { console.error('node server/moderate.mjs list | approve <id> | reject <id>'); process.exitCode = 1; }
} finally { db.close(); }
