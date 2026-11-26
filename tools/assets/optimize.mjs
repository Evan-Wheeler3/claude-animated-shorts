// Shrink and fix library GLBs in place.
//   node tools/assets/optimize.mjs <glb...>                      textures -> max 1024 px WebP (alpha kept), dedupe
//   node tools/assets/optimize.mjs --textures <dir> <glb...>     also (re)attach textures by material name:
//        material "MI_RedBrick" / "M_RedBrick" -> <dir>/T_RedBrick_BaseColor.png, _Normal, _ORM (occlusion/rough/metal),
//        _Roughness; replaces FBX2glTF's 1x1 placeholder images (it can't find Quaternius' texture folder).
// Why: Quaternius MegaKits embed the full 4K texture atlases in every model (Fantasy Props: 13 MB x 94 models).
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup, prune, textureCompress} from '@gltf-transform/functions';

const args = process.argv.slice(2);
let texDir = null;
if (args[0] === '--textures') { texDir = args[1]; args.splice(0, 2); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const texFiles = texDir ? fs.readdirSync(texDir) : [];
const findTex = (base, kind) => texFiles.find(f => f.toLowerCase() === `t_${base}_${kind}.png`.toLowerCase());

let before = 0, after = 0, attached = 0;
for (const f of args) {
  before += fs.statSync(f).size;
  const doc = await io.read(f);
  if (texDir) {
    for (const m of doc.getRoot().listMaterials()) {
      const base = m.getName().replace(/^(MI|M)_/, '').replace(/\.\d+$/, '');
      const set = (kind, setter) => { const t = findTex(base, kind); if (!t) return false;
        const tex = doc.createTexture(`T_${base}_${kind}`).setImage(fs.readFileSync(path.join(texDir, t))).setMimeType('image/png'); setter(tex); return true; };
      const any = [set('BaseColor', t => m.setBaseColorTexture(t)), set('Normal', t => m.setNormalTexture(t)),
        set('ORM', t => { m.setMetallicRoughnessTexture(t); m.setOcclusionTexture(t); }), set('Roughness', t => m.setMetallicRoughnessTexture(t))];
      if (any.some(Boolean)) { attached++; m.setBaseColorFactor([1, 1, 1, 1]); }
    }
  }
  await doc.transform(dedup(), prune(), textureCompress({encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 85}));
  await io.write(f, doc);
  after += fs.statSync(f).size;
}
console.log(`${args.length} files: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB` + (texDir ? `, ${attached} materials textured` : ''));
