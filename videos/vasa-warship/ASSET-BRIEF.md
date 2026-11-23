# Vasa — asset brief for Codex

## Story
- story-id / branch for Codex: `vasa-warship` → `codex/vasa-warship`
- Setting and period: Stockholm harbour, 1628 (Swedish 17th-century warship, quay, castle); plus one 1961 salvage scene.
- Look: chunky stylised low-poly, clean readable silhouettes, simple flat or painted colours. Black ink is drawn
  on every edge, so avoid fine noisy detail. Our 2D characters are ~1.6-1.8 m tall (adults); size props to match.
- **Already covered, don't deliver:** characters, water/splashes/smoke, Stockholm town houses (procedural in
  `templates/bridge/build.ts`), museum hall, punching-bag toy, effect cards.
- Existing Kenney CC0 kits used by the bridge short live in the Remotion project's `public/`, which is not in this
  repo, so it can't be checked from here. Sourcing from the same Kenney kits is welcome.

## Assets
Size is width (X) × height (Y) × depth (Z) in metres, +Y up, −Z forward. For ships, the bow points to −Z.

### `vasa`: hero
| Field | Value |
|---|---|
| Used in shots | 1-5, 7-10, 14-21, 25, 27, 32-35. Closest framing: ECU of gunports, stern carving and deck level |
| What it is | A 1620s Swedish warship (galleon type): high stern castle, three masts plus bowsprit, **two full rows of gunports per side**, a walkable open upper deck |
| Must read as | Tall, top-heavy and proud: very high stern, two stacked gunport rows, red upper works, a carved and gilded stern. Its silhouette should look too tall for its hull |
| Avoid | Generic pirate ship with one gun row; black-and-white "Napoleonic" stripes; photoreal scan; modern rigging |
| Size (m) | 12 × 52 × 69 (beam × keel-to-mainmast-top × bowsprit-to-stern), tolerance ±20 % |
| Pivot | `bottom-center` (bottom of the keel at y = 0) |
| Triangle budget | 80,000 |
| Materials (named) | `hull_wood`, `paint_red`, `gilt`, `carving_blue`, `carving_green`, `sail`, `rope`, `metal` |
| Moving parts | Separate nodes, each with its own pivot: `gunport_lid_*` (hinged at the top edge, every lid), `sail_*` (each sail, so 4 can be shown set and the rest furled), `rudder`. An **open lower gun deck interior** (floor, ceiling, inner hull) sized so a camera can sit inside, for shots 3 and 20 |
| Search hints | Poly Pizza / Quaternius / Kenney "galleon", "ship of the line", "17th century ship". Modifying a CC0 galleon (add the second gun row, raise the stern) is fine; say what you changed in `notes` |

### `cannon-24pdr`
| Field | Value |
|---|---|
| Used in shots | 3, 20. Closest framing: ECU |
| What it is | A 17th-century bronze muzzle-loading cannon on a wooden truck carriage with four small wheels |
| Must read as | A bronze (not black iron) barrel, chunky carriage |
| Size (m) | 0.9 × 0.9 × 3.0, tolerance ±25 % |
| Pivot | `bottom-center` |
| Triangle budget | 4,000 |
| Materials (named) | `bronze`, `wood`, `metal` |
| Moving parts | `barrel` node separate from the carriage |
| Search hints | Kenney Pirate Kit cannon, Quaternius pirate pack |

### `rowboat`
| Field | Value |
|---|---|
| Used in shots | 14, 21. Closest framing: WS |
| What it is | Small wooden harbour rowing boat, period-neutral |
| Size (m) | 1.6 × 0.7 × 5.0, tolerance ±20 % |
| Pivot | `bottom-center` |
| Triangle budget | 3,000 |
| Materials (named) | `wood` |
| Moving parts | `oar_*` nodes |
| Search hints | Kenney Pirate Kit / Watercraft Kit rowboat |

### `quay-segment`
| Field | Value |
|---|---|
| Used in shots | 7, 10, 13. Closest framing: MS with characters on it |
| What it is | A timber quay section on posts with a mooring bollard; tiles along X |
| Must read as | Heavy, old timber; posts going into the water |
| Size (m) | 8 × 2.5 × 4, tolerance ±20 % (top of the deck at y = 2.5, posts reach y = 0) |
| Pivot | `bottom-center` |
| Triangle budget | 3,000 |
| Materials (named) | `wood`, `stone` |
| Search hints | Kenney Pirate Kit dock pieces |

### `tre-kronor-castle`: background only
| Field | Value |
|---|---|
| Used in shots | 14. Background WS, 200+ m away |
| What it is | A **stylised** 17th-century Stockholm castle: a broad block with a tall central tower topped by a spire with three crowns. Its exact appearance is unverified, so keep it clearly stylised, not a reconstruction |
| Size (m) | 80 × 60 × 50, tolerance ±30 % |
| Pivot | `bottom-center` |
| Triangle budget | 15,000 |
| Materials (named) | `stone`, `roof`, `gilt` |
| Search hints | No match likely: model simply (`"license": "original"`) |

### `deck-props`: three GLBs
| ID | What | Size (m) | Budget | Materials |
|---|---|---|---|---|
| `barrel` | wooden barrel with hoops | 0.6 × 0.9 × 0.6 | 1,500 | `wood`, `metal` |
| `crate` | wooden crate | 0.8 × 0.8 × 0.8 | 500 | `wood` |
| `rope-coil` | coiled rope | 0.8 × 0.2 × 0.8 | 2,000 | `rope` |

All `bottom-center`, ±20 %. Used in shots 9 and 12. Search hints: Kenney Pirate Kit.

### `inquiry-table` and `inquiry-bench`
| ID | What | Size (m) | Budget | Materials |
|---|---|---|---|---|
| `inquiry-table` | long, heavy 17th-century trestle table | 4.0 × 0.8 × 1.2 | 2,000 | `wood` |
| `inquiry-bench` | plain wooden bench | 3.5 × 0.45 × 0.4 | 800 | `wood` |

`bottom-center`, ±20 %. Used in shots 6, 28 and 29. Search hints: Kenney Furniture Kit, Quaternius medieval props.

### `salvage-pontoon-crane`
| Field | Value |
|---|---|
| Used in shots | 32. WS |
| What it is | A **generic** 1960s steel salvage pontoon with a lifting crane or gantry (don't model specific named vessels) |
| Size (m) | 10 × 15 × 30, tolerance ±30 % |
| Pivot | `bottom-center` |
| Triangle budget | 15,000 |
| Materials (named) | `steel`, `paint`, `rope` |
| Search hints | Poly Pizza "barge crane", Kenney Watercraft |

## Copy-paste prompt for Codex
See `CODEX-PROMPT.md`.

## Acceptance (Claude, stage 3, round 1, 2026-11-23)
Codex branch `codex/vasa-warship` @ `3fcfb8a`, merged into `claude/nice-hamilton-t80o5e`. Checker: 11/11 PASS.
Rough stills (540x960, bridge ink pass, Lambert shading, 1.75 m toon sailor for scale) from
`remotion/src/AssetCheck.tsx`: `previews/asset-check/` (labelled `contact-sheet.jpg`).

| Asset | Checker | Rough still | Verdict | Notes / fix requested |
|---|---|---|---|---|
| `vasa` | PASS | 00-08 | **REJECT** | Silhouette, colours, two port rows, sails, stern castle, deck and enterable gun deck all work. **Fix:** (1) every `gunport_lid_*` rests ~20° open; rest pose must be **closed flush** with the hull. (2) Each lid node's origin sits on its **bottom** edge, so rotating it opens it downward like a shelf (still 03); move each lid's origin onto its **top hinge line** so `rotation.z` swings it up and out. (3) Ports and lids are ~2 m tall, taller than a 1.75 m sailor (still 04), which makes the ship read small; make ports ≈ **0.9 × 0.9 m** with lids to match, keeping the two rows and 15 per row per side. |
| `cannon-24pdr` | PASS | 11 | ACCEPT | Reads bronze on a truck carriage; right size next to a sailor. |
| `rowboat` | PASS | 12 | ACCEPT | |
| `quay-segment` | PASS | 13 | **REJECT** | Tiled at 8 m it reads as separate floating slabs with gaps. **Fix:** one continuous planked deck covering the full 8 × 4 m top so tiles join seamlessly along X, posts and stone shoes underneath, bollard on the water edge. |
| `tre-kronor-castle` | PASS | 14 | ACCEPT | Background only; stylised as briefed. |
| `barrel` | PASS | 15 | ACCEPT | |
| `crate` | PASS | 15 | **REJECT** | Open-topped frame reads as an empty box. **Fix:** closed crate with a planked lid. |
| `rope-coil` | PASS | 15 | ACCEPT | |
| `inquiry-table` / `inquiry-bench` | PASS | 16 | ACCEPT | |
| `salvage-pontoon-crane` | PASS | 17 | ACCEPT | |

Known Claude-side items (not asset defects): sailors' ship-era outfits; gun-deck interior lighting; shot 5's carved
lion will be a Claude effect card on the stern if the model's stern ornaments don't carry an ECU.

## Acceptance round 2 (2026-11-23)
Codex `codex/vasa-warship` @ `7dfabc9` (vasa, quay-segment, crate, assets.json only), merged. Checker 11/11 PASS.

| Asset | Rough still | Verdict | Notes |
|---|---|---|---|
| `vasa` | `r2-03`, `r2-04` | **ACCEPT** | Lids rest closed and flush; origin on the top hinge; ~1.0 × 1.1 m; 60 lids. Port +z / starboard −z swing them up and out (measured amidships). |
| `quay-segment` | `r2-13` | **ACCEPT** | Continuous planked deck, tiles without gaps, posts underneath. |
| `crate` | `r2-15` | **ACCEPT** | Closed, planked lid. |

**All 11 assets accepted.**
