import React from 'react';
import {Composition} from 'remotion';
import {AssetCheck, ASSET_CHECK_FRAMES} from './AssetCheck';
import {VasaAnimatic, VASA_FRAMES} from './Vasa';

export const Root: React.FC = () => (
  <>
    <Composition id="VasaAnimatic" component={VasaAnimatic} durationInFrames={VASA_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="VasaAssetCheck" component={AssetCheck} durationInFrames={ASSET_CHECK_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
