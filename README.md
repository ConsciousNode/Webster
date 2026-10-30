# Webster
Offline local formant speech synthesis.

**One HTML file. No dependencies, no server, no browser TTS.** Webster makes speech from scratch with the Web Audio API, the way the speaking machines of the 1970s and 80s did, and it works offline.

→ **Try it: [consciousnode.github.io/Webster](https://consciousnode.github.io/Webster/)**, or download `index.html` and open it.

## Engines

| Engine | What it is |
|---|---|
| **Formant** (default, v4) | Klatt-style synthesis, the design behind MITalk and DECtalk. A glottal pulse runs through a cascade of five resonators (the vocal tract). Noise runs through parallel bands for hiss and stop bursts, with aspiration after p/t/k and nasal zeros for m/n/ŋ. Transitions between sounds are smoothed both ways in time, which is where coarticulation comes from. It renders samples directly, so what you hear is exactly what *Export WAV* saves. |
| **Retro** | The original v3 engine: a sawtooth through three band filters. Buzzier and very 1980s. Kept on purpose. |
| **Physical** (v5, experimental) | A 2-D digital waveguide mesh of the vocal tract: a 17.6 cm grid of cells, its width at each point following the tract's shape, through which pressure waves actually travel. It is driven by the same plan, melody and glottal pulse as Formant, so only the tract differs. Vowel shapes are fitted against the mesh itself to the same formant targets (most within 0–6%); consonants close or narrow the tract at their place, with noise at the constriction and a nasal branch that opens for m/n/ŋ. It renders about twice as fast as real time. Known limit: front vowels come out low in F2 (/i/ about 20%), so they sound a bit lax. |

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

## Changelog

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
