# Niagara Barrel — Assets
- `niagara-props.js`: reusable **procedural Three.js** geometry: oak barrel with iron hoops, rescue rowboat, riverbank rocks, waterfall/river scaffold, coin purse and coin stack, simple cat stand-in. Functions return THREE.Group and use no external textures. Real animation, water, mist, characters and ink are handled by existing pipeline.
- `ANNIE-DESIGN.md`: character brief for existing billboard toon pipeline.
- No binary GLB is checked into this branch. The earlier standalone barrel GLB exists outside GitHub; this repository contains a reproducible procedural barrel instead.

Scale: 1 scene unit ~ 1 meter. Materials are flat / lightly rough for existing ink postprocessing. Group origins are near ground or object center as documented in source.
