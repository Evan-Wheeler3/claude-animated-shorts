#!/usr/bin/env python3
"""Source stylised low-poly models from Poly Pizza (Quaternius, Kenney, Google Poly archive, community).

  search:  python3 tools/assets/polypizza.py search <words...> [--cc0]        (CC0 first, then CC-BY with credit)
  fetch:   python3 tools/assets/polypizza.py fetch <ID> <out_dir> [--id my-id]
           -> <out_dir>/<id>.glb + an assets.json entry (licence, source, author, credit line from Poly Pizza)

In the cloud the API key is injected by the session's network proxy (saved as a network secret). On a Mac, set
POLYPIZZA_KEY. Downloads (static.poly.pizza) sit behind a Cloudflare bot challenge that refuses cloud machines, so
run `fetch` on the Mac and commit the GLBs; `search` works from either. Licences: CC0 needs nothing; CC-BY needs the `credit` line in the video description.
"""
import argparse, json, os, urllib.parse, urllib.request

API = 'https://api.poly.pizza/v1.1'
UA = {'User-Agent': 'HoldUpPipeline/1.0'}
# On the owner's Mac (no proxy): export POLYPIZZA_KEY=... and the key is sent in the x-auth-token header.
if os.environ.get('POLYPIZZA_KEY'):
    UA['x-auth-token'] = os.environ['POLYPIZZA_KEY']


def get(url, binary=False):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        data = r.read()
    return data if binary else json.loads(data)


def search(words, cc0=False):
    d = get(f'{API}/search/{urllib.parse.quote(" ".join(words))}')
    res = d.get('results', [])
    res.sort(key=lambda m: (not m.get('Licence', '').startswith('CC0'), m.get('Tri Count') or 0))
    for m in res:
        if cc0 and not m.get('Licence', '').startswith('CC0'):
            continue
        cr = m.get('Creator') or {}
        print(f"{m['ID']:14} {m.get('Licence', ''):11} tris={m.get('Tri Count')!s:>7}  {m.get('Title')}  by {cr.get('Username', cr) if isinstance(cr, dict) else cr}")
    print(len(res), 'results of', d.get('total'))


def fetch(mid, out_dir, aid=None):
    m = get(f'{API}/model/{mid}')
    aid = aid or (m.get('Title') or mid).lower().replace(' ', '-')
    os.makedirs(out_dir, exist_ok=True)
    p = os.path.join(out_dir, f'{aid}.glb'); open(p, 'wb').write(get(m['Download'], True))
    cr = m.get('Creator') or {}
    lic = m.get('Licence', '')
    meta = os.path.join(out_dir, 'assets.json')
    d = json.load(open(meta)) if os.path.exists(meta) else {'story_id': 'library', 'assets': []}
    d['assets'] = [a for a in d['assets'] if a['id'] != aid] + [{
        'id': aid, 'file': f'{aid}.glb', 'license': lic.replace(' 1.0', '-1.0').replace(' 3.0', '-3.0').replace(' ', '-'),
        'source': f'https://poly.pizza/m/{mid}', 'author': cr.get('Username', '') if isinstance(cr, dict) else str(cr),
        'credit': '' if lic.startswith('CC0') else (m.get('Attribution') or ''), 'notes': f"Poly Pizza {mid}, {m.get('Tri Count')} tris",
        'library': True}]
    json.dump(d, open(meta, 'w'), indent=2)
    print(f'{p}  {os.path.getsize(p) / 1e6:.2f} MB  {lic}  {m.get("Attribution", "")}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['search', 'fetch']); ap.add_argument('args', nargs='*')
    ap.add_argument('--cc0', action='store_true'); ap.add_argument('--id')
    a = ap.parse_args()
    search(a.args, a.cc0) if a.cmd == 'search' else fetch(a.args[0], a.args[1], a.id)
