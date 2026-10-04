import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();

const BARS = { system: SystemBarsStyle.Default, light: SystemBarsStyle.Light, dark: SystemBarsStyle.Dark };
export function setBars(theme: keyof typeof BARS) {
  if (isNative()) SystemBars.setStyle({ style: BARS[theme] }).catch(() => {});
}

export const inFrame = () => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
};

const isWebPage = () => /^https?:$/.test(location.protocol) && !inFrame() && !isNative();

export const canCallback = isWebPage;
export const callbackUrl = () => (canCallback() ? location.origin + location.pathname : 'oob');
export const shareBase = () => (isWebPage() ? location.origin + location.pathname : '');

export const isIos = (ua: string, platform: string, touchPoints: number) =>
  /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);

export const iosInBrowser = (ua: string, platform: string, touchPoints: number, standalone: boolean) =>
  isIos(ua, platform, touchPoints) && !standalone;
