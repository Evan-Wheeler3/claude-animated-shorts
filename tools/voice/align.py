import os, sys
STORY=sys.argv[1].rstrip("/")  # e.g. videos/vasa-warship
MODEL=os.environ.get("KOKORO_DIR","kokoro")
import json, re, subprocess, difflib, numpy as np
from faster_whisper import WhisperModel
V=STORY+"/voice/"
raw=subprocess.run(["ffmpeg","-v","error","-i",V+"voice.wav","-f","f32le","-ac","1","-ar","16000","-"],capture_output=True).stdout
a=np.frombuffer(raw,np.float32)
m=WhisperModel("medium.en",device="cpu",compute_type="int8")
segs,_=m.transcribe(a,beam_size=5,word_timestamps=True,initial_prompt="Vasa, gunports, sixteen twenty-eight")
heard=[w for s in segs for w in s.words]
lines=json.load(open(V+"lines.json"))
script=[(L["line"],w) for L in lines for w in L["text"].split()]
norm=lambda s: re.sub(r"[^a-z0-9]","",s.lower())
hs=[norm(w.word) for w in heard]; ss=[norm(w) for _,w in script]
sm=difflib.SequenceMatcher(a=ss,b=hs,autojunk=False)
out=[None]*len(script); mism=[]
for tag,i1,i2,j1,j2 in sm.get_opcodes():
    if tag=="equal":
        for k in range(i2-i1): out[i1+k]=(heard[j1+k].start,heard[j1+k].end)
    else:
        mism.append((tag," ".join(w for _,w in script[i1:i2])," ".join(w.word for w in heard[j1:j2])))
        # spread the heard span (or the gap) evenly over the script words
        t0=heard[j1].start if j1<j2 else (heard[j1-1].end if j1>0 else 0)
        t1=heard[j2-1].end if j1<j2 else (heard[j2].start if j2<len(heard) else t0+0.3)
        n=i2-i1
        for k in range(n): out[i1+k]=(t0+(t1-t0)*k/n, t0+(t1-t0)*(k+1)/n)
W=[{"word":w,"line":l,"start":round(s,3),"end":round(e,3)} for (l,w),(s,e) in zip(script,out)]
json.dump(W,open(V+"words.json","w"),indent=1)
print(len(W),"words; first",W[0],"last",W[-1])
print("MISMATCHES (script | heard):")
for t in mism: print(" ",t)
