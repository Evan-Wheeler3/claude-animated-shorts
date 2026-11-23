// Hold Up starter project. Public dir = the story's assets folder: ASSETS_DIR (relative to this folder) or ../assets.
// Shared templates/bridge modules resolve three/postprocessing from THIS project's node_modules.
// Renderer: Mac -> Remotion's Chrome with the GPU (angle); cloud (no GPU) -> preinstalled headless shell (swangle).
import fs from 'fs';
import path from 'path';
import {Config} from '@remotion/cli/config';

Config.setPublicDir(path.resolve(process.cwd(), process.env.ASSETS_DIR ?? '../assets'));
Config.setVideoImageFormat('jpeg');
Config.overrideWebpackConfig(config => ({
  ...config,
  resolve: {...config.resolve, modules: [path.join(process.cwd(), 'node_modules'), 'node_modules']},
}));
const shells = fs.existsSync('/opt/pw-browsers') ? fs.readdirSync('/opt/pw-browsers').filter(d => d.startsWith('chromium_headless_shell-')) : [];
const CLOUD_SHELL = shells.length ? `/opt/pw-browsers/${shells[0]}/chrome-headless-shell-linux64/chrome-headless-shell` : '';
if (CLOUD_SHELL && fs.existsSync(CLOUD_SHELL)) {
  Config.setBrowserExecutable(CLOUD_SHELL);
  Config.setChromiumOpenGlRenderer('swangle');
} else {
  Config.setChromiumOpenGlRenderer('angle');
}
