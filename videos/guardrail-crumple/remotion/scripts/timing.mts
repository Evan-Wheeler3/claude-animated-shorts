// Export the picture's time constants for the sound build (audio/make.py reads audio/timing.json).
// usage (from remotion/): npx tsx scripts/timing.mts > ../audio/timing.json
import {SHOTS, BEAT, TOTAL, FPS, travel, words} from '../src/story.ts';
const tr: number[] = [];
for (let f = 0; f <= TOTAL; f++) tr.push(+travel(f / FPS).toFixed(4));
console.log(JSON.stringify({FPS, TOTAL, SHOTS, BEAT, travel: tr, words}, null, 0));
