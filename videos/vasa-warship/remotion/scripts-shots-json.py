# Writes ../voice/../shots.json (shot frame ranges) from src/anchors.json + ../voice/words.json, same rule as src/story.ts,
# for tools/check-pacing.py and short_qa.py.
import json, math, os
here = os.path.dirname(os.path.abspath(__file__))
A = json.load(open(f'{here}/src/anchors.json')); W = json.load(open(f'{here}/../voice/words.json'))
st = []
for k, p in enumerate(A['pics']):
    ws = [w for w in W if w['line'] == p['line']]
    st.append(0 if k == 0 else max(0, round(ws[p['w']]['start'] * 30) - A['lead']))
tot = math.ceil((W[-1]['end'] + A['tail']) * 30)
shots = [{'id': p['pic'], 'a': st[i], 'b': st[i + 1] if i + 1 < len(st) else tot} for i, p in enumerate(A['pics'])]
beats = [round([w for w in W if w['line'] == b['line']][b['w']]['start'] * 30) - A['lead'] for b in A.get('beats', [])]
json.dump({'shots': shots, 'planned': [], 'beats': beats}, open(f'{here}/../shots.json', 'w'), indent=1)
print(len(shots), 'shots,', tot, 'frames')
