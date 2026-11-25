#!/usr/bin/env python3
"""Cloud side of the asset inbox: turn what send-inbox.command pushed into a clean, searchable library.

  python3 tools/assets/ingest.py                 # convert everything in assets/library/_incoming/*
  python3 tools/assets/ingest.py find <words>    # search the catalogue (id, pack, size, tris)

For each pack folder in assets/library/_incoming/<pack>/:
  glTF -> single GLB (gltf-transform copy);  OBJ -> GLB (obj2gltf);  FBX -> GLB (fbx2gltf)
into assets/library/<pack>/<model>.glb, then records id, pack, file, size (m), triangles and licence (CC0,
Quaternius unless the pack folder says otherwise) in assets/library/catalog.json, and deletes the source files.
"""
import json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LIB = os.path.join(ROOT, 'assets', 'library'); INC = os.path.join(LIB, '_incoming'); CAT = os.path.join(LIB, 'catalog.json')
NPX = ['npx', '-y']


def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def convert(src, dst):
    ext = os.path.splitext(src)[1].lower()
    if ext in ('.gltf', '.glb'):
        cmd = NPX + ['@gltf-transform/cli@4', 'copy', src, dst]
    elif ext == '.obj':
        cmd = NPX + ['obj2gltf@3', '-i', src, '-o', dst, '--binary']
    elif ext == '.fbx':
        cmd = NPX + ['fbx2gltf@0.9.7-p1', '--binary', '--input', src, '--output', dst[:-4]]
    else:
        return False
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0 and os.path.exists(dst)


def stats(glb):
    js = "const {NodeIO}=require('@gltf-transform/core');(async()=>{const d=await new NodeIO().read(process.argv[1]);" \
         "let t=0;for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives()){const i=p.getIndices();t+=(i?i.getCount():p.getAttribute('POSITION').getCount())/3}" \
         "const {getBounds}=require('@gltf-transform/core');const b=getBounds(d.getRoot().listScenes()[0]);" \
         "console.log(JSON.stringify({tris:Math.round(t),size:b.max.map((v,i)=>+(v-b.min[i]).toFixed(3))}))})()"
    r = subprocess.run(['node', '-e', js, glb], capture_output=True, text=True, cwd=os.path.join(ROOT, 'templates', 'holdup', 'remotion'))
    try: return json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: return {}


def ingest():
    cat = json.load(open(CAT)) if os.path.exists(CAT) else []
    have = {c['id'] for c in cat}
    if not os.path.isdir(INC): print('nothing in', INC); return
    for pack in sorted(os.listdir(INC)):
        pdir = os.path.join(INC, pack); out = os.path.join(LIB, slug(pack)); os.makedirs(out, exist_ok=True)
        srcs = [os.path.join(dp, f) for dp, _, fs in os.walk(pdir) for f in fs if f.lower().endswith(('.gltf', '.glb', '.obj', '.fbx'))]
        ok = bad = 0
        for s in sorted(srcs):
            mid = slug(pack) + '/' + slug(os.path.splitext(os.path.basename(s))[0])
            if mid in have: continue
            dst = os.path.join(LIB, mid + '.glb')
            if convert(s, dst):
                st = stats(dst); cat.append({'id': mid, 'pack': pack, 'file': os.path.relpath(dst, LIB), 'license': 'CC0-1.0',
                                             'author': 'Quaternius', 'size_m': st.get('size'), 'tris': st.get('tris')}); have.add(mid); ok += 1
            else: bad += 1; print('  could not convert', os.path.relpath(s, INC))
        print(f'{pack}: {ok} models added, {bad} failed')
        if bad == 0: shutil.rmtree(pdir)
    json.dump(sorted(cat, key=lambda c: c['id']), open(CAT, 'w'), indent=1)
    print(len(cat), 'models in the catalogue')


def find(words):
    for c in json.load(open(CAT)):
        if all(w.lower() in c['id'] for w in words): print(f"{c['id']:50} {c.get('size_m')} m  {c.get('tris')} tris")


if __name__ == '__main__':
    find(sys.argv[2:]) if len(sys.argv) > 1 and sys.argv[1] == 'find' else ingest()
