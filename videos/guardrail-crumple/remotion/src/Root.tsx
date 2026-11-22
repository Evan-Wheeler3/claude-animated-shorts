import React from 'react';
import {Composition} from 'remotion';
import {CarLook, CAR_LOOK_FRAMES} from './CarLook';

export const Root: React.FC = () => (
  <>
    <Composition id="GuardrailCarLook" component={CarLook} durationInFrames={CAR_LOOK_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
