import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { WhaleShort, WHALE_FRAMES } from "./videos/whale/Whale";
import { EmuShort, EMU_FRAMES } from "./videos/emu/Emu";
import { DuelShort, DUEL_FRAMES } from "./videos/duel/Duel";
import { WindowsShort, WINDOWS_FRAMES } from "./videos/windows/Windows";
import { EiffelShort, EIFFEL_FRAMES } from "./videos/eiffel/Eiffel";
import { TroyShort, TROY_FRAMES } from "./videos/troy/Troy";
const Root: React.FC = () => (
  <>
    <Composition id="TroyShort" component={TroyShort} durationInFrames={TROY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EiffelShort" component={EiffelShort} durationInFrames={EIFFEL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="WindowsShort" component={WindowsShort} durationInFrames={WINDOWS_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="DuelShort" component={DuelShort} durationInFrames={DUEL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EmuShort" component={EmuShort} durationInFrames={EMU_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="WhaleShort" component={WhaleShort} durationInFrames={WHALE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
registerRoot(Root);
