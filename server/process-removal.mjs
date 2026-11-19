import {fileURLToPath} from 'node:url';
import {openStore} from './service.mjs';
import {removals} from './removals.mjs';
const [action,request,subject,confirmation]=process.argv.slice(2);
const db=openStore(process.env.DB_PATH||fileURLToPath(new URL('./data/svoie.sqlite',import.meta.url)));
try{const queue=removals(db);
  if(action==='list')for(const row of queue.list())console.log(JSON.stringify(row));
  else if(action==='finish'&&request&&/^[\da-f-]{36}$/i.test(subject||'')&&confirmation==='--owner-verified-and-auth-user-deleted'){
    queue.finish(request,subject);console.log('Request closed.');
  }else {console.error('Use list, or follow docs/google-play.md after verifying the account owner.');process.exitCode=1;}
}finally{db.close();}
