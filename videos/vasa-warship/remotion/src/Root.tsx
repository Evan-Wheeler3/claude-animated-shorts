import React from 'react';
import {Composition} from 'remotion';
import {AssetCheck, ASSET_CHECK_FRAMES} from './AssetCheck';

export const Root: React.FC = () => (
  <>
    <Composition id="VasaAssetCheck" component={AssetCheck} durationInFrames={ASSET_CHECK_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
