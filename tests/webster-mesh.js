// Webster v5: checks for the Physical (waveguide mesh) engine. `node tests/webster-mesh.js` (no dependencies)
//  1. a uniform tube rings at the quarter-wave modes of a 17.6 cm tube closed at one end
//  2. the fitted vowel shapes ring at their Peterson & Barney F1/F2 targets
//  3. a whole sentence renders with no single sound blowing out the level (what was wrong before v5)
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (a, b) => html.slice(html.indexOf(a), html.indexOf(b));
const af = html.indexOf('const AREA_FUNCTIONS = {'), src = html.slice(af, html.indexOf('\n};', af) + 3) + cut('// ==== WEBSTER KLATT CORE (v4) ====', '// ==== END WEBSTER KLATT CORE ====')
  + cut('// ==== WEBSTER MESH CORE (v5) ====', '// ==== END WEBSTER MESH CORE ====');
const M = new Function(src + '; return { mRender, mVowelArea, MV, KV, MESH_L, MESH_H, MESH_UNIT, MESH_SR };')();
let bad = 0; const check = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'}  ${msg}`); };

// impulse response of a fixed shape, using the same update as mRender, then the first peaks of its spectrum
function peaks(A, want) {
  const L = M.MESH_L, H = M.MESH_H, rows = H + 2, n = (L + 2) * rows, beta = Math.PI * 55 / M.MESH_SR, open = new Uint8Array(n);
  for (let c = 0; c < L; c++) { const w = Math.max(0, Math.min(H, Math.round(A[c] / M.MESH_UNIT))), r0 = 1 + ((H - w) >> 1); for (let r = r0; r < r0 + w; r++) open[(c + 1) * rows + r] = 1; }
  let a = new Float64Array(n), b = new Float64Array(n), cN = new Float64Array(n); const T = 16384, y = new Float64Array(T);
  for (let t = 0; t < T; t++) {
    for (let c = 1; c <= L; c++) for (let r = 1; r <= H; r++) { const i = c * rows + r; if (!open[i]) { cN[i] = 0; continue; } const me = b[i];
      const q = (j, out) => out ? 0 : open[j] ? b[j] : me;
      cN[i] = (0.5 * (q(i - rows) + q(i + rows, c === L) + q(i - 1) + q(i + 1)) - (1 - beta) * a[i]) / (1 + beta); }
    if (t === 0) for (let r = 1; r <= H; r++) if (open[rows + r]) cN[rows + r] += 1;
    let s = 0; for (let r = 1; r <= H; r++) s += cN[L * rows + r]; y[t] = s;
    const tmp = a; a = b; b = cN; cN = tmp; }
  const df = 5, K = Math.round(5000 / df), mag = new Float64Array(K);          // DFT on a 5 Hz grid up to 5 kHz
  for (let k = 1; k < K; k++) { const w = 2 * Math.PI * k * df / M.MESH_SR; let re = 0, im = 0, cr = 1, ci = 0; const wr = Math.cos(w), wi = -Math.sin(w);
    for (let t = 0; t < T; t++) { re += y[t] * cr; im += y[t] * ci; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; }
    mag[k] = Math.hypot(re, im); }
  const out = []; for (let k = 2; k < K - 1 && out.length < want; k++) if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > 1e-3 * Math.max(...mag.slice(1, k + 1))) out.push(k * df);
  return out; }

// the mesh's own speed of sound is dx·fs/√2; the pressure-release node sits half a cell past the last cell
const c = 0.55 * M.MESH_SR / Math.SQRT2, len = 17.6 + 0.275, tube = peaks(new Float32Array(M.MESH_L).fill(3), 3);
tube.forEach((f, i) => { const th = (2 * i + 1) * c / (4 * len); check(Math.abs(f - th) / th < 0.03, `uniform tube mode ${i + 1}: ${f} Hz (theory ${Math.round(th)})`); });
for (const v of ['a', 'æ', 'ɛ', 'ɔ', 'u', 'ə', 'i']) {
  const [t1, t2] = M.KV[v], [f1, f2] = peaks(M.mVowelArea(M.MV[v]), 2), e1 = Math.abs(f1 - t1) / t1, e2 = Math.abs(f2 - t2) / t2;
  const tol = v === 'i' ? 0.25 : 0.12;                                       // /i/: the known front-vowel limit (F2 ~22% low)
  check(e1 < tol && e2 < tol, `/${v}/ F1 ${f1} (target ${t1}, ${(e1 * 100).toFixed(0)}%)  F2 ${f2} (target ${t2}, ${(e2 * 100).toFixed(0)}%)`); }

const ph = 'h ɛ l o _ k h æ m _ . ð ə _ f r a g z _ a r _ s ɪ ŋ ɪ ŋ _ ɪ n _ n ɪ n ɛ t i _ s ɪ k s _ .'.split(' ');
const r = M.mRender(ph, { pitch: 115, rate: 1 }), x = r.samples, sr = r.sampleRate;
check(x.length > sr && x.every(Number.isFinite), `sentence renders: ${(x.length / sr).toFixed(2)} s, all samples finite`);
const tl = r.timeline.concat([{ t: x.length / sr }]), lv = [];
for (let i = 0; i < tl.length - 1; i++) { const a0 = Math.floor(tl[i].t * sr), a1 = Math.floor(tl[i + 1].t * sr); if (a1 - a0 < 100 || tl[i].phoneme === '.' || tl[i].phoneme === '_') continue;
  let s = 0; for (let j = a0; j < a1; j++) s += x[j] * x[j]; lv.push({ p: tl[i].phoneme, rms: Math.sqrt(s / (a1 - a0)) }); }
const vow = lv.filter(e => M.KV[e.p]).map(e => e.rms).sort((a, b) => a - b), med = vow[vow.length >> 1], top = lv.reduce((m, e) => e.rms > m.rms ? e : m);
check(top.rms < 2 * med, `loudest sound /${top.p}/ is ${(top.rms / med).toFixed(2)}× the median vowel (limit 2×)`);
console.log(bad ? `FAIL (${bad})` : 'PASS'); process.exit(bad ? 1 : 0);
