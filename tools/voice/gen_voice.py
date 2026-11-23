import os, sys
STORY=sys.argv[1].rstrip("/")  # e.g. videos/vasa-warship
MODEL=os.environ.get("KOKORO_DIR","kokoro")
import re, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k=Kokoro(MODEL+"/onnx/model.onnx",MODEL+"/voices.bin")
V="am_puck"; SPEED=1.10; GAP=0.04; PAUSE=dict(sentence_pause=0.06,clause_pause=0.04)
BEAT={"L08":0.22,"L11":0.18,"L18":0.22}   # planned beats: slightly longer gap BEFORE these lines
# pronunciation fixes (same words): am_puck swallows a weak sentence-initial "So" and the t in "gust was"
# Vasa-specific pronunciation overrides (verified with faster-whisper medium.en). Clear them for a new story.
OVERRIDE={"L07":("sˈoʊː ðeɪ stˈɑːpt, ðə tˈɛst.",1.10),
          "L08":("ænd sˈɛntʰ ɪt ˈaʊt ˈɛniweɪ.",1.10),
          "L10":("ˈʌ lˈaɪt bɹˈiːz.",1.10),
          "L11":("ðˈɛn, wˈʌn ɡˈʌst.",1.0),
          "L16":("sˈoʊː wˈʌn ɡˈʌst wʌz ɪnˈʌf.",1.0)}
lines=[l for l in open(STORY+"/SCRIPT.md") if re.match(r"L\d\d ",l)]
def squeeze(a,sr,maxgap=0.18,keep=0.12,thr=0.006):
    """Shorten silent runs inside a line (model's built-in punctuation pauses) to `keep` seconds."""
    f=int(sr*0.01); n=len(a)//f
    env=np.array([np.abs(a[i*f:(i+1)*f]).max() for i in range(n)])
    quiet=env<thr; res=[]; i=0
    while i<n:
        j=i
        while j<n and quiet[j]==quiet[i]: j+=1
        seg=a[i*f:j*f]
        if quiet[i] and (j-i)*f>maxgap*sr:
            h=int(keep*sr/2); seg=np.concatenate([seg[:h],seg[-h:]])
        res.append(seg); i=j
    res.append(a[n*f:]); return np.concatenate(res)
out=[]; meta=[]; t=0.0; sr=24000
for l in lines:
    lid,text=l[:3],l[4:].strip()
    if lid in OVERRIDE:
        ph,sp=OVERRIDE[lid]; a,sr=k.create(ph,voice=V,speed=sp,lang="en-us",is_phonemes=True,**PAUSE)
    else:
        a,sr=k.create(text,voice=V,speed=SPEED,lang="en-us",**PAUSE)
    nz=np.where(np.abs(a)>0.01)[0]; a=a[max(0,nz[0]-240):nz[-1]+240]; a=squeeze(a,sr)
    g=BEAT.get(lid,GAP) if out else 0.05
    out.append(np.zeros(int(sr*g),np.float32)); t+=g
    meta.append({"line":lid,"text":text,"start":round(t,3),"end":round(t+len(a)/sr,3)})
    out.append(a); t+=len(a)/sr
out.append(np.zeros(int(sr*0.25),np.float32))
a=np.concatenate(out); a=a/np.max(np.abs(a))*0.89
sf.write(STORY+"/voice/voice.wav",a,sr,subtype="PCM_16")
json.dump(meta,open(STORY+"/voice/lines.json","w"),indent=1)
words=sum(len(m["text"].split()) for m in meta)
print(f"{len(a)/sr:.2f} s, {words} words, {words/(meta[-1]['end']-meta[0]['start']):.2f} words/s, {len(meta)} lines")
