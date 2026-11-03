import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.duitku.app',
  appName: 'DuitKu',
  webDir: 'dist',
  // Keyboard Android: resize konten, jangan fullscreen-cover yang bikin webview crash
  android: { allowMixedContent: true },
  // CapacitorHttp membuat fetch() lewat jalur native sehingga bebas CORS (Binance, Yahoo, dll)
  plugins: { CapacitorHttp: { enabled: true }, Keyboard: { resize: 'native' } }
};
export default config;
