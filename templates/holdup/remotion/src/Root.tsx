import React from 'react';
import {Composition} from 'remotion';
import {AssetPreview, PREVIEW_MAX} from './AssetPreview';

// Story projects copy this folder to videos/<story-id>/remotion and add their story composition here.
export const Root: React.FC = () => (
  <>
    <Composition id="AssetPreview" component={AssetPreview} durationInFrames={PREVIEW_MAX} fps={30} width={1080} height={1920} />
  </>
);
