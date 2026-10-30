> **Origin:** the Physical 3D engine and this method note were written by ChatGPT ("Jeep") as a standalone deliverable
> (Oct 29–30, 2026), from a prompt Kham commissioned. Kehai Interim integrated it into `index.html` and verified it
> in the browser. Its tests reproduced exactly, and Play, Export WAV and the full sentence work. The status table at
> the end is Jeep's, from before integration: see the README changelog (v6) for what is now tested.

# Webster Physical 3D — method and test results

## Numerical method

The solver is a cell-centred, scalar-pressure, explicit 3-D FDTD discretisation of

\[
\frac{\partial^2 p}{\partial t^2}+2\sigma\frac{\partial p}{\partial t}=c^2\nabla^2p+s.
\]

For equal spacing \(\Delta x=\Delta y=\Delta z=h\), define \(\lambda=c\Delta t/h\). The update is

\[
p^{n+1}=\frac{2p^n-(1-\sigma\Delta t)p^{n-1}+\lambda^2\sum_{q\in\{x\pm,y\pm,z\pm\}}(p_q^n-p^n)}{1+\sigma\Delta t}.
\]

The equal-cell 3-D CFL condition is \(\lambda\leq1/\sqrt3\). This implementation uses \(\lambda=0.56\), so \(\lambda\sqrt3=0.96995<1\).

| Quantity | Value |
|---|---:|
| Sound speed | 34,300 cm/s |
| Internal sample rate | 110,250 Hz |
| Output sample rate | 22,050 Hz |
| Decimation | 5:1, windowed-sinc low-pass |
| Cell spacing | 0.5554 cm |
| Longitudinal cells | 32 |
| Cross-section grid | 9 × 9 possible voxels |
| Nominal tract length | 17.77 cm |
| Courant number | 0.56 |
| CFL limit | 0.57735 |
| Pressure loss rate | \(\sigma=42\pi\,s^{-1}\) |

### Boundaries and geometry

- X is longitudinal, Y vertical and Z lateral. All three coordinates participate in the six-neighbour pressure update.
- Missing neighbours at the glottal, vertical and lateral walls are mirrored (zero normal pressure gradient / rigid wall).
- The lip-side ghost neighbour is pressure-release (zero pressure).
- Each longitudinal area sample becomes a cell-centred elliptical Y-Z mask. Lateral/vertical semi-axis ratio is 1.25. This is an explicit modelling assumption, not anatomical information inferred from the 2-D area function.
- The existing v5.1 area function is preserved as the starting area. Cross-sectional area is quantised to whole voxels; the realised area error is reported.
- Newly opened voxels inherit pressure from the nearest previously active voxel in the same slice. Cells removed by a moving boundary are cleared.
- Frication is injected at the constriction slice; aspiration and differentiated glottal-flow excitation enter at the glottal slice.
- The nasal branch is a 1-D side tube with reciprocal pressure-difference coupling at the velum. A closed velum reflects at the junction; an open velum couples the oral port to the nasal branch. This is a first-order junction approximation, not a full area/volume-velocity matched 3-D nasal cavity.

## Analytical solver tests

Rigid rectangular-box modes use the exact discrete eigenfrequency of the finite-difference lattice:

\[
f_d=\frac{f_s}{\pi}\sin^{-1}\!\left(\lambda\sqrt{\sin^2\frac{\pi m_x}{2N_x}+\sin^2\frac{\pi m_y}{2N_y}+\sin^2\frac{\pi m_z}{2N_z}}\right).
\]

Measured frequencies are from the simulated time series, not printed predictions.

| Mode | Grid | Measured | Discrete theory | Continuum theory | Error vs discrete |
|---|---|---:|---:|---:|---:|
| Longitudinal | 32×7×9, (1,0,0) | 965.6 Hz | 964.4 Hz | 964.7 Hz | 0.13% |
| Vertical | 32×7×9, (0,1,0) | 4,384.0 Hz | 4,384.5 Hz | 4,410.0 Hz | 0.01% |
| Lateral | 32×7×9, (0,0,1) | 3,418.4 Hz | 3,418.0 Hz | 3,430.0 Hz | 0.01% |

### Mandatory third-dimension demonstration

Holding X and Y fixed and changing only lateral cell count changes the fundamental lateral resonance:

| Lateral cells | Measured lateral mode |
|---:|---:|
| 7 | 4,384.0 Hz |
| 11 | 2,799.3 Hz |

Difference: **1,584.7 Hz**. The lateral dimension is not a renderer-only coordinate; it changes the solver eigenfrequency.

### Open/closed tube test

For a uniform 32-cell tube, rigid at the glottis and pressure-release at the lips:

- Simulated first resonance: **475 Hz**
- Continuum quarter-wave estimate: **482.3 Hz**
- Difference: **−1.5%**

## Vowel impulse-response comparison

The following uses the v5.1 `MV` fitted vowel-area functions and the same Peterson & Barney targets used by Webster. The 2-D values reproduce the existing `webster-mesh.js` impulse-response method; 3-D values come from the volumetric solver's own impulse response. Frequencies are the first two low-frequency spectral peaks.

| Vowel | Target F1/F2 | Existing 2D | New 3D | 3D F1 error | 3D F2 error |
|---|---:|---:|---:|---:|---:|
| /i/ | 270 / 2290 | 255 / 1780 | 265 / 1800 | −1.9% | −21.4% |
| /ɪ/ | 390 / 1990 | 380 / 1675 | 390 / 1655 | 0.0% | −16.8% |
| /e/ | 460 / 2000 | 430 / 1640 | 445 / 1595 | −3.3% | −20.3% |
| /ɛ/ | 530 / 1840 | 560 / 1635 | 545 / 1590 | +2.8% | −13.6% |
| /æ/ | 660 / 1720 | 625 / 1625 | 620 / 1625 | −6.1% | −5.5% |
| /a/ | 730 / 1090 | 705 / 1110 | 685 / 1060 | −6.2% | −2.8% |
| /ɔ/ | 570 / 840 | 565 / 855 | 535 / 820 | −6.1% | −2.4% |
| /u/ | 300 / 870 | 290 / 870 | 335 / 1000 | +11.7% | +14.9% |
| /ə/ | 500 / 1400 | 495 / 1385 | 480 / 1345 | −4.0% | −3.9% |

The 3-D model broadly tracks the 2-D model; it does **not** solve the known front-vowel F2 limitation. /u/ is notably worse than the 2-D reference in this first geometry. This is useful evidence, not a claim of improved vowel accuracy.

## Speech-frame and articulation tests

The Node test suite also renders deterministic Webster-compatible frame sequences through the 3-D speech path and checks:

- finite and non-silent output;
- 22,050 Hz output and sensible duration;
- real pressure-slice snapshots from the 3-D solver;
- stop closure/release, frication, aspiration, nasal articulation and a vowel transition;
- bounded adjacent-sample differences in the articulation fixture (observed maximum 1.010 after peak limiting);
- measurable output change when velum/nasal coupling is enabled (mean absolute sample difference 5.90×10⁻³ in the fixture).

## Performance

A deterministic 0.230-second voiced fixture took **77–94 ms** across repeated runs in the execution environment used for this test (about 2.6× faster than real time for that short fixture). This is not a full-sentence benchmark and must not be generalized to ordinary consumer hardware. Performance varies with active voxel count, CPU and utterance length.

## Limitations / not yet demonstrated

1. Cross-sectional voxelisation is coarse. The mean absolute area error across tested vowel slices was roughly 0.25–0.50 cm²; some individual slices exceed 1 cm². This is a significant accuracy limitation.
2. The fixed 1.25 lateral/vertical aspect ratio is an explicit generic assumption. Webster's 2-D area functions do not contain patient- or vowel-specific 3-D anatomy.
3. The 1-D nasal branch uses reciprocal pressure-difference coupling but not a fully derived, area-matched multiport volume-velocity junction.
4. Moving-boundary handling is stable in the included articulation fixture, but a formal energy-balance study over repeated closure/reopening and fast transitions remains to be done.
5. The current vowel impulse-response measurements are a first-pass comparison, not perceptual evaluation or a claim that 3-D is more accurate than 2-D.
6. The full app has not yet been browser-integrated in this deliverable. Playback, pause/resume, stop, WAV export, iframe API, full-sentence output, and visualiser behaviour must be verified after applying `INTEGRATION.md`.

## Acceptance status

| Requirement | Status |
|---|---|
| Genuine 3-D pressure update | Demonstrated |
| Three-axis analytical modes | Passed |
| Lateral dimension measurably changes acoustics | Passed |
| Open/closed tube resonance | Passed |
| Vowel F1/F2 measured against v5.1 targets | Measured; accuracy remains mixed |
| 2-D comparison | Measured |
| Consonant/articulation fixture | Passed initial checks |
| Nasal branch has measurable effect | Passed initial check; junction model remains approximate |
| Full Webster sentence | Not yet tested through the integrated app |
| Browser playback / pause / resume / stop | Not yet tested |
| WAV export | Not yet tested |
| Backwards-compatible API / iframe integration | Instructions supplied; not yet tested |
| Consumer-hardware full-sentence benchmark | Not yet measured |

**Conclusion:** the numerical core is genuinely three-dimensional and passes the controlled solver tests. It is a working research prototype, not yet a release-ready Webster engine. The coarse voxel geometry, approximate nasal junction, vowel differences and untested browser integration are explicit remaining work.
