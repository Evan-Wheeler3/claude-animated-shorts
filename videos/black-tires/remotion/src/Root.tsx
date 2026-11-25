import React from 'react';
import {Composition} from 'remotion';
import {TiresShort, TIRE_FRAMES} from './Tires';

export const Root: React.FC = () => (
  <>
    <Composition id="TiresShort" component={TiresShort} durationInFrames={TIRE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
