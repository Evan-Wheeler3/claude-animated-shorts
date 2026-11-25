import React from 'react';
import {Composition} from 'remotion';
import {LookTest, LOOK_TEST_FRAMES} from './LookTest';

export const Root: React.FC = () => <Composition id="LookTest" component={LookTest} durationInFrames={LOOK_TEST_FRAMES} fps={30} width={1080} height={1920} />;
