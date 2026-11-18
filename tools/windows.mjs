import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';

const root = fileURLToPath(new URL('../', import.meta.url));
const paths = await packager({
  dir: root,
  out: fileURLToPath(new URL('../release/', import.meta.url)),
  name: 'PovazhaiteSvoie', platform: 'win32', arch: 'x64',
  asar: true, prune: false, overwrite: true,
  icon: fileURLToPath(new URL('../desktop/icon.ico', import.meta.url)),
  win32metadata: { ProductName: 'Поважайте своє', FileDescription: 'Поважайте своє' },
  ignore: (name) => name !== '' && !/^[/\\](?:app|desktop|server)(?:[/\\]|$)/.test(name) && !/^[/\\]package\.json$/.test(name) || /^[/\\]server[/\\]data(?:[/\\]|$)/.test(name),
});
console.log(paths.join('\n'));
