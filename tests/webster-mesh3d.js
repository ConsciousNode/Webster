// Webster Physical 3D core tests. Run: node tests/webster-mesh3d.js
// No external dependencies. These test the actual 3-D finite-difference solver and
// the speech-rendering path with deterministic Webster-compatible frame fixtures.
'use strict';
const assert = require('assert');
const fs = require('fs'), path = require('path');
// the engine lives inside index.html (single-file app); load it from between its markers
const M = (() => { const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const src = h.slice(h.indexOf('// ==== WEBSTER MESH 3D CORE (v6) ===='), h.indexOf('// ==== END WEBSTER MESH 3D CORE ===='));
  const mod = { exports: {} }; new Function('module', src)(mod); return mod.exports; })();
const C = M.constants;
let failures = 0;
function check(ok, label, detail = '') {
  if (ok) console.log(`ok   ${label}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
}

// 1) Stability and physical scale.
check(C.LAMBDA < 1 / Math.sqrt(3) && C.LAMBDA > 0.5, '3-D Courant number is below the equal-cell CFL limit', `λ=${C.LAMBDA.toFixed(3)}; limit=${(1/Math.sqrt(3)).toFixed(5)}`);
check(C.LAMBDA * Math.sqrt(3) < 1, '3-D CFL inequality has a positive stability margin', `λ√3=${(C.LAMBDA*Math.sqrt(3)).toFixed(4)}`);
check(C.FS === 110250 && C.OUT_SR === 22050, 'integer 5:1 internal/output sample-rate relationship');
check(Math.abs(C.DX - C.C_CM_S / (C.FS * C.LAMBDA)) < 1e-12, 'cell size and update rate use physical sound speed');

// 2) Cross-sectional rasterisation and explicit area quantisation.
const cross = M.rasterEllipse(2.8);
check(cross.cells > 0 && cross.cells <= 81, 'ellipse produces a bounded 2-D cross-section', `${cross.cells} active voxels; area ${cross.area.toFixed(3)} cm² vs 2.800 cm²`);
const closed = M.rasterEllipse(0);
check(closed.cells === 0, 'zero-area tract section is a true closure');

// 3) Analytical rigid-box modes in all three axes.
// Neumann (rigid) boundaries: the initial state is an exact discrete eigenmode.
const modes = [
  M.runEigenmode({ nx: 32, ny: 7, nz: 9, mx: 1, my: 0, mz: 0 }),
  M.runEigenmode({ nx: 32, ny: 7, nz: 9, mx: 0, my: 1, mz: 0 }),
  M.runEigenmode({ nx: 32, ny: 7, nz: 9, mx: 0, my: 0, mz: 1 })
];
modes.forEach((r, i) => check(r.relativeError < 0.025, `analytical mode ${['longitudinal','vertical','lateral'][i]}`, `measured ${r.measuredHz.toFixed(1)} Hz; discrete theory ${r.theoreticalHz.toFixed(1)} Hz; continuum ${r.continuousHz.toFixed(1)} Hz; error ${(100*r.relativeError).toFixed(2)}%`));

// 4) Lateral geometry must change the acoustic response while X/Y remain identical.
const narrow = M.runEigenmode({ nx: 32, ny: 7, nz: 7, mx: 0, my: 0, mz: 1 });
const wide = M.runEigenmode({ nx: 32, ny: 7, nz: 11, mx: 0, my: 0, mz: 1 });
const lateralShift = Math.abs(narrow.measuredHz - wide.measuredHz);
check(lateralShift > 500, 'lateral dimension measurably changes a 3-D resonance', `${narrow.measuredHz.toFixed(1)} Hz (7 cells) vs ${wide.measuredHz.toFixed(1)} Hz (11 cells), Δ ${lateralShift.toFixed(1)} Hz`);


// 5) Compare vowel impulse responses using the exact v5.1 fitted MV area functions.
// This mirrors the existing webster-mesh.js 2-D impulse-response method.
const MV = {
  'i':[0.661,0.732,1.484,1.592,0.077,0.274], 'ɪ':[0.65,0.59,0.445,1.073,0.039,0.214],
  'e':[0.645,0.511,0.004,1.119,0.057,0.223], 'ɛ':[0.055,0.854,0.001,0.001,0.001,0.22],
  'æ':[0.078,0.773,1.574,1.562,0.02,0.239], 'a':[0.163,0.927,0.024,1.66,0.012,0.292],
  'ɔ':[0.206,0.933,1.511,1.601,0.197,0.258], 'u':[0.526,0.837,0.07,0.099,0.741,0.229],
  'ə':[0.396,0.003,0.479,0.47,0.003,0.225]
};
const TARGET = { i:[270,2290], 'ɪ':[390,1990], e:[460,2000], 'ɛ':[530,1840], 'æ':[660,1720], a:[730,1090], 'ɔ':[570,840], u:[300,870], 'ə':[500,1400] };
const ML=32, MH=24, MU=0.35, MA=3.0, MSR=88200;
const MX=Float32Array.from({length:ML},(_,c)=>(c+0.5)/ML);
function vowelArea(p) {
  const [loc,d,eb,ef,lip,wd]=p, A=new Float32Array(ML);
  for(let c=0;c<ML;c++) { const x=MX[c], dx=Math.abs(x-loc);
    const bump=dx<wd?0.5*(1+Math.cos(Math.PI*dx/wd)):0;
    const wide=dx<0.45?0.5*(1+Math.cos(Math.PI*dx/0.45)):0;
    A[c]=MA*(1-d*bump)*(1+(x<loc?eb:ef)*(1-wide)); }
  for(let c=ML-3;c<ML;c++) A[c]*=1-lip;
  return A;
}
function peaks2D(A, want=8) {
  const L=ML,H=MH,rows=H+2,n=(L+2)*rows,beta=Math.PI*55/MSR,open=new Uint8Array(n);
  for(let c=0;c<L;c++){const w=Math.max(0,Math.min(H,Math.round(A[c]/MU))),r0=1+((H-w)>>1);for(let r=r0;r<r0+w;r++)open[(c+1)*rows+r]=1;}
  let a=new Float64Array(n),b=new Float64Array(n),cn=new Float64Array(n);const T=16384,y=new Float64Array(T);
  for(let t=0;t<T;t++){for(let c=1;c<=L;c++)for(let r=1;r<=H;r++){const i=c*rows+r;if(!open[i]){cn[i]=0;continue;}const me=b[i],q=(j,out)=>out?0:open[j]?b[j]:me;cn[i]=(0.5*(q(i-rows)+q(i+rows,c===L)+q(i-1)+q(i+1))-(1-beta)*a[i])/(1+beta);}if(t===0)for(let r=1;r<=H;r++)if(open[rows+r])cn[rows+r]+=1;let s=0;for(let r=1;r<=H;r++)s+=cn[L*rows+r];y[t]=s;let tmp=a;a=b;b=cn;cn=tmp;}
  const df=5,K=Math.round(5000/df),mag=new Float64Array(K);
  for(let k=1;k<K;k++){const w=2*Math.PI*k*df/MSR;let re=0,im=0,cr=1,ci=0,wr=Math.cos(w),wi=-Math.sin(w);for(let t=0;t<T;t++){re+=y[t]*cr;im+=y[t]*ci;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;}mag[k]=Math.hypot(re,im);}
  const out=[];for(let k=2;k<K-1&&out.length<want;k++)if(mag[k]>mag[k-1]&&mag[k]>=mag[k+1]&&mag[k]>1e-3*Math.max(...mag.slice(1,k+1)))out.push(k*df);return out;
}
const vowelEngine = M.createWebsterMesh3D({ kPlan:()=>[], kFrames:()=>[], shapeFromFormants:()=>new Float32Array(ML).fill(3), kSmooth:a=>a, kPitch:()=>new Float32Array(0) });
const uniformTube = vowelEngine.measureAreaResponse(new Float32Array(ML).fill(3), {steps:16384,dfHz:5,maxHz:5000});
const tubeTheory = C.C_CM_S / (4 * C.NX * C.DX);
check(Math.abs(uniformTube.peaks[0].hz - tubeTheory) / tubeTheory < 0.04, '3-D rigid/open uniform tube quarter-wave resonance', `measured ${uniformTube.peaks[0].hz} Hz; theory ${tubeTheory.toFixed(1)} Hz`);
const vowelRows=[];
for (const v of Object.keys(TARGET)) {
  const A=vowelArea(MV[v]), r3=vowelEngine.measureAreaResponse(A,{steps:16384,dfHz:5,maxHz:5000});
  const f3=r3.peaks.map(p=>p.hz), f2=peaks2D(A,8), [t1,t2]=TARGET[v], [a1,a2]=f3;
  const e1=Math.abs(a1-t1)/t1, e2=Math.abs(a2-t2)/t2;
  check(e1<0.15 && e2<0.25, `/${v}/ 3-D F1/F2 against v5.1 targets`, `${a1}/${a2} Hz vs ${t1}/${t2} Hz; 2-D ${f2[0]}/${f2[1]} Hz; area quantisation mean ${r3.areaMeanAbsErrorCm2.toFixed(3)} cm²`);
  check(Math.abs(a1-f2[0])<100 && Math.abs(a2-f2[1])<200, `/${v}/ 3-D vs 2-D resonance comparison`, `ΔF1 ${a1-f2[0]} Hz; ΔF2 ${a2-f2[1]} Hz`);
  vowelRows.push({v,target:[t1,t2],twoD:f2.slice(0,2),threeD:f3.slice(0,2)});
}
console.log('VOWEL COMPARISON (Hz)');
for(const r of vowelRows) console.log(`/${r.v}/ target ${r.target.join('/')} | 2D ${r.twoD.join('/')} | 3D ${r.threeD.join('/')}`);

// 6) Run the speech renderer itself with deterministic frame data.
const deps = {
  kPlan: phonemes => phonemes, kFrames: segments => segments,
  kPitch: frames => Float32Array.from(frames, f => f.pitch || 115),
  kSmooth: a => a,
  shapeFromFormants: () => Float32Array.from({ length: 32 }, (_, i) => {
    const x = i / 31;
    return 2.2 * (1 - 0.58 * Math.exp(-Math.pow((x - 0.62) / 0.12, 2))) * (1 + 0.12 * Math.sin(Math.PI*x));
  }),
  MESH_L: 32, MESH_UNIT: 0.35, KV: {}, KP: { p: {} }, KF: { s: {} }, KS: { n: [0,0,0,0,0,1] }, AREA_FUNCTIONS: { p: {loc:95}, s: {loc:90}, n: {loc:85} }
};
const engine = M.createWebsterMesh3D(deps);
const vowelFrames = Array.from({ length: 30 }, () => ({ ph: 'a', F1: 730, F2: 1090, av: 1, ah: 0, af: 0, nasal: 0, pitch: 115 }));
const rendered = engine.renderFrames(vowelFrames, { pitch: 115, rate: 1 });
check(rendered.samples.length > 22050 * 0.1, '3-D speech path returns a non-trivial utterance');
check(rendered.metrics.finite && rendered.samples.every(Number.isFinite), '3-D speech output contains only finite samples');
check(rendered.samples.some(v => Math.abs(v) > 1e-5), '3-D speech output is non-silent for voiced excitation');
check(rendered.sampleRate === 22050, '3-D renderer returns Webster output sample rate');
check(rendered.timeline[0].pressureSlice.length === 81, 'diagnostic snapshot is sampled from the actual 3-D pressure field');
check(rendered.metrics.activeCellAreaMeanAbsErrorCm2 >= 0, 'cross-sectional voxel area error is reported');
const routed = engine.render(vowelFrames, {pitch:115,rate:1});
check(routed.samples.length === rendered.samples.length, 'm3Render path routes Webster phoneme/frame helpers into the 3-D solver');
const synthInstance = new engine.Mesh3DSynth();
check(synthInstance.render(vowelFrames,{pitch:115,rate:1}).samples.length === rendered.samples.length, 'Mesh3DSynth exposes the inherited engine render interface');


// 7) Consonant closures/releases, frication, aspiration and nasal coupling.
const articulation = [
  {ph:'a',F1:730,F2:1090,av:1,pitch:115},
  {ph:'p',F1:250,F2:1500,av:0,ah:0,af:0,pitch:115},
  {ph:'p',F1:250,F2:1500,av:0,ah:0.5,af:0.9,burst:1,pitch:115},
  {ph:'s',F1:320,F2:1700,av:0,ah:0,af:0.85,pitch:115},
  {ph:'n',F1:270,F2:1700,av:0.5,ah:0,af:0,nasal:2,pitch:115},
  {ph:'a',F1:730,F2:1090,av:1,pitch:115}
];
const art = engine.renderFrames(articulation, {pitch:115,rate:1});
check(art.metrics.finite && art.samples.every(Number.isFinite), 'stop/fricative/nasal sequence remains finite');
let maxStep=0;for(let i=1;i<art.samples.length;i++)maxStep=Math.max(maxStep,Math.abs(art.samples[i]-art.samples[i-1]));
check(maxStep<1.5, 'articulatory transitions have bounded adjacent-sample steps', `max Δ ${maxStep.toFixed(3)}`);
const nasalOff=articulation.map(f=>({...f,nasal:0}));
const artNoNose=engine.renderFrames(nasalOff,{pitch:115,rate:1});
const diff=art.samples.reduce((a,v,i)=>a+Math.abs(v-artNoNose.samples[i]||0),0)/art.samples.length;
check(diff>1e-6, 'nasal coupling changes the rendered acoustic signal', `mean absolute difference ${diff.toExponential(2)}`);

// 6) Full render timing is measured, never asserted as a machine-independent pass/fail threshold.
const t0 = process.hrtime.bigint();
engine.renderFrames(vowelFrames, { pitch: 115, rate: 1 });
const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(`INFO render benchmark: ${elapsedMs.toFixed(1)} ms for ${(rendered.samples.length / rendered.sampleRate).toFixed(3)} s of speech on this host`);


// 8) If run from an integrated Webster checkout, exercise the actual v5.1 planner,
// frame builder and complete regression sentence. This section is intentionally
// conditional so the standalone solver bundle can also be tested on its own.
const indexPath = path.join(__dirname, '..', 'index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const cut = (a,b) => html.slice(html.indexOf(a), html.indexOf(b));
  const af = html.indexOf('const AREA_FUNCTIONS = {');
  const areaSrc = html.slice(af, html.indexOf('\n};', af) + 3);
  const klattSrc = cut('// ==== WEBSTER KLATT CORE (v4) ====', '// ==== END WEBSTER KLATT CORE ====');
  const meshSrc = cut('// ==== WEBSTER MESH CORE (v5) ====', '// ==== END WEBSTER MESH CORE ====');
  const D = new Function(areaSrc + klattSrc + meshSrc + '; return {kPlan,kFrames,kPitch,kSmooth,KV,KS,KP,KF,AREA_FUNCTIONS,MESH_L,MESH_UNIT,mShapeFromFormants,mRender,kRender};')();
  const integrated = M.createWebsterMesh3D({ ...D, shapeFromFormants: D.mShapeFromFormants });
  const sentence = 'h ɛ l o _ k h æ m _ . ð ə _ f r a g z _ a r _ s ɪ ŋ ɪ ŋ _ ɪ n _ n ɪ n ɛ t i _ s ɪ k s _ .'.split(' ');
  const cfg = {pitch:115,rate:1,formantScale:1,brightness:1,roughness:0};
  const tFull = process.hrtime.bigint();
  const full3 = integrated.render(sentence,cfg);
  const elapsedFull = Number(process.hrtime.bigint()-tFull)/1e6;
  const full2 = D.mRender(sentence,cfg), fullFormant = D.kRender(sentence,cfg);
  check(full3.samples.length > 22050 && full3.samples.every(Number.isFinite), 'integrated full sentence renders through 3-D mesh');
  check(full3.samples.some(v=>Math.abs(v)>1e-5), 'integrated full sentence is non-silent');
  check(Math.abs(full3.samples.length/22050 - full2.samples.length/22050) < 0.15, '3-D and 2-D sentence durations are comparable', `${(full3.samples.length/22050).toFixed(2)} s vs ${(full2.samples.length/22050).toFixed(2)} s`);
  console.log(`INFO integrated full sentence: 3-D ${(full3.samples.length/22050).toFixed(2)} s, 2-D ${(full2.samples.length/22050).toFixed(2)} s, Formant ${(fullFormant.samples.length/22050).toFixed(2)} s; 3-D render ${elapsedFull.toFixed(1)} ms`);
} else {
  console.log('INFO integrated full-sentence test skipped: run this test from a Webster checkout containing index.html.');
}

if (failures) {
  console.error(`FAIL (${failures} test(s))`);
  process.exit(1);
}
console.log('PASS');
