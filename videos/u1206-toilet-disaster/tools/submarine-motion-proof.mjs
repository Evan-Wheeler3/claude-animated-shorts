import fs from 'node:fs';import path from 'node:path';
const tmp=path.resolve('.remotion-tmp-submarine');fs.mkdirSync(tmp,{recursive:true});process.env.TEMP=process.env.TMP=process.env.TMPDIR=tmp;
const {bundle}=await import('@remotion/bundler');const {renderMedia,selectComposition}=await import('@remotion/renderer');
const serveUrl=await bundle({entryPoint:path.resolve('src/videos/submarine-toilet/index.tsx'),publicDir:path.resolve('public')});
const opts={serveUrl,browserExecutable:process.env.CHROME||'/usr/bin/chromium',chromiumOptions:{gl:'swangle'},inputProps:{dpr:.25}};
const composition=await selectComposition({...opts,id:'SubmarineAssetReview'});
const output=path.resolve(process.env.PROOF_OUTPUT||'videos/submarine-toilet/previews/sink-motion.mp4');
await renderMedia({...opts,composition,codec:'h264',crf:23,outputLocation:output,frameRange:[1200,1299],scale:.25,concurrency:2,timeoutInMilliseconds:600000});console.log(output);
