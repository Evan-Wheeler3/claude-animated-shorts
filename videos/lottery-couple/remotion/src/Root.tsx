import React from 'react';
import {Composition} from 'remotion';
import {LotteryShort, LOTTERY_FRAMES} from './Lottery';

export const Root: React.FC = () => <>
  <Composition id="LotteryShort" component={LotteryShort} durationInFrames={LOTTERY_FRAMES} fps={30} width={1080} height={1920} />
</>;
