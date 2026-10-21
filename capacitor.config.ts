import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'wine.matchrim.app',
  appName: 'Matchrim',
  webDir: 'dist',
  loggingBehavior: 'none',
  plugins: {
    Keyboard: { resize: KeyboardResize.Native }
  }
};

export default config;
