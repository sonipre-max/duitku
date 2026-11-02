# DuitKu

Aplikasi Android pribadi: pencatatan keuangan, to-do ala kalender, dan simulasi DCA harian.
React + TypeScript + Vite, dibungkus Capacitor. Data disimpan lokal (IndexedDB/Dexie) sehingga jalan offline.

## Build APK lewat GitHub
1. Buat repo baru di GitHub, lalu upload seluruh isi folder ini (branch `main`).
2. Buka tab **Actions** > workflow **Build APK** (jalan otomatis saat push, atau klik *Run workflow*).
3. Setelah selesai, unduh artifact **duitku-debug-apk**, ekstrak, lalu install `app-debug.apk` di Android
   (aktifkan "install dari sumber tidak dikenal").

## Jalan lokal
```
npm install
npm run dev          # uji di browser
npm run android      # build web, sync, buka Android Studio
```

## Sumber data
- Crypto & emas (PAXG): Binance API publik (tanpa key)
- Saham & emas futures: Yahoo Finance (tidak resmi, bisa berubah)
- Kurs USD/IDR: open.er-api.com
- AI: OpenRouter atau Gemini dengan API key milikmu
