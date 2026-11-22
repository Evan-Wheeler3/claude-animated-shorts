import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {FIRST_STILLS_COUNT, FirstStills} from './FirstStills';

registerRoot(() => (
  <Composition id="GuardrailFirstStills" component={FirstStills}
    durationInFrames={FIRST_STILLS_COUNT} fps={30} width={405} height={720} />
));
