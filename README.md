# 🌐 SIGAP Dashboard (Web & API)

[![Next.js](https://img.shields.io/badge/Next.js-13-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin_SDK-FFCA28?logo=firebase)](https://firebase.google.com/)
[![MQTT](https://img.shields.io/badge/MQTT-HiveMQ-purple?logo=mqtt)](https://www.hivemq.com/)

**SIGAP (Sistem Integrasi Gerbang & Akses Pintar)** - Repositori ini berisi antarmuka pemantauan berbasis web (Frontend) sekaligus Hakim Validasi (Backend API) untuk sistem gerbang pintar.

Proyek ini bertugas untuk:

1. Menghasilkan _Dynamic QR Code_ dengan stempel waktu (_timestamp_) yang terus diperbarui.
2. Memantau status kendaraan via protokol MQTT (WebSocket).
3. Menyediakan API Endpoint rahasia (`/api/verify`) untuk memvalidasi identitas karyawan dari aplikasi Mobile.

---

## 🚀 Persiapan Awal (Prerequisites)

Pastikan Anda telah menginstal perangkat lunak berikut di sistem Anda:

- [Node.js](https://nodejs.org/) (Versi 18.x atau lebih baru disarankan)
- Node Package Manager (`npm`)

---

## 🛠️ Instalasi & Setup Lingkungan

Ikuti langkah-langkah di bawah ini untuk menjalankan proyek secara lokal:

### 1. Kloning Repositori & Instal Dependensi

```bash
git clone [https://github.com/SIGAP-Core/sigap-dashboard.git](https://github.com/SIGAP-Core/sigap-dashboard.git)
cd sigap-dashboard
npm install
```

### 2. Konfigurasi Variabel Lingkungan (.env.local)

Proyek ini membutuhkan kredensial rahasia untuk Firebase Client dan koneksi MQTT (HiveMQ). Demi keamanan sistem, file konfigurasi ini tidak disertakan di dalam repositori.

1. Hubungi **Pemilik Proyek (Project Owner)** untuk meminta file `.env.local`.
2. Setelah Anda menerima file tersebut, letakkan tepat di **root direktori** proyek ini (sejajar dengan file `package.json`).

> [!IMPORTANT]
> File `.env.local` sengaja di-ignore melalui `.gitignore` demi keamanan kredensial.

### 3. Konfigurasi Firebase Admin

Agar API backend (`/api/verify`) dapat beroperasi dan memvalidasi token pengguna dari aplikasi Mobile SIGAP, server **wajib** memiliki _Service Account Key_ dari Firebase.

1. Hubungi **Pemilik Proyek (Project Owner)** untuk mendapatkan file kunci bernama **`firebase-admin.json`**.
2. Setelah file diterima, letakkan file tersebut tepat di **root direktori** proyek ini (sejajar dengan file `package.json`).

> [!IMPORTANT]
> File `firebase-admin.json` sengaja di-ignore melalui `.gitignore` demi keamanan akses server dan database.

## 💻 Menjalankan Aplikasi (Development)

Setelah semua konfigurasi selesai, jalankan server pengembangan:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat _Dashboard_ SIGMA.

Halaman _dashboard_ dapat dimodifikasi pada file `src/pages/index.tsx`, sedangkan logika backend dapat dimodifikasi pada `src/pages/api/verify.ts`. Proses perubahan akan dimuat ulang secara otomatis (_hot-reload_).

---

## 📡 API Reference

Aplikasi ini mengekspos satu _endpoint_ utama yang digunakan oleh perangkat Mobile SIGAP:

### `POST /api/verify`

Berfungsi untuk memvalidasi payload QR Code dan Token Autentikasi Pengguna.

**Request Body:**

```json
{
  "payload": "base64_encoded_qr_data",
  "userToken": "firebase_id_token_from_flutter"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Akses diterima. Selamat datang, User!"
}
```

---

## 🏗️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (Pages Router)
- **Language:** TypeScript
- **Auth & Backend:** [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- **IoT Protocol:** [MQTT.js](https://github.com/mqttjs/MQTT.js) (WebSocket via HiveMQ)

---

_Developed with 💡 by the SIGAP-Core Team._
