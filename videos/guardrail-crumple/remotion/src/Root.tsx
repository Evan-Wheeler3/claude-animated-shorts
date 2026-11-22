import React from 'react';
import {Composition} from 'remotion';
import {CarLook, CAR_LOOK_FRAMES} from './CarLook';
import {GuardrailShort, GUARDRAIL_FRAMES} from './Guardrail';

export const Root: React.FC = () => (
  <>
    <Composition id="GuardrailShort" component={GuardrailShort} durationInFrames={GUARDRAIL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="GuardrailCarLook" component={CarLook} durationInFrames={CAR_LOOK_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
