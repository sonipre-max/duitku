# 💎 FINTRA

> **Personal Finance + Productivity, di genggaman lo.**
> Pencatat keuangan, to-do list, simulasi investasi DCA, catatan terenkripsi, dan asisten AI — semua dalam satu aplikasi offline-first.

<p align="center">
  <a href="https://sonofrich.github.io/duitku/"><b>🚀 Buka Web App</b></a> ·
  <a href="https://github.com/sonofrich/duitku/actions">📦 Download APK</a>
</p>

---

## ✨ Fitur

### 💰 Keuangan (terinspirasi Ivy Wallet)
- Catat pemasukan / pengeluaran / **transfer antar rekening** via bottom-sheet cepat dengan chip kategori berikon
- **Net Worth Tracker** — kekayaan bersih = kas + nilai portofolio kini
- Anggaran bulanan dengan peringatan "terlampaui"
- Riwayat dikelompokkan per tanggal dengan **pencarian + filter kategori & bulan**
- **Edit & hapus** transaksi, ekspor **CSV**
- Pie chart pengeluaran per kategori

### ✅ To Do (terinspirasi Todoist / Things 3)
- Progress ring harian, checkbox warna prioritas (tinggi/sedang/rendah)
- Tugas berulang: harian, mingguan, bulanan (termasuk fallback tgl 29–31 di bulan pendek)
- **Notifikasi pengingat** (APK) sesuai jam tugas
- Edit tugas + **catatan per-tanggal yang nempel ke jadwal**

### 📈 Investasi DCA (terinspirasi Wealthfolio)
- Simulasi DCA harian otomatis dengan **harga pasar beneran** — tanpa uang asli
- **Kurs USD/IDR historis per tanggal** (data ECB via frankfurter.app) — backtest akurat, bukan satu kurs untuk semua bulan
- Harga saham pakai **adjusted close** (sudah disesuaikan split & dividen)
- Aset: Bitcoin, Ethereum, BNB, Solana, Emas (PAXG/futures), saham Indonesia (BBCA, BBRI, TLKM), Apple
- Sparkline portofolio + bar alokasi per aset + indikator waktu sinkron harga

### 📝 Catatan (terinspirasi Joplin / Standard Notes)
- **Dua tab terpisah**: Catatan Umum & Notes To Do
- **Vault rahasia**: simpan sandi, key wallet, API key — **terenkripsi AES-GCM 256-bit**, kunci diturunkan dari PIN via **PBKDF2 150.000 iterasi**
- Tersembunyi (`••••••`) sampai lo ketuk tampilkan; cari isinya tetap bisa
- Pin 📌 catatan penting + pencarian global
- Terintegrasi: tombol pena di tugas → langsung bikin catatan untuk jadwal itu

### 🤖 Asisten AI (pola Vercel AI SDK function calling)
- Bisa **membaca & mengubah** data app: catat transaksi, buat/selesaikan tugas, set anggaran
- **Izin eksplisit**: toggle "beri AI akses data" di Setelan — tanpa itu, semua tools data diblokir di 2 lapis
- Operasi hapus selalu **minta konfirmasi** dulu
- Support OpenRouter & Google Gemini

### 🎨 UI
- **4 tema**: Modern Dark Pro, Clean Light, Premium Gold, Cyber Finance — layout seragam, tema hanya mengubah warna
- Glassmorphism + **wallpaper anime siang/malam otomatis** (full-bleed, transparan + glow)
- Ikon 2-tier: **Lucide** (fungsional) + **Iconify fluent-emoji** (dekoratif)
- Font Plus Jakarta Sans + Space Grotesk
- Jam + cuaca real-time (open-meteo, tanpa key) di beranda

---

## 🔒 Keamanan
- **PIN lock** — salt acak + 50.000 iterasi, **progressive lockout** (3x salah → delay, makin salah makin lama)
- Catatan rahasia **terenkripsi AES-GCM**, kunci PBKDF2 dari PIN
- Semua data **lokal di perangkat** (IndexedDB/Dexie) — gak ada server, gak ada yang ngintip
- Backup/pulihkan **JSON lengkap** (termasuk catatan terenkripsi & cache harga)

## 🧱 Teknologi
| Layer | Teknologi |
|---|---|
| UI | React 18 + TypeScript + Vite |
| Data | Dexie (IndexedDB) — offline-first |
| Chart | Recharts |
| Mobile | Capacitor 6 (Android APK) |
| Ikon | Lucide + Iconify |
| Market data | Binance API, Yahoo Finance, open-meteo, frankfurter.app |

## 🚀 Jalankan

```bash
git clone https://github.com/sonofrich/duitku.git
cd duitku
npm install
npm run dev        # development
npm run build      # production → dist/
```

### Build APK
Push ke `main` → GitHub Actions otomatis build → download artifact `duitku-debug-apk` di tab [Actions](https://github.com/sonofrich/duitku/actions).

## 🌐 Live
- **Web**: https://sonofrich.github.io/duitku/
- **APK**: artifact `duitku-debug-apk` (auto-build tiap push)

---

<p align="center"><i>Fintra — duit lo, data lo, perangkat lo.</i> 💎</p>
