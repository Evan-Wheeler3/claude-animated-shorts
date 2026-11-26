import React from 'react';
import {Composition} from 'remotion';
import {LookTest, LOOK_TEST_FRAMES} from './LookTest';
import {Stills, STILL_FRAMES} from './Stills';

export const Root: React.FC = () => <>
  <Composition id="LookTest" component={LookTest} durationInFrames={LOOK_TEST_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="Stills" component={Stills} durationInFrames={STILL_FRAMES} fps={30} width={1080} height={1920} />
</>;
