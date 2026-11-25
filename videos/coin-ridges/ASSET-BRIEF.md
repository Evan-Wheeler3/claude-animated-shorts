# Asset brief: coin-ridges (Why Coins Have Ridges)

## Story
- story-id / branch for Codex: `coin-ridges` → `codex/coin-ridges`
- Setting and period: London, 1660s-1690s (back rooms, the Royal Mint inside the Tower of London, a market, a
  candlelit interrogation room), plus a few present-day shots of a modern coin. Feel: warm candlelight, cosy
  mischief, a little spooky for the Newton chase. Comedic, not grim.
- Look: chunky stylised low-poly, clean readable silhouettes, simple flat or painted colours. Black ink is drawn
  on every edge, so avoid fine noisy detail. Our 2D characters are ~1.6-1.8 m tall (adults); size props to match.
- **Scale note for coins:** coins are filmed in extreme close-up. Build them at real size (metres) but with
  **chunky, countable detail**: about 60 big reeds on the modern coin, not 119 hairline ones.

## Assets
Size is width (X) × height (Y) × depth (Z) in metres, +Y up, −Z forward. Tolerance ±15 % unless stated.

### `coin-modern-quarter`
| Field | Value |
|---|---|
| Used in shots | 1, 2, 27-31: ECU hero |
| What it is | A modern quarter-sized coin (generic design: no real country's portrait, text or emblem) |
| Must read as | A coin standing on its edge with **~60 chunky raised reeds** all round the rim; raised rim on both faces; simple embossed portrait silhouette + a few dots for lettering |
| Avoid | Smooth edge; real US Mint artwork or text; hairline reeds that turn to ink scribble |
| Size (m) | 0.0243 × 0.0243 × 0.00175 (coin faces ±Z, standing on its edge), ±5 % |
| Pivot | `center` |
| Triangle budget | 12,000 |
| Materials (named) | `coin_face`, `coin_edge` |
| Moving parts | none |
| Search hints | Model it (`original`): a cylinder with an extruded reed ring is quicker than searching |

### `coin-hammered`
| Field | Value |
|---|---|
| Used in shots | 3-9, 15, 17-18: CU / ECU |
| What it is | A 1600s hand-hammered English silver coin: thin, slightly lumpy, not perfectly round |
| Must read as | Irregular wobbly outline, **smooth edge with no pattern**, a crude cross and a blobby crowned head stamped on the faces |
| Avoid | Perfect circle; any edge pattern; gold colour |
| Size (m) | 0.032 × 0.032 × 0.0012 (faces ±Z) |
| Pivot | `center` |
| Triangle budget | 6,000 |
| Materials (named) | `silver` |
| Moving parts | `sliver`: one thin crescent piece of the rim (about 1/8 of the edge, 2 mm wide) as its own node, resting **in place, flush**, so Claude can drop it away when the shears snip |
| Search hints | Model it |

### `coin-milled`
| Field | Value |
|---|---|
| Used in shots | 14-16, 18, 22-23: ECU |
| What it is | A 1660s English machine-struck silver crown: perfectly round, crisp |
| Must read as | Clean circle, flat raised rim, **a chunky repeating pattern on the edge** (lettering blocks or diagonal grain: big enough to read under ink), a stylised crowned head |
| Avoid | Modern look; hairline detail |
| Size (m) | 0.039 × 0.039 × 0.0025 (faces ±Z) |
| Pivot | `center` |
| Triangle budget | 10,000 |
| Materials (named) | `silver`, `coin_edge` |
| Moving parts | `bite`: a small chunk of the rim (about 1/10 of the edge, including its edge pattern) as its own node, resting **in place, flush** |
| Search hints | Model it; can share topology with `coin-modern-quarter` |

### `straight-razor`
| Field | Value |
|---|---|
| Used in shots | 4-6, 30: CU (in a 2D hand) |
| What it is | A 1600s-style folding straight razor, blade open |
| Must read as | Long shiny blade + chunky wooden handle; unmistakably a razor |
| Size (m) | 0.25 × 0.03 × 0.015 (blade along X) |
| Pivot | `center` |
| Triangle budget | 2,000 |
| Materials (named) | `steel`, `wood` |
| Moving parts | none |
| Search hints | Poly Pizza CC0 "straight razor", Quaternius props |

### `shaving-brush` and `shaving-mug`
| Field | Value |
|---|---|
| Used in shots | 4, 30: CU |
| What it is | A fat badger-style shaving brush with a turned wooden handle; a ceramic mug with a foam dome |
| Must read as | Comically fat bristle head; mug with a big white foam top |
| Size (m) | brush 0.06 × 0.12 × 0.06; mug 0.09 × 0.1 × 0.09 |
| Pivot | `bottom-center` |
| Triangle budget | 2,500 each |
| Materials (named) | brush: `bristle`, `wood`; mug: `ceramic`, `foam` |
| Search hints | Model it or Poly Pizza CC0 |

### `clipping-shears`
| Field | Value |
|---|---|
| Used in shots | 7-8, 16: ECU insert |
| What it is | Heavy 1600s iron hand shears (like tin snips) |
| Must read as | Two thick blades, two looped handles, a pivot rivet |
| Size (m) | 0.22 × 0.02 × 0.07 (closed, along X) |
| Pivot | `center` |
| Triangle budget | 3,000 |
| Materials (named) | `iron` |
| Moving parts | see table: `blade_upper` rotates to open |

| Node name pattern | Count | Hinge edge (`pivot`) | Rest pose | Opens by rotating | Notes |
|---|---|---|---|---|---|
| `^blade_upper$` | 1 | `center` (the rivet) | closed, blades together | spins about the rivet (no `open` check: it is not a lid) | lower blade + handle are the static mesh |

```json
"parts": [{"pattern": "^blade_upper$", "count": 1, "pivot": "center"}]
```

### `crucible`
| Field | Value |
|---|---|
| Used in shots | 9: MS |
| What it is | A clay melting pot on a small iron tripod over a brazier |
| Must read as | Thick clay pot, brazier bowl of coals (Claude adds fire and glow) |
| Size (m) | 0.4 × 0.55 × 0.4 overall |
| Pivot | `bottom-center` |
| Triangle budget | 4,000 |
| Materials (named) | `clay`, `iron`, `coal` |

### `silver-ingot`
| Field | Value |
|---|---|
| Used in shots | 10: CU |
| What it is | A small cast silver bar |
| Must read as | Trapezoid bar with soft bevels |
| Size (m) | 0.12 × 0.03 × 0.05 |
| Pivot | `bottom-center` |
| Triangle budget | 500 |
| Materials (named) | `silver` |

### `workbench`
| Field | Value |
|---|---|
| Used in shots | 3-10, 23: MS / CU background |
| What it is | A rough 1600s back-room work table with a candle stub, a few scattered tools |
| Must read as | Thick planks, chunky legs; table top at 0.75 m |
| Size (m) | 1.4 × 0.78 × 0.7 |
| Pivot | `bottom-center` |
| Triangle budget | 6,000 |
| Materials (named) | `wood`, `iron`, `wax` |
| Search hints | Kenney Furniture Kit, Quaternius Medieval Village |

### `candle`
| Field | Value |
|---|---|
| Used in shots | 3, 25: CU |
| What it is | Tallow candle in a pewter holder (Claude adds the flame) |
| Size (m) | 0.1 × 0.2 × 0.1 |
| Pivot | `bottom-center` |
| Triangle budget | 1,000 |
| Materials (named) | `wax`, `pewter` |

### `screw-press`
| Field | Value |
|---|---|
| Used in shots | 13: WS hero |
| What it is | A 1660s coining screw press: a heavy iron frame, a big vertical screw, and **a long horizontal bar with weighted balls on each end** that workers pull to spin the screw |
| Must read as | Tall iron arch frame on a stone block, the screw, the long bar wider than two men |
| Size (m) | 3.2 (bar span) × 2.2 × 1.2 |
| Pivot | `bottom-center` |
| Triangle budget | 15,000 |
| Materials (named) | `iron`, `stone`, `wood` |
| Moving parts | see table |
| Part sizes | Bar at ~1.3 m height (a 1.75 m worker pulls it at chest height) |

| Node name pattern | Count | Hinge edge (`pivot`) | Rest pose | Opens by rotating | Notes |
|---|---|---|---|---|---|
| `^screw_bar$` | 1 | `center` (screw axis) | bar along X | spins about Y (no `open` check: it is not a lid) | screw + bar + weights in this node; they spin together |

```json
"parts": [{"pattern": "^screw_bar$", "count": 1, "pivot": "center"}]
```

### `mint-interior`
| Field | Value |
|---|---|
| Used in shots | 13: WS set |
| What it is | Stone-walled workshop room inside the Tower: stone floor, arched window, wooden beams, a bench along a wall |
| Must read as | A room (floor + 2 walls + ceiling beams), open towards −Z for the camera |
| Size (m) | 8 × 4.5 × 6 |
| Pivot | `bottom-center` |
| Triangle budget | 15,000 |
| Materials (named) | `stone`, `wood`, `plaster` |
| Search hints | Quaternius Medieval Village / Dungeon kits |

### `mint-furnace`
| Field | Value |
|---|---|
| Used in shots | 18: WS |
| What it is | A big brick melting furnace with a wide mouth and a chute out the side (old coins go in, new coins come out) |
| Size (m) | 2.5 × 2.6 × 2 |
| Pivot | `bottom-center` |
| Triangle budget | 8,000 |
| Materials (named) | `brick`, `iron` |

### `tower-mint-exterior`
| Field | Value |
|---|---|
| Used in shots | 19: WS background |
| What it is | Stylised Tower of London: a square stone keep with four corner turrets topped by small domes, a curtain wall in front |
| Must read as | The White Tower silhouette at phone size |
| Avoid | Tower Bridge; Big Ben |
| Size (m) | 36 × 30 × 32 |
| Pivot | `bottom-center` |
| Triangle budget | 12,000 |
| Materials (named) | `stone`, `roof` |

### `market-stall`
| Field | Value |
|---|---|
| Used in shots | 17: WS |
| What it is | 1690s market stall: plank counter, striped awning, a few sacks and baskets |
| Size (m) | 2.5 × 2.4 × 1.4 |
| Pivot | `bottom-center` |
| Triangle budget | 6,000 |
| Materials (named) | `wood`, `canvas`, `sack` |
| Search hints | Kenney Holiday / Quaternius Medieval market props |

### `interrogation-table`
| Field | Value |
|---|---|
| Used in shots | 24-25: MS |
| What it is | Dark oak table with two high-backed chairs, an inkpot, a quill and a stack of papers |
| Size (m) | 1.6 × 1.2 (chair backs) × 1.6 overall; table top at 0.75 m |
| Pivot | `bottom-center` |
| Triangle budget | 8,000 |
| Materials (named) | `wood`, `paper`, `ink` |

### `courtroom-bench`
| Field | Value |
|---|---|
| Used in shots | 11: MS foreground |
| What it is | A judge's raised wooden bench with a gavel and its block resting on it |
| Size (m) | 2.4 × 1.3 × 1 |
| Pivot | `bottom-center` |
| Triangle budget | 5,000 |
| Materials (named) | `wood` |
| Moving parts | `gavel`: separate node resting on its block, origin at the handle end |

### `gallows`
| Field | Value |
|---|---|
| Used in shots | 12: WS **silhouette only** |
| What it is | Simple wooden gallows frame (two posts, a beam, a short ladder), **no rope** (Claude adds it) |
| Size (m) | 3 × 4 × 1.5 |
| Pivot | `bottom-center` |
| Triangle budget | 2,000 |
| Materials (named) | `wood` |

### `apple`
| Field | Value |
|---|---|
| Used in shots | 21: CU |
| What it is | A cartoon red apple with a stem and one leaf |
| Size (m) | 0.08 × 0.09 × 0.08 |
| Pivot | `center` |
| Triangle budget | 1,000 |
| Materials (named) | `apple`, `stem`, `leaf` |

### `modern-table`
| Field | Value |
|---|---|
| Used in shots | 27: CU background |
| What it is | Plain modern wooden kitchen table top section |
| Size (m) | 1.2 × 0.75 × 0.8 |
| Pivot | `bottom-center` |
| Triangle budget | 2,000 |
| Materials (named) | `wood` |

## Common defects (all happened on Vasa; Codex checks for each before delivering)
- Moving parts resting open, or pivoting on the wrong edge.
- Parts the wrong size for a person (the press bar must sit at chest height on a 1.75 m worker).
- Coin detail too fine for black ink outlines (hairline reeds turn to scribble at phone size).
- Real-world coin designs (US Mint artwork or text): keep every coin generic.
- Sliver/bite parts that don't sit flush when at rest.

## Acceptance (Claude fills in at stage 3)
| Asset | Checker | Rough still (our scene) | Verdict | Notes / fix requested |
|---|---|---|---|---|
