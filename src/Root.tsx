// Compositions of this Remotion project. The bridge template (templates/bridge) is kept as reference source; it
// needs its Kenney kit in public/ to run, so it is not registered here. Add new shorts next to NiagaraShort.
import React from "react";
import { Composition } from "remotion";
import { NiagaraShort, NIAGARA_FRAMES } from "./videos/niagara/Niagara";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="NiagaraShort" component={NiagaraShort} durationInFrames={NIAGARA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
