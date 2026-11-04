<p align="center">
  <img src="https://img.shields.io/badge/Fintra-Personal%20Finance-0ea5e9?style=for-the-badge" alt="Fintra" />
  <br />
  <strong>Personal Finance + Productivity di genggaman lo</strong>
  <br />
  <sub>Pencatat keuangan · To-do · DCA · Catatan terenkripsi · Asisten AI — offline-first</sub>
</p>

<p align="center">
  <a href="https://sonofrich.github.io/duitku/"><img src="https://img.shields.io/badge/🚀_Live_Web-sonofrich.github.io-22c55e?style=flat-square" alt="Live Web" /></a>
  <a href="https://github.com/sonofrich/duitku/actions"><img src="https://img.shields.io/badge/📦_APK-GitHub_Actions-181717?style=flat-square" alt="APK" /></a>
  <img src="https://img.shields.io/badge/React_18-TypeScript-3178c6?style=flat-square&logo=react" alt="Stack" />
  <img src="https://img.shields.io/badge/Offline--first-Dexie-f59e0b?style=flat-square" alt="Offline" />
  <img src="https://img.shields.io/badge/License-Private-6b7280?style=flat-square" alt="License" />
</p>

---

## ✨ Fitur

<table>
<tr>
<td width="50%" valign="top">

### 💰 Keuangan
*Terinspirasi Ivy Wallet*

- Pemasukan, pengeluaran, **transfer antar rekening**
- Bottom-sheet cepat + chip kategori berikon
- **Net Worth** = kas + nilai portofolio
- Anggaran bulanan + peringatan terlampaui
- Riwayat per tanggal, cari & filter kategori/bulan
- Edit / hapus transaksi, ekspor **CSV**
- Pie chart pengeluaran per kategori

</td>
<td width="50%" valign="top">

### ✅ To Do
*Terinspirasi Todoist / Things 3*

- Progress ring harian
- Prioritas tinggi / sedang / rendah
- Ulangi: harian, mingguan, bulanan
- Fallback tanggal 29–31 di bulan pendek
- **Notifikasi pengingat** (APK) sesuai jam
- Catatan per-tanggal yang nempel ke jadwal

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📈 Investasi DCA
*Terinspirasi Wealthfolio*

- Simulasi DCA harian, **harga pasar nyata**
- **Kurs USD/IDR historis** (ECB / frankfurter.app)
- Adjusted close (split & dividen)
- BTC, ETH, BNB, SOL, Emas, saham ID & Apple
- Sparkline portofolio + alokasi aset

</td>
<td width="50%" valign="top">

### 📝 Catatan
*Terinspirasi Joplin / Standard Notes*

- Tab **Umum** & **Notes To Do**
- **Vault rahasia** (sandi, seed, API key)
- AES-GCM 256 + PBKDF2 150k iterasi dari **PIN session**
- Tersembunyi sampai diketuk; pin 📌 + pencarian
- Tombol pena di tugas → catatan langsung terisi

</td>
</tr>
</table>

### 🤖 Asisten AI

- Baca & ubah data app lewat **function calling** (transaksi, tugas, anggaran, portofolio)
- Toggle **"Beri AI akses data"** di Setelan — tanpa izin, tools data diblokir (filter + guard eksekusi)
- Hapus selalu minta konfirmasi
- OpenRouter & Google Gemini

### 🎨 UI

- **4 tema**: Modern Dark Pro · Clean Light · Premium Gold · Cyber Finance
- Glassmorphism + wallpaper anime siang/malam otomatis
- Lucide (fungsional) + Iconify fluent-emoji (dekoratif)
- Plus Jakarta Sans + Space Grotesk
- Jam & cuaca real-time (open-meteo, tanpa API key)

---

## 🔒 Keamanan

| Aspek | Detail |
|--------|--------|
| **PIN lock** | Salt acak + 50.000 iterasi SHA-256, progressive lockout (3× → delay, naik bertahap) |
| **Vault catatan** | AES-GCM; kunci dari PIN di `sessionStorage` (hapus saat tab ditutup) + fallback device-key untuk catatan lama |
| **Data** | 100% lokal (IndexedDB / Dexie) — tanpa server pihak ketiga untuk data user |
| **AI** | Akses data opt-in; hapus wajib konfirmasi |
| **Backup** | JSON lengkap (termasuk catatan terenkripsi & cache harga) |

---

## 🧱 Stack

| Layer | Teknologi |
|-------|-----------|
| UI | React 18 · TypeScript · Vite |
| Data | Dexie (IndexedDB) |
| Chart | Recharts |
| Mobile | Capacitor 6 (Android) |
| Ikon | Lucide · Iconify |
| Market | Binance · Yahoo Finance · frankfurter.app · open-meteo |

---

## 🚀 Jalankan lokal

```bash
git clone https://github.com/sonofrich/duitku.git
cd duitku
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/
npm run typecheck  # cek TypeScript
```

### Build APK

```bash
npm run android    # build web + sync Capacitor + buka Android Studio
```

Atau push ke `main` → GitHub Actions **Build APK** → unduh artifact `duitku-debug-apk` di tab [Actions](https://github.com/sonofrich/duitku/actions).

---

## 🌐 Tautan

| | |
|--|--|
| **Web live** | [sonofrich.github.io/duitku](https://sonofrich.github.io/duitku/) |
| **Source** | [github.com/sonofrich/duitku](https://github.com/sonofrich/duitku) |
| **APK** | Artifact di [Actions](https://github.com/sonofrich/duitku/actions) (setiap push ke `main`) |

---

<p align="center">
  <sub><i>Fintra — duit lo, data lo, perangkat lo.</i></sub>
  <br />
  <sub>💎 Offline-first · PIN-bound vault · AI dengan izin eksplisit</sub>
</p>
