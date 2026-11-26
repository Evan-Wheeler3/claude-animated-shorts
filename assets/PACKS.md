# Asset packs to download (all CC0: free for any use, no credit needed)

How: open the link → click **Download** (free; "Support" / Patreon is optional) → drag the .zip into `assets/inbox/` →
double-click `tools/assets/send-inbox.command`. Details: `assets/inbox/README.md`.
Checked on quaternius.com on 2026-11-25 (model counts, formats and licence as listed on each page).

## Top 10 (start here)
| # | Pack | Link | Models | Formats | What we use it for |
|---|---|---|---|---|---|
| 1 | Stylized Nature MegaKit | https://quaternius.com/packs/stylizednaturemegakit.html | 116 | glTF, FBX, OBJ | Lush outdoor scenes like the reference: 40 trees, 35 plants and flowers, 27 rocks, grass, bushes |
| 2 | Ultimate Crops Pack | https://quaternius.com/packs/ultimatecrops.html | 102 | FBX, OBJ | Farm fields: 100+ crops in 5 growth stages |
| 3 | Fantasy Props MegaKit | https://quaternius.com/packs/fantasypropsmegakit.html | 211 | glTF, FBX, OBJ | History props: tools, barrels, chests, market stalls, vegetables, furniture |
| 4 | Medieval Village MegaKit | https://quaternius.com/packs/medievalvillagemegakit.html | 304 | glTF, FBX, OBJ | Old towns: modular walls, roofs, floors, stairs |
| 5 | Ultimate House Interior Pack | https://quaternius.com/packs/ultimatehomeinterior.html | 123 | FBX, OBJ | Modern rooms: kitchens, living rooms, bathrooms (everyday "why" topics) |
| 6 | Downtown City MegaKit | https://quaternius.com/packs/downtowncitymegakit.html | 315 | glTF, FBX | Modern city blocks and streets |
| 7 | Pirate Kit | https://quaternius.com/packs/piratekit.html | 71 | glTF, FBX, OBJ | Ships, docks, harbours, cannons (sea and history stories) |
| 8 | Ultimate Food Pack | https://quaternius.com/packs/ultimatefood.html | 103 | FBX, OBJ | Everyday objects and food close-ups |
| 9 | Survival Pack | https://quaternius.com/packs/survival.html | 53 | FBX, OBJ | Tools, camping, crafting, outdoor gear |
| 10 | Cars Pack | https://quaternius.com/packs/cars.html | 8 | FBX, OBJ | Vehicles for road and modern scenes |

## Good next ones (only when a story needs them)
| Pack | Link | Models | For |
|---|---|---|---|
| Ultimate Stylized Nature Pack | https://quaternius.com/packs/ultimatestylizednature.html | 63 | More stylised trees and plants |
| Farm Buildings Pack | https://quaternius.com/packs/farmbuildings.html | 13 | Barns, silos, windmills |
| Public Transport Pack | https://quaternius.com/packs/publictransport.html | 12 | Buses, trains, trams |
| Ships Pack | https://quaternius.com/packs/ships.html | 6 | More ships |
| Modular Streets Pack | https://quaternius.com/packs/modularstreets.html | 25 | Roads, sidewalks, street props |
| Ultimate Furniture Pack | https://quaternius.com/packs/ultimatefurniture.html | 20 | Extra furniture |

## When Claude needs something new
Claude adds a row here with a direct link (Quaternius, Poly Pizza, Kenney, Poly Haven, Sketchfab CC0/CC-BY), the
exact item, and why. You download, drop it in `assets/inbox/`, run the script, say "assets sent".

## Downloading without the Mac (Kenney only)
`python3 tools/assets/kenney.py <slug>` downloads any kenney.nl pack zip from the cloud session (it asks the site for the
same signed link the "Continue without donating" button uses), e.g. `car-kit`, `city-kit-roads`. Unzip `Models/GLB format/`
into `assets/library/_incoming/kenney-<slug>/` and run `python3 tools/assets/ingest.py`. Quaternius (Google Drive) and
Poly Pizza (Cloudflare) still need the Mac inbox. Kenney models are not at real size: e.g. cars are ~2.5 m long (scale ~1.7),
`traffic-light` is 0.5 m tall (scale ~6); pass `s` to `place()`.
In the library: `kenney-car-kit` (sedan, police, taxi, van, truck, ambulance, firetruck, delivery..., CC0) and
`kenney-city-kit-roads` (roads, crossings, traffic lights, road signs, CC0), added 2026-11-26.
