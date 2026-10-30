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

## Added later that night (Oct 30, ~1 am)

10. **Cache the state, not the audio.** The mesh is a linear recurrent network with a constant-size state (~20 KB for
    32 × 9 × 9). Snapshot it at phoneme boundaries; ROSA finds the longest rendered prefix and the snapshot resumes
    it exactly. The planner looks ahead (anticipatory coarticulation is real speech, not a leak), so a snapshot
    must sit before that look-ahead window ends. Same structure as the LEARNS R_B leak, opposite verdict: there
    the future was cheating, here it's physics, but bounded. ROSA can chain into nested lookup tables: the context
    it finds indexes the snapshot/atlas tables.
11. **The DOOM principle: an envelope atlas.** Don't simulate the tract, reproduce its *effect*: measure the
    spectral-envelope shapes (and the glides between sounds) from real speech, and play the glottal source
    through them. AuraGraph's analysis is both the window and the builder: a tile's geometry (formant ridges as
    curves, read on the labelled grid) is the shape the atlas stores. The fast path. Pairs with OmniVocal's 10
    voice dimensions. Blend many speakers (Common Voice, Spoken Wikipedia) so voices stay *character, not identity*.
12. **The atlas trains the mesh.** The same measured envelopes become the AdamW targets for the slow true path,
    so the physics learns real voices instead of 1952 textbook formants.
13. **Mesh as teacher.** This is already OmniVocal's stage 1 (a "Neural Webster" trained on Webster output):
    Physical 3D is the teacher it can learn from.
14. **Moving mouths from the Slice Suite.** The tract is a voxel map, so Slice of Life can sculpt shapes (an /l/
    by hand), and SliceWorks' joints map onto articulators: a hinge for the jaw, a chain for the tongue, voxelised
    into the mesh each frame.
15. **A Jev-style picker.** A fast one-pass classifier that picks the atlas entry for each frame from its context,
    instead of a search.
