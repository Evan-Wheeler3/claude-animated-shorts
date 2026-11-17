// Compositions of this Remotion project. The bridge template (templates/bridge) is kept as reference source; it
// needs its Kenney kit in public/ to run, so it is not registered here. Add new shorts next to NiagaraShort.
import React from "react";
import { Composition } from "remotion";
import { NiagaraShort, NIAGARA_FRAMES } from "./videos/niagara/Niagara";
import { CharacterLab, LAB_FRAMES } from "./videos/lab/Lab";
import { U1206Short, U1206_FRAMES } from "./videos/u1206/U1206";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="CharacterLab" component={CharacterLab} durationInFrames={LAB_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="U1206Short" component={U1206Short} durationInFrames={U1206_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="NiagaraShort" component={NiagaraShort} durationInFrames={NIAGARA_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
