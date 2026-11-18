import React from "react";
import { Composition } from "remotion";
import { PhilShort } from "./PhilShort";
import { RigLab } from "./RigLab";
import { Probe } from "./Probe";
import { FPS, TOTAL } from "./shots";

export const Root: React.FC = () => (
  <>
    <Composition id="PhilShort" component={PhilShort} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
    <Composition id="RigLab" component={RigLab} durationInFrames={1} fps={FPS} width={1080} height={1920} />
    <Composition id="Probe" component={Probe} durationInFrames={1} fps={FPS} width={108} height={192} />
  </>
);
