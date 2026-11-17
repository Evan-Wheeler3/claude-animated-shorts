# Hold Up asset catalog

Consult before building anything (search -> reuse/adapt -> create). Conventions unless noted: Three.js r169, metres,
Y up, +Z = front/bow, origin at the base centre; procedural code, no external files; source = original work in this
repo (MIT, see LICENSE). Status: **validated** = audited + rendered in the production pipeline and used in an approved
render; **tested** = audited + rendered in the lab only; **story-specific** = do not reuse without adapting.
Props are converted to the toon look with `toonify()` (`src/pipeline/props3d.ts`) and put down with
`ground.rest()` (`src/pipeline/ground.ts`). Geometry check: `node scripts/audit-props.mjs`.

## Props (`assets/props/holdup-props.js`, preview `previews/catalog_props.jpg`)
| Asset | Function | Size / pivot | Materials | Animation notes | Status / limits |
|---|---|---|---|---|---|
| Oak barrel | `createBarrel({lid, seed})` | 1.37 m tall, 0.92 m bilge, 0.74 m heads (4.5 x 3 ft); base centre; `userData.lidY` | oak/oakLight/oakDark (grain), iron hoops + rivets, endGrain | rotate about its centre with a pivot group (lab `fall_motion`); float draft 0.62 m with ballast | validated (Niagara A-G). `lid:false` shows cushions inside |
| Barrel lid | `createBarrelLid()` | 0.68 m disc; modelled in BARREL space (origin = barrel base) | oakLight boards, iron straps, bolts, hatch | re-centre with a group (`lid.position.y = -lidY`) before posing | validated (Niagara D, G) |
| `BARREL`, `barrelR(y)` | constants + radius profile | | | rim grips: `ringGrips(cam, rimCentre, barrelR(H))` | validated |
| Rescue rowboat | `createRescueBoat({L, Bm, D, oarsIn})` | 4.3 m, beam 1.36 m; keel midships at y 0; bow +Z; waterline ~0.18 | boatRed lapstrake, oak inside, oakDark gunwales/keel, iron oarlocks | `ground.rest(boat, 0.5, sink)` to beach it | validated (Niagara F). Single-sided transom material |
| Crate | `createCrate(s)` | s cube (default 0.5 m); base centre; `userData.seatY` | oak/oakDark planks | seat / step / falling-object tests | tested (lab props, fall_motion) |
| Rope coil | `createRopeCoil(turns, r0)` | ~0.5 m across, 0.13 m high | rope | static | validated (Niagara C, D) |
| Hammer | `createHammer()` | 0.35 m, lying on its side, handle +X | oakLight, iron | static prop (held hammers are drawn in toon.ts) | validated (Niagara C) |
| Anvil | `createAnvil()` | 0.6 x 0.31 x 0.14 m | iron | ballast / weight gag | tested |
| Timber dock | `createDock(w, l, h)` | deck top at y h, front edge z 0, runs -Z | oak/oakDark planks, round posts | register as walkable ground | validated (Niagara C) |
| Iron railing | `createRailing(len, step, h)` | along +X from the origin, 1 m | iron | rest each segment on the ground | validated (Niagara B) |
| Gas lamp post | `createLampPost()` | 3.45 m | iron, glass | | validated (Niagara B) |
| Coin purse (empty) | `createCoinPurse()` | 0.29 x 0.16 m | leather, cord, dark mouth | the hand-held purse is drawn in toon.ts (`pose:"purse"`) | validated (Niagara G) |
| Coins | `createCoinStack(n)` | 2.6 cm coins | gold (metal highlight) | scale x2-3 to read on a phone | validated (Niagara G) |
| Boulder / rock cluster | `createBoulder(r, seed, flat, kind)`, `createRockCluster()` | r; centre slightly sunk | rock / rockDark / rockLight | `rest(..., sink)` to bed it | validated |
| Foam mound | `createFoamMound(r, seed)` | | foam (use the painted foam material for water sets) | | tested |
| Cat (3D stand-in) | `createCatStandIn()` | 0.5 m | fur | blocking only: the film cat is the 2D card | tested; not for final shots |

## Characters (code `src/pipeline/toon.ts`, standards `docs/learning/CHARACTER-ANATOMY.md`)
Preview: `previews/characters_lineup.jpg`, `poses_sheet_1.jpg`, `poses_sheet_2.jpg`, `headwear_sheet.jpg`.
| Asset | Where | Notes | Status |
|---|---|---|---|
| Body drawer | `bodyFront`, `bodySide`, `swingKid` | 600 x 1000 card, soles at y 975, SU 0.00216 m/unit | validated |
| Builds | `BUILD` adult / stout / kid + `RIG` | 3.5 head-heights; arms by IK | validated |
| Outfits | `ANNIE`, `RIVERMAN[0..2]`, `RIFLEMAN`, `OFFICER`, `KID`, `PARENT`, `soldier(v)`, `townsfolk(v)` | ANNIE is story-specific (1901 Annie Edson Taylor); copy and recolour for new leads | validated |
| Headwear | `hat`: annie, shako, shako_tall, tophat, cap, hair, bonnet | fitted by `wornHat` from the head contour | validated (annie, tophat, cap, shako, bonnet, hair in the lab) |
| Poses | stand, stroll, march, sit (+`seat`), fall; `pose`: point, up, hips, clasp, cross, grip, shrug, hold/purse, reach; `hands` targets | hand targets via `toCard` / `ringGrips` | validated (lab pose set) |
| Expressions | `FACE` (18) incl. determined, hopeful, deadpan, worried, dazed | | validated |
| Cat card | `cat(p, {expr, pose, wet})` | 600 x 600 card, feet y 575, `CAT_SU` 0.00095 | validated (Niagara D) |
| Placement | `person`, `catCard`, `blob`, `toCard`, `ringGrips`, `CardStage` (`src/pipeline/cast.ts`) | grounding, contact shadows, glow, QA | validated |
| Main-character glow | `GLOW` presets in `src/pipeline/actors.ts`; per Place `glow` | **approved default: `subtle` (option 2) for primaries**; secondaries `off` | validated, owner-approved 2026-11-17 |

## Environments
| Asset | Where | Notes | Status |
|---|---|---|---|
| Sky + sun rig | `SkyRig` (`src/pipeline/sky.ts`) | 5-stop sky, camera-relative frozen sun, clouds, golden sun disc | validated |
| Ground registry | `Ground` (`src/pipeline/ground.ts`) | `hit`, `heightAt`, `supportAt`, `rest`, `restAligned` | validated |
| Cartoon trees / bushes / hedges | `addVeg` (`src/pipeline/build.ts`) | kinds round, fat, tall, cone, bush, hedge | validated (bridge, Niagara) |
| QA test stage | `LabWorld` (`src/videos/lab/labWorld.ts`) | paving, bumps, ramp + ledge, deck step, wall, post, pond; preview `previews/env_lab_terrain.jpg` | validated (QA use) |
| Horseshoe Falls set | `buildFalls` (`src/videos/niagara/falls.ts`) | curved lip, ballistic sheet, pool, strata gorge, mist; preview `previews/env_niagara_A.jpg` | story-specific; the techniques (fan mesh along a flow, ballistic sheet, strata walls with talus) are reusable |
| Bridge town | `templates/bridge/build.ts` | needs Kenney CC0 GLBs not in the repo | reference only |

## Materials
| Asset | Where | Notes | Status |
|---|---|---|---|
| Two-tone toon shading | `twoTone`, `lam` (`src/pipeline/shade.ts`, `build.ts`) | all world materials | validated |
| Painted textures | `src/pipeline/paint.ts` (grass, stone, cobble, planks, beam, roofs, facades, clouds, water marks) | canvas, cached by key | validated |
| Prop materials by name | `toonMat` / `toonify` (`src/pipeline/props3d.ts`) | oak names get painted grain, iron/gold a soft highlight | validated |
| Painted water | `waterMat(kind)` (`src/pipeline/water.ts`): 0 river (flow uv), 1 falling sheet, 2 pool/lake (world xz; foam ring near the origin), 3 solid foam | `setWaterLook(WATER_DAY / WATER_GOLD, t)` per frame | validated; kind 2 shows the Niagara foam ring within ~100 m of the origin, build other sets away from it or add a uniform |
| Light presets | `LIGHTS`, `LOOK` day / golden (`src/pipeline/lights.ts`) | golden is a sunset look: close rock walls go orange/purple | validated |
| Card shading | `cardShade` (`src/pipeline/cardshade.ts`) | + per-card `uPresence` for the glow | validated |

## Effects
| Asset | Where | Notes | Status |
|---|---|---|---|
| Mist billows | `mistTex(seed, gold)` (`src/pipeline/effects.ts`) | soft sprites, NOINK; keep opacity <= 0.6 | validated |
| Rainbow band | `rainbowTex()` | opacity ~0.16 | validated |
| Cartoon spray puffs | `spray(p, seed)` | 256 x 256 card | validated (Niagara E) |
| Stars, burst, splash, ring, puff, notes, creak, cloud, plank, drum | `fx*` in `src/pipeline/toon.ts` | drawn cards | validated (bridge, Niagara) |
| Contact shadows | `fxContact`, `fxShadow` via `blob()` | multiply blobs, grounded + aligned to the surface normal | validated |
| Water preview | `previews/water_float.jpg` | barrel floating on waves (lab) | tested |

## Audio
Templates in `templates/audio/` (SFX synthesis, score, mix). Per-video audio stays in the video's folder.
