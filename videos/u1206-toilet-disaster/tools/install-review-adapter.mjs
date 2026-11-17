// Install only story-scoped QA files into an isolated renderer checkout; never changes shared pipeline files.
import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(), source=path.resolve(path.dirname(new URL(import.meta.url).pathname));
const target=path.join(root,'src/videos/u1206-review'),script=path.join(root,'scripts/u1206-asset-stills.mjs');
if(!fs.existsSync(path.join(root,'src/pipeline/toon.ts')))throw Error('Run from an isolated Hold Up renderer checkout.');
if(!fs.readFileSync(path.join(root,'src/pipeline/toon.ts'),'utf8').includes('"subcap"'))throw Error('The opt-in watch-cap patch is missing; apply it only in an isolated integration branch after checking compatibility.');
if(fs.existsSync(target)||fs.existsSync(script))throw Error('Refusing to overwrite existing review files. Remove only your own prior adapter, or use a fresh worktree.');
const assets=path.join(root,'videos/u1206-toilet-disaster/assets');
if(!fs.existsSync(path.join(assets,'index.js')))throw Error('The U-1206 story assets must exist in this runtime checkout.');
fs.mkdirSync(target,{recursive:true});
for(const name of ['Preview.tsx','cast.ts','materials.ts','index.tsx']){
 let content=fs.readFileSync(path.join(source,name),'utf8');content=content.replaceAll('videos/submarine-toilet/assets/','videos/u1206-toilet-disaster/assets/');fs.writeFileSync(path.join(target,name),content);
}
let render=fs.readFileSync(path.join(source,'submarine-stills.mjs'),'utf8').replaceAll('src/videos/submarine-toilet/index.tsx','src/videos/u1206-review/index.tsx').replaceAll('videos/submarine-toilet/previews/','videos/u1206-toilet-disaster/previews/');fs.writeFileSync(script,render);
console.log('Installed only src/videos/u1206-review and scripts/u1206-asset-stills.mjs');
