import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.duitku.app',
  appName: 'DuitKu',
  webDir: 'dist',
  // CapacitorHttp membuat fetch() lewat jalur native sehingga bebas CORS (Binance, Yahoo, dll)
  plugins: { CapacitorHttp: { enabled: true } }
};
export default config;
