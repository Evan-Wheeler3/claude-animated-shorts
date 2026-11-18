# Hold Up | Absurd 3D Comedy

Use this direction for episodes explicitly marked **Absurd 3D Comedy**. Episodes without a style selection use **Classic Hold Up**. The visual benchmark is [the rendered bathroom frame](assets/bathroom/previews/ThreeJS_Bathroom_Reveal.png) and the timing benchmark is [the rendered bathroom motion proof](assets/bathroom/previews/ThreeJS_Motion_Proof.mp4).

## Look

- Build believable adult proportions with fully modeled faces, hands, clothes and shoes. Keep modest geometry, simple silhouettes, and recognizable little details such as a shirt collar, shoe sole or loosely folded newspaper. Skin, fabric and tile should show quiet surface variation at phone size.
- Aim for an early PC-game scene. Use warm practicals, limited fill, low-gloss surfaces, restrained color and good contact shadows. Give each set one recognizable material family. The olive bathroom tile and amber sconce are the reference for material scale and light falloff.
- Use clean mesh silhouettes and lighting to define edges. For the approved bathroom GLB, the supplied Three.js initializer and ACES filmic tone mapping at exposure 1.25 match the proof. Match adjacent scenes by eye using actual renderer frames. Keep dark areas readable on a phone.
- Dress for the joke. Put a short stretch of fence or railing in the foreground for a useful parallax cue. Keep incidental backgrounds sparse enough for hands, eyes, props and silhouettes to read instantly.

## Character animation

| Area | Direction |
| --- | --- |
| Body | Use simple, committed poses with slightly stiff shoulders and clean arcs. Allow a noticeably large move when a gag calls for it. Animate through the pose transition so it plays smoothly at 30 fps. |
| Face | Keep the performer’s intent readable with gaze, lid tension and a head turn. Reserve bigger mouth and brow moves for the homeowner’s frustration. Give Phil one tiny reaction at a time. |
| Hands and feet | Lock floor contacts during weight transfer. Key a prop’s contact point with the hand, then release it on a specific frame. Check finger and wrist contact from the delivery camera. |
| Physical gags | Stage the setup, contact and result on one readable screen axis. A short anticipation pose, spring or recoil and a calm recovery usually tell the story. |
| Deadpan holds | Keep the body still during the reaction, then choose one small change such as an eye flick, blink or breath. Preserve the quiet beat that lets a sight gag register. |
| Secondary motion | Start with the root and pelvis, then add small follow-through in sleeves, paper, hair or loose cloth when it follows the action. Keep the main silhouette clear. |

## Camera and edit

- Change something the viewer can read roughly every 1–2 seconds through most of the short. Use a sizable body action, purposeful camera move, cut, foreground reveal or new piece of information. The bathroom payoff gets a deliberate slower rhythm.
- Build smooth camera starts and stops, with a stable horizon and a clear landing frame. Match screen direction and eyelines between cuts. Use low-angle wides for action, then tighter angles for small expression work.
- Keep actions and faces inside the vertical viewing area. Use the middle of the frame for hands and mechanisms. Give a jump enough headroom to include the apex and the landing or cut between complementary angles.
- Play deadpan narration over the escalation. Use one strong sound on each major contact so the audience hears the impact it sees. Use silence where a tiny sound is the joke.

## Preflight for a new episode

Render one actual 9:16 frame per main set plus a 2–4 second shot with the largest body move. Check facial readability, hand contacts, clean feet, the style match, and camera starts and stops first. Treat earlier concept art as a composition reference and judge characters, textures and lighting in the renderer.
