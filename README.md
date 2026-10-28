# Webster
Offline local formant speech synthesis.

**One HTML file. No dependencies, no server, no browser TTS.** Webster makes speech from scratch with the Web Audio API, the way the speaking machines of the 1970s and 80s did, and it works offline.

→ **Try it: [consciousnode.github.io/Webster](https://consciousnode.github.io/Webster/)**, or download `index.html` and open it.

## Engines

| Engine | What it is |
|---|---|
| **Formant** (default, v4) | Klatt-style synthesis, the design behind MITalk and DECtalk. A glottal pulse runs through a cascade of five resonators (the vocal tract). Noise runs through parallel bands for hiss and stop bursts, with aspiration after p/t/k and nasal zeros for m/n/ŋ. Transitions between sounds are smoothed both ways in time, which is where coarticulation comes from. It renders samples directly, so what you hear is exactly what *Export WAV* saves. |
| **Retro** | The original v3 engine: a sawtooth through three band filters. Buzzier and very 1980s. Kept on purpose. |
| **Physical** | Experimental: a 2-D digital waveguide mesh of the vocal tract. |

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

## Changelog

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
