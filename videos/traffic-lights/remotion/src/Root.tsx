import React from 'react';
import {Composition} from 'remotion';
import {TrafficShort, TRAFFIC_FRAMES} from './Traffic';

export const Root: React.FC = () => <>
  <Composition id="TrafficShort" component={TrafficShort} durationInFrames={TRAFFIC_FRAMES} fps={30} width={1080} height={1920} />
</>;
