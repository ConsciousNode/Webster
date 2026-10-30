# Physical 3D: where it goes next

Kham's ideas and the plan agreed on Oct 30 2026, starting from the v6 engine. Nothing here is built yet.

1. **Real anatomy, baked in.** Voxelise open 3D vocal-tract MRI datasets once, offline, into small air/wall maps
   that ship inside the file. The browser never sees the scans. The Dresden Vocal Tract Dataset is the first
   candidate: 22 German sounds including a lateral and fricatives, male and female, with *measured* acoustics to
   check against. Aalto (STL meshes) and USC (17 speakers) come after that. Check each dataset's terms before use.
   Ideas and data only, no code: VocalTractLab is GPL, and Webster is MIT. We'd write our own anyway.
2. **A fixed volume with impedance maps** (as in Gully et al. 2018), instead of cells opening and closing. Moving
   between sounds then means blending admittances, and the cause of moving-wall clicks goes away.
3. **Train the tract.** Smooth impedance maps make the whole simulation differentiable. Start from the scanned
   shape and let AdamW move the walls until the mesh's own resonances hit the targets. This is "fit the shapes
   through the instrument", with real machinery.
4. **WebGPU** for the cell update (browser-native, with a CPU fallback). York saw ~4× from a GPU in MATLAB.
5. **Lookup-table updates (T-MAC style).** A cell's update depends only on which of its 6 neighbours are air or
   wall: 2⁶ = 64 patterns, so precompute them all. The geometry map itself is naturally ternary (air / wall /
   boundary). The pressure field stays full precision.
6. **Chunked memory (as in HTMLNLM):** split the grid into small fixed-size blocks that stay in fast memory.
7. **ROSA render cache:** the renderer is deterministic, so the same sounds in the same context with the same voice
   settings produce the same samples. A suffix automaton over phoneme sequences can find the longest stretch
   already rendered and reuse its middle, re-simulating only the edges where context changes the sound.
8. **A physical larynx:** a two-mass vocal-fold model driven by lung pressure and coupled to the tract, so the
   whole chain is physical: lungs → folds → 3D tract → air.
9. **Sounds only 3D can make,** one at a time, /l/ first: air flowing around both sides of the tongue. Then the
   sibilant groove for /s/, the sublingual cavity for /ʃ/, and the piriform sinuses.

First follow-ups on v6 itself: /s/ is too quiet, /u/ F2 is +15%, and it runs ~1.7× slower than real time.
