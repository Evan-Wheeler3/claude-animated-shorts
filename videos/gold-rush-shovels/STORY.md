# The Man Who Got Rich Selling Shovels

```yaml
story_id: gold-rush-shovels
working_title: The Man Who Got Rich Selling Shovels
script_status: approved
codex_status: assets_review
claude_status: not_started
target_duration_seconds: 37
format: "9:16"
owner_approved_script_at: 2026-11-18
```

## Premise and payoff

A miner works the river for one piece of gold. Samuel Brannan makes a business out of supplying people like him. The gold travels from the miner's pan straight to Brannan's counter when the miner needs a replacement shovel. The sale is the punchline.

Start with a shovel hitting the shop counter on frame one. Reveal who gets paid and why over the next 35 seconds. The buyer's arc is eagerness, sticker shock, a tiny victory and reluctant surrender. Brannan stays matter-of-fact throughout.

## Historical notes

| Claim | Evidence | Confidence and production wording |
| --- | --- | --- |
| Thousands rushed to California in 1849 following the 1848 discovery. | [PBS American Experience, The California Gold Rush](https://www.pbs.org/wgbh/americanexperience/features/goldrush-california/) | Confirmed. Most scenes take place in the 1849 rush. |
| Brannan already had a store near Sutter's Fort and stocked gear for miners. | [PBS American Experience, Samuel Brannan](https://www.pbs.org/wgbh/americanexperience/features/goldrush-samuel-brannan/) and [California State Parks, Marshall Gold transcript](https://www.parks.ca.gov/pages/484/files/marshallgoldtranscript_cspf_text.html) | Well documented. The store opened in 1847. Stage a stylized supply store and a stocking scene. |
| Gold pans rose from 20 cents to $8 amid scarcity and high demand. | [California State Parks, Gold Rush Prices Worksheet, first page](https://www.parks.ca.gov/pages/22922/files/worksheet-goldrushprices.pdf) | Reported market example. The source gives no Brannan-specific price for the pan. Present as a neutral price graphic and keep the purchase amount and shop signs out of the transaction insert. |
| A miner's haul was worth about $16 a day by one estimate. | [California as I Saw It, Library of Congress, p. 140, editorial note](https://tile.loc.gov/storage-services/service/gdc/calbk/079.pdf) | T. Butler King's 1850 report estimated this daily amount. Other period accounts came in lower. Keep “one report estimated” and label the visual “$16 in gold / day (estimate).” A general wage, guaranteed return or profit comparison would misstate the evidence. |
| Brannan's store took in more than $2,000 per day. | [California State Parks, Gold Rush Prices Worksheet, first page](https://www.parks.ca.gov/pages/22922/files/worksheet-goldrushprices.pdf) and [PBS American Experience, Samuel Brannan](https://www.pbs.org/wgbh/americanexperience/features/goldrush-samuel-brannan/) | Reported store sales. PBS independently describes days with up to $5,000 in merchandise sales. Use “reportedly” and “sales” on screen. Leave costs and profit margin unspecified. |
| Customers paid Brannan in gold. | [PBS / South Carolina ETV, History in a Nutshell, The California Gold Rush](https://www.pbs.org/video/the-california-gold-rush-kwo2bc/) | Historical practice. The featured miner, his broken shovel and his exact purchase are a dramatization. The nugget has no stated value, and the shot of it is independent of the $16 estimate. |

All dollar figures are period dollars. The economics beat is the difference between one miner's variable daily haul and a store selling to a line of customers. Keep the arithmetic off screen and convey scarcity with the dwindling pan rack and growing queue.

## Look and setting

- Two hero characters. The fictional miner has rolled sleeves, a dented brim and muddy boots. Brannan wears a tidy dark waistcoat with a clean silhouette. Use distinct poses and brow lines so they read at phone size.
- Two sets. A California foothill creek with a shallow gravel bar, and a plain wood supply shop with a counter, a door visible behind the customer and a rack behind Brannan. Crop and reuse one shop build for the opening, queue and payoff.
- Preserve the project's bold ink outlines, expressive toon characters in stylized 3D, readable lighting and grounded contact. Build for vertical 9:16 at 30 fps with repository render settings. Use the established owner narration workflow and existing Remotion/Three.js scene systems.
- Use the price, haul and sales overlays only on their designated shots. Keep action central, text off the right rail and bottom UI area. The opening and ending carry no text, intro, outro or character dialogue.

## Asset brief for Codex

These are planning names. Resolve real paths, provenance, units, pivots and statuses in the asset handoff after inspection and preview.

| Planning name | Need | Acceptance detail |
| --- | --- | --- |
| MINER, BRANNAN, CROWD | Two hero character rigs or approved variants, and a short queue using silhouette variations. | Miner can crouch, tip a pan, pinch gold and grip a shovel. Brannan can slide a shovel, take the nugget and tip it into a drawer. Keep the hero designs distinct. |
| CREEK, STORE | Gravel-bar river set and shop interior with threshold, counter, shelves and rear rack. | Check river bank and boot contact. Hold consistent screen geography at the counter, with miner left and Brannan right. |
| PAN, SHOVEL, NUGGET | Dark shallow metal pan, wooden-handled shovel with intact and split states, small asymmetrical nugget. | Establish hand and tabletop contact points. Keep the hero nugget silhouette identical from discovery to drawer. Snap the worn shovel at a defined break point. |
| SHOP-KIT | Pan crate and shelves, shallow wood drawer, small coin pouch and receipt or ledger for set dressing. | Drawer has a keyed travel limit and a floor that catches the nugget. Duplicate the same pan asset for inventory. |
| WATER, MUD, AUDIO | Shallow flow and modest pan splash, mud accent, shovel thump, boot scrape, pan rings, wood crack, gold clink and drawer knock. | Reuse proven effects and licensed or original sound. Keep the final clink clear over narration and music. |

## Approval and handoff

On 2026-11-18 the owner approved the supplied script for asset production. The assets and in-engine previews require owner review before Claude begins scene assembly.

- `SCRIPT.md` contains the canonical narration.
- `SHOTLIST.md` contains the timed animation and sound direction.
- `CLAUDE-PROMPT.md` is the branch-specific continuation prompt.
