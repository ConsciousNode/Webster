# Webster
Offline local formant speech synthesis.

**One HTML file. No dependencies, no server, no browser TTS.** Webster makes speech from scratch with the Web Audio API, the way the speaking machines of the 1970s and 80s did, and it works offline.

→ **Try it: [consciousnode.github.io/Webster](https://consciousnode.github.io/Webster/)**, or download `index.html` and open it.

## Engines

| Engine | What it is |
|---|---|
| **Formant** (default, v4) | Klatt-style synthesis, the design behind MITalk and DECtalk. A glottal pulse runs through a cascade of five resonators (the vocal tract). Noise runs through parallel bands for hiss and stop bursts, with aspiration after p/t/k and nasal zeros for m/n/ŋ. Transitions between sounds are smoothed both ways in time, which is where coarticulation comes from. It renders samples directly, so what you hear is exactly what *Export WAV* saves. |
| **Retro** | The original v3 engine: a sawtooth through three band filters. Buzzier and very 1980s. Kept on purpose. |
| **Physical 2D** (v5, experimental) | A 2-D digital waveguide mesh of the vocal tract: a 17.6 cm grid of cells, its width at each point following the tract's shape, through which pressure waves actually travel. It is driven by the same plan, melody and glottal pulse as Formant, so only the tract differs. Vowel shapes are fitted against the mesh itself to the same formant targets (most within 0–6%); consonants close or narrow the tract at their place, with noise at the constriction and a nasal branch that opens for m/n/ŋ. It renders about twice as fast as real time. Known limit: front vowels come out low in F2 (/i/ 22%, /e/ 18%, /ɪ/ 16%), so they sound a bit lax. |
| **Physical 3D** (v6, very experimental) | The same idea in three dimensions: a 32 × 9 × 9 voxel tract (17.8 cm, oval cross-sections) through which pressure waves travel in all three directions, at 110,250 Hz. Same plan, melody and glottal pulse as the other engines, plus a nose that both listens to and drains the tract. Its vowels track Physical 2D (it starts from the same shapes, so it has the same lax front vowels; /u/ is worse). Rendering is about 1.7× slower than real time, and s-sounds are too quiet for now. Written by ChatGPT ("Jeep"); see [docs/PHYSICAL-3D.md](docs/PHYSICAL-3D.md), and [the roadmap](docs/PHYSICAL-3D-ROADMAP.md). |

## Languages

English (dictionary + letter-to-sound rules), German, Spanish, French, Italian, Greek, Russian, Bulgarian, Ukrainian, Japanese (kana), Korean (Hangul). Numbers are spoken in the selected language.

## Use it from another page

```js
// same page
window.webster.speak("Hello world", { preset: "hal", rate: 0.8 });
// from a parent page, with Webster in an iframe
iframe.contentWindow.postMessage({ target: "webster", action: "speak", text: "Hello", options: { lang: "ja" } }, "*");
```

Options: `lang`, `pitch`, `rate`, `preset`, `natural`. Actions: `speak`, `stop`, `pause`, `resume`, `getPresets`.

The [Pip Suite](https://github.com/ConsciousNode/HTMLNLM) (Pip's Room, Multi-Pip Chat) speaks with Webster's Formant engine, extracted by `tools/webster/extract.py` in HTMLNLM.

## Tests

`node tests/webster-vowels.js` renders steady vowels and measures their formants by LPC (needs python3 + numpy) against the Peterson & Barney targets the engine aims at. All six vowels land within 20%, most within 10%.

`node tests/webster-mesh.js` (no dependencies) checks the Physical engine: a uniform tube rings at its quarter-wave modes (480/1440/2395 Hz, theory 480/1439/2399), the fitted vowels ring near their targets, and a whole sentence renders with no sound louder than twice the median vowel.

`node tests/webster-mesh3d.js` (no dependencies) checks Physical 3D:
- rigid-box modes along all three axes, against the exact discrete theory (within 0.13%)
- that widening the tract changes the side-to-side resonance (4,384 → 2,799 Hz), the proof that the third dimension is in the solver
- the uniform tube (475 Hz vs 482 in theory)
- vowel resonances against the targets and against Physical 2D
- articulation, nasal coupling, and a full sentence through the real planner

## Changelog

### v6 — 2026-10-30 · Kham + ChatGPT ("Jeep") + Kehai Interim
- **New engine: Physical 3D.** A volumetric FDTD mesh of the vocal tract, written by ChatGPT as a standalone deliverable from a prompt Kham commissioned. Kehai inlined it between `WEBSTER MESH 3D CORE` markers, added the engine button, routing, stop and WAV export (following Jeep's own integration guide), and made the visualiser show the tract plus a real pressure cross-section from the solver.
- Verified: Jeep's tests reproduce exactly. Its full-sentence test (which only runs inside a Webster checkout) passes. In Chromium, Play and Export WAV work for all four engines with no errors.
- Known limits: /s/ about 5× quieter than in Physical 2D, front vowels lax (inherited shapes), /u/ F2 +15%, about 1.7× slower than real time.
- The old Physical button is now **Physical 2D**.

### v5.1 — 2026-10-29 · Kham + Kehai Interim
- **The pop after nasals is gone.** The nose branch only listened to the tract and never drained it, so with the mouth closed for m/n/ŋ the cavity behind the closure was sealed. Pressure built up for the whole nasal and burst out at the release: one thump after "in Ninety" twice as loud as anything else, which also made the whole sentence quieter by setting the volume. Now an open velum leaks pressure, as the real nose does, and for ŋ the nasal port sits behind the tongue's closure. Peak after the long /n/ went from 15.8× a typical level to 5.0× (an ordinary vowel peak), and overall loudness doubled.
- Corrected the front-vowel F2 numbers: /e/ and /ɪ/ are 18% and 16% low, not 11–14% as v5 said.

### v5 — 2026-10-29 · Kham + Kehai Interim
- **Physical engine rebuilt.** The v3 mesh never made a sound (its output tap at the lips was decoupled from the mesh, so it stayed at zero). It now speaks: a new mesh core at 88.2 kHz with a real 17.6 cm tract, vowel shapes fitted against the mesh, consonant closures and channels, frication and aspiration noise, a nasal branch, and levels balanced against Formant sound by sound.
- The source goes in as the rate of change of glottal flow, so a closed mouth (a stop, a nasal) can't build up pressure and pop on release.
- Physical now renders samples directly, so playback and *Export WAV* are the same audio, and the visualiser draws the tract shape for the current sound.
- New test: `tests/webster-mesh.js`.

### v4.1 — 2026-10-27 · Kham + Kehai Interim
- Less breathy in *Natural* mode (less noise mixed into the voice, a narrower glottal opening).

### v4 — 2026-10-27 · Kham + Kehai Interim
- New **Formant** engine (Klatt-style cascade/parallel). The v3 engine stays as **Retro**.
- No more 85 ms of silence after every word: speech runs on. Silence inside sentences went from 27–30% to 2–17%.
- Gentler melody: stressed syllables get +9% pitch on a gently falling line (it was a 35% jump). Questions rise, exclamations fall from higher, and the last syllable of a phrase is lengthened.
- Better English letter-to-sound rules for words not in the dictionary: silent e (make, ate), final y (happy / fly), soft c and g, r-coloured vowels, -le, doubled consonants, silent letters (kn, wr, mb). Diphthongs are kept; they used to be dropped.
- Plurals and past tenses stay one word ("crickets" used to be read as "cricket" + "s").

### v3
- Formant engine (sawtooth + three band filters), Physical (waveguide mesh) engine, 11 languages, presets, WAV export, postMessage API. Kept as `webster-v3.html`.

## License

MIT. A ConsciousNode SoftWorks project.
