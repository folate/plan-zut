import type { CapacitorConfig } from '@capacitor/cli';
import { loadEnv } from 'vite';

const env = loadEnv('native', process.cwd(), 'APP_');

const config: CapacitorConfig = {
  appId: env.APP_ID || 'pl.planzut.app',
  appName: env.APP_NAME || 'Plan ZUT',
  webDir: 'dist'
};

export default config;
