// Story-local Remotion config. Assets live in ../assets (served as the public dir), and the shared
// templates/bridge modules resolve three/postprocessing from THIS project's node_modules.
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
Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
Config.setChromiumOpenGlRenderer('swangle');
