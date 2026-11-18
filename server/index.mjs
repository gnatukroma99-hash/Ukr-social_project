import { fileURLToPath } from 'node:url';
import { makeService } from './service.mjs';

const database = process.env.DB_PATH || fileURLToPath(new URL('./data/svoie.sqlite', import.meta.url));
const port = Number(process.env.PORT || 4387), host = process.env.HOST || '127.0.0.1';
const service = makeService({ database });
service.on('error', error => { console.error(error.message); process.exitCode = 1; });
service.listen(port, host, () => console.log(`Поважайте своє: http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => service.close());
