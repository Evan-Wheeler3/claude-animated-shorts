import React from 'react';
import {Composition} from 'remotion';
import {MatchesShort, MATCH_FRAMES} from './Matches';

export const Root: React.FC = () => <>
  <Composition id="MatchesShort" component={MatchesShort} durationInFrames={MATCH_FRAMES} fps={30} width={1080} height={1920} />
</>;
