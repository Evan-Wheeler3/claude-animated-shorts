// EBU R128 / ITU-R BS.1770-4 integrated loudness, max momentary loudness and true peak (4x oversampled) for
// interleaved float stereo at 48 kHz. Used by QA because the bundled ffmpeg has no ebur128 filter.
const biquad = (x, b, a) => { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
// K-weighting at 48 kHz (BS.1770-4 table): high shelf + RLB high pass
const SHELF = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
const HP = { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] };
export const measure = (chans, sr = 48000) => {
  if (sr !== 48000) throw new Error("loudness.mjs expects 48 kHz audio");
  const kw = chans.map((c) => biquad(biquad(c, SHELF.b, SHELF.a), HP.b, HP.a));
  const block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), n = chans[0].length, ms = [];
  for (let s = 0; s + block <= n; s += hop) { let z = 0; for (const c of kw) { let e = 0; for (let i = s; i < s + block; i++) e += c[i] * c[i]; z += e / block; } ms.push(z); }
  const L = (z) => -0.691 + 10 * Math.log10(z + 1e-20);
  const abs = ms.filter((z) => L(z) > -70), rel = abs.length ? L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10 : -70;
  const gated = abs.filter((z) => L(z) > rel), integrated = gated.length ? L(gated.reduce((a, b) => a + b, 0) / gated.length) : -Infinity;
  const momentaryMax = ms.length ? Math.max(...ms.map(L)) : -Infinity;
  // true peak: 4x oversampling with a 48-tap windowed-sinc interpolator
  const taps = 12, tp = (() => { let pk = 0; const h = [];
    for (let ph = 0; ph < 4; ph++) { const row = []; for (let k = -taps; k < taps; k++) { const x = k - ph / 4; const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / taps); row.push(x === 0 ? 1 : (Math.sin(Math.PI * x) / (Math.PI * x)) * w); } h.push(row); }
    for (const c of chans) for (let i = taps; i < c.length - taps; i++) { if (Math.abs(c[i]) < 0.5 * pk) continue; for (let ph = 0; ph < 4; ph++) { let v = 0; const r = h[ph]; for (let k = 0; k < 2 * taps; k++) v += r[k] * c[i - taps + k]; pk = Math.max(pk, Math.abs(v)); } }
    return pk; })();
  return { integrated, momentaryMax, truePeakDb: 20 * Math.log10(tp + 1e-12) };
};
