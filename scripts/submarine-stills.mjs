import fs from 'node:fs';import path from 'node:path';
const tmp=path.resolve('.remotion-tmp-submarine');fs.mkdirSync(tmp,{recursive:true});process.env.TEMP=process.env.TMP=process.env.TMPDIR=tmp;
const {bundle}=await import('@remotion/bundler');const {renderStill,selectComposition}=await import('@remotion/renderer');
const serveUrl=await bundle({entryPoint:path.resolve('src/videos/submarine-toilet/index.tsx'),publicDir:path.resolve('public')});
const opts={serveUrl,browserExecutable:process.env.CHROME||'/usr/bin/chromium',chromiumOptions:{gl:'swangle'},inputProps:{dpr:.5}};
const composition=await selectComposition({...opts,id:'SubmarineAssetReview'});fs.mkdirSync('videos/submarine-toilet/previews',{recursive:true});
for(const [i,name] of ['exterior','toilet','cutaway','staging'].entries()){const output=`videos/submarine-toilet/previews/${name}.jpg`;await renderStill({...opts,composition,frame:i*100+40,output,imageFormat:'jpeg',jpegQuality:90,scale:.5,timeoutInMilliseconds:600000});console.log(output)}
