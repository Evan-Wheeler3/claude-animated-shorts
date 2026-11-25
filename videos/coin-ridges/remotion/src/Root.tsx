import React from 'react';
import {Composition} from 'remotion';
import {AssetPreview, PREVIEW_MAX} from './AssetPreview';
import {CoinLooks, LOOK_FRAMES} from './Looks';
import {CoinAnimatic, COIN_FRAMES} from './Animatic';

export const Root: React.FC = () => (
  <>
    <Composition id="CoinShort" component={CoinAnimatic} durationInFrames={COIN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CoinAnimatic" component={CoinAnimatic} durationInFrames={COIN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="CoinLooks" component={CoinLooks} durationInFrames={LOOK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="AssetPreview" component={AssetPreview} durationInFrames={PREVIEW_MAX} fps={30} width={1080} height={1920} />
  </>
);
