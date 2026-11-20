import {spawnSync} from 'node:child_process';
import {cp,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('..',import.meta.url));
const app=join(root,'app'), target=join(root,'target');
const wasm=join(target,'svoie-wasm'), preview=join(target,'svoie-preview');
const cargo=process.env.CARGO??'cargo', bindgen=process.env.WASM_BINDGEN??'wasm-bindgen';
const version='0.2.130';
const env={...process.env,CARGO_TARGET_DIR:target};
function run(command,args,show=true){
  const job=spawnSync(command,args,{cwd:root,env,stdio:show?'inherit':'pipe',encoding:'utf8'});
  if(job.error)throw job.error;
  if(job.status!==0)throw new Error(`${command} ${args[0]} failed (${job.status})${job.stderr?`: ${job.stderr.trim()}`:''}`);
  return job.stdout;
}
if(run(bindgen,['--version'],false).trim()!==`wasm-bindgen ${version}`){
  throw new Error(`Install wasm-bindgen-cli ${version} or point WASM_BINDGEN to that version.`);
}
run(cargo,['build','--locked','--release','--target','wasm32-unknown-unknown','-p','svoie-client']);
run(bindgen,[
  '--target','web','--out-dir',wasm,'--no-typescript',
  join(target,'wasm32-unknown-unknown','release','svoie_client.wasm'),
]);

await mkdir(preview,{recursive:true});
const common={absWorkingDir:root, bundle:true, minify:true, target:'chrome89', legalComments:'eof', charset:'utf8'};
const rules=['engine','lexicon','arcade-progress'].map(name=>`experiments/rust-ui/${name}.mjs`);
await build({
  ...common, entryPoints:[join(app,'theme-bootstrap.mjs')], format:'iife', outfile:join(preview,'theme-start.js'),
});
const bundled=await build({
  ...common, format:'esm', outfile:join(preview,'bundle.js'), loader:{'.wasm':'binary'}, metafile:true,
  stdin:{resolveDir:root,sourcefile:'rust-preview.mjs',contents:`
    import * as binding from './target/svoie-wasm/svoie_client.js';
    import bytes from './target/svoie-wasm/svoie_client_bg.wasm';
    import {useRust} from './experiments/rust-ui/runtime.mjs';
    try {
      binding.initSync({module:bytes});
      useRust(binding);
      document.documentElement.dataset.rules='rust';
    } catch (error) {
      console.warn('Rust preview: WebAssembly unavailable; using JavaScript.',error);
      document.documentElement.dataset.rules='javascript';
    }
    await import('./app/ui.mjs');
  `},
  plugins:[{
    name:'rust-preview',
    setup(builder){
      builder.onResolve({filter:/^\.\/(?:engine|lexicon|arcade-progress)\.mjs$/},args=>{
        if(args.resolveDir===app)return {path:join(root,'experiments','rust-ui',args.path.slice(2))};
      });
    },
  }],
});
const inputs=new Set(Object.keys(bundled.metafile.inputs).map(path=>path.replaceAll('\\','/')));
for(const path of rules)if(!inputs.has(path))throw new Error(`Preview did not include ${path}`);
let html=await readFile(join(app,'index.html'),'utf8');
for(const [from,to] of [
  ["script-src 'self';","script-src 'self' 'wasm-unsafe-eval';"],
  ["connect-src https: http:;","connect-src 'self';"],
  ['<script defer src="./bundle.js">','<script type="module" src="./bundle.js">'],
]){
  if(!html.includes(from))throw new Error(`Update the preview HTML rule for ${from}`);
  html=html.replace(from,to);
}
await Promise.all([
  writeFile(join(preview,'index.html'),html),
  cp(join(app,'assets'),join(preview,'assets'),{recursive:true}),
  ...(await readdir(app)).filter(name=>name.endsWith('.css')).map(name=>cp(join(app,name),join(preview,name))),
]);
console.log(`Local-only Rust preview: ${preview}`);
