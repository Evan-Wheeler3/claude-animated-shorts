// Story-local Remotion config. Assets live in ../assets (served as the public dir), and the shared
// templates/bridge modules resolve three/postprocessing from THIS project's node_modules.
// Renderer: on the owner's Mac, Remotion's own Chrome with the GPU (`angle`). In the cloud container (no GPU, browser
// download host blocked) the preinstalled headless shell with software GL (`swangle`).
import fs from 'fs';
import path from 'path';
import {Config} from '@remotion/cli/config';

Config.setPublicDir(path.join(process.cwd(), '..', 'assets'));
Config.setVideoImageFormat('jpeg');
Config.overrideWebpackConfig(config => ({
  ...config,
  resolve: {
    ...config.resolve,
    modules: [path.join(process.cwd(), 'node_modules'), 'node_modules'],
  },
}));
const CLOUD_SHELL = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (fs.existsSync(CLOUD_SHELL)) {
  Config.setBrowserExecutable(CLOUD_SHELL);
  Config.setChromiumOpenGlRenderer('swangle');
} else {
  Config.setChromiumOpenGlRenderer('angle');
}
