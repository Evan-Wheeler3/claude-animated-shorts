// usage: node scripts/inspect-glb.mjs <file.glb>  — prints node tree summary, bones, morphs, clips, bounds (no browser)
import fs from 'node:fs';
const buf = fs.readFileSync(process.argv[2]);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
const nodes = gltf.nodes || [];
const meshNodes = nodes.filter(n => n.mesh !== undefined);
console.log('nodes', nodes.length, 'meshNodes', meshNodes.length, 'skins', (gltf.skins||[]).length, 'cams', (gltf.cameras||[]).length, 'anims', (gltf.animations||[]).map(a=>a.name).join(','));
const top = (gltf.scenes[0].nodes).map(i => nodes[i].name);
console.log('top-level:', top.join(' | '));
const names = nodes.map(n => n.name).filter(Boolean);
const nonBip = names.filter(n => !/Bip01|Bone|Nub|Footsteps/.test(n));
console.log('non-bone nodes (' + nonBip.length + '):', nonBip.slice(0, 400).join(', '));
for (const s of gltf.skins || []) console.log('skin joints', s.joints.length, 'first', s.joints.slice(0, 80).map(j => nodes[j].name).join(','));
for (const m of gltf.meshes) { const t = m.extras?.targetNames; if (t) console.log('morphs on', m.name, t.join(',')); }
