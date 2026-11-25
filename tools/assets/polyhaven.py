#!/usr/bin/env python3
"""Source CC0 models and HDRIs from Poly Haven automatically (replaces Codex for anything a library has).

  search:  python3 tools/assets/polyhaven.py search <words...> [--cat trees] [--type models|hdris]
  fetch:   python3 tools/assets/polyhaven.py fetch <slug> <out_dir> [--id my-id] [--res 1k] [--ratio 0.25]
           -> <out_dir>/<id>.glb (single self-contained GLB, textures embedded, optionally simplified to `ratio`
              of its triangles) and an entry appended to <out_dir>/assets.json (license CC0-1.0, source, authors)
  hdri:    python3 tools/assets/polyhaven.py hdri <slug> <out_dir> [--res 1k]   -> <out_dir>/<slug>.hdr

Needs network access to api.polyhaven.com and dl.polyhaven.org, and Node (npx @gltf-transform/cli) for packing.
Poly Haven assets are CC0; we still record source + authors for credit-where-due.
"""
import argparse, json, os, subprocess, sys, tempfile, urllib.request

API = 'https://api.polyhaven.com'
UA = {'User-Agent': 'HoldUpPipeline/1.0'}


def get(url, binary=False):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        data = r.read()
    return data if binary else json.loads(data)


def search(words, cat=None, typ='models'):
    allx = get(f'{API}/assets?t={typ}')
    out = []
    for slug, a in allx.items():
        hay = ' '.join([slug, a.get('name', ''), ' '.join(a.get('tags', [])), ' '.join(a.get('categories', []))]).lower()
        if cat and cat not in a.get('categories', []):
            continue
        if all(w.lower() in hay for w in words):
            out.append((slug, a.get('name'), a.get('polycount'), a.get('categories', [])[:4]))
    for o in sorted(out, key=lambda x: x[2] or 0):
        print(f'{o[0]:32} polys={o[2]!s:>10}  {o[1]}  {o[3]}')
    print(len(out), 'matches')


def fetch(slug, out_dir, aid=None, res='1k', ratio=None):
    aid = aid or slug.replace('_', '-')
    os.makedirs(out_dir, exist_ok=True)
    files, info = get(f'{API}/files/{slug}'), get(f'{API}/info/{slug}')
    g = files['gltf'][res]['gltf']
    with tempfile.TemporaryDirectory() as tmp:
        gl = os.path.join(tmp, f'{slug}.gltf')
        open(gl, 'wb').write(get(g['url'], True))
        for rel, f in g.get('include', {}).items():
            p = os.path.join(tmp, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(get(f['url'], True))
        glb = os.path.abspath(os.path.join(out_dir, f'{aid}.glb'))
        run = lambda *a: subprocess.run(['npx', '-y', '@gltf-transform/cli@4', *a], check=True, capture_output=True, text=True)
        if ratio:
            mid = os.path.join(tmp, 'mid.glb')
            run('copy', gl, mid)
            run('weld', mid, mid)
            run('simplify', mid, glb, '--ratio', str(ratio), '--error', '0.002')
        else:
            run('copy', gl, glb)
    authors = ', '.join(info.get('authors', {}).keys())
    meta = os.path.join(out_dir, 'assets.json')
    d = json.load(open(meta)) if os.path.exists(meta) else {'story_id': os.path.basename(os.path.dirname(os.path.abspath(out_dir))), 'assets': []}
    d['assets'] = [a for a in d['assets'] if a['id'] != aid] + [{
        'id': aid, 'file': f'{aid}.glb', 'license': 'CC0-1.0', 'source': f'https://polyhaven.com/a/{slug}', 'author': authors,
        'credit': '', 'notes': f'Poly Haven {slug} {res}' + (f', simplified to {ratio:.0%} of triangles' if ratio else ''),
        'library': True}]
    json.dump(d, open(meta, 'w'), indent=2)
    print(f'{glb}  {os.path.getsize(glb) / 1e6:.1f} MB  by {authors}')


def hdri(slug, out_dir, res='1k'):
    os.makedirs(out_dir, exist_ok=True)
    f = get(f'{API}/files/{slug}')['hdri'][res]['hdr']
    p = os.path.join(out_dir, f'{slug}.hdr'); open(p, 'wb').write(get(f['url'], True)); print(p, f'{os.path.getsize(p) / 1e6:.1f} MB')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['search', 'fetch', 'hdri']); ap.add_argument('args', nargs='*')
    ap.add_argument('--cat'); ap.add_argument('--type', default='models'); ap.add_argument('--id'); ap.add_argument('--res', default='1k')
    ap.add_argument('--ratio', type=float)
    a = ap.parse_args()
    if a.cmd == 'search': search(a.args, a.cat, a.type)
    elif a.cmd == 'fetch': fetch(a.args[0], a.args[1], a.id, a.res, a.ratio)
    else: hdri(a.args[0], a.args[1], a.res)
