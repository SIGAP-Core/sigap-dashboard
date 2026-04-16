import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

// Memastikan jika firebase admin hanya berjalan di sisi server
if (typeof window !== "undefined") {
  throw new Error("Firebase Admin tidak boleh dijalankan di client-side!");
}

// Bungkus dalam fungsi agar aman dari siklus hot-reload Next.js
function getAdminAuth() {
  if (!admin.apps.length) {
    try {
      let credential;

      const serviceAccountPath = path.join(process.cwd(), "firebase-admin.json");

      if (fs.existsSync(serviceAccountPath)) {
        // --- LOCAL MODE ---
        // Membaca file secara fisik, menghindari bug require() di Turbopack
        const fileContent = fs.readFileSync(serviceAccountPath, "utf8");
        credential = admin.credential.cert(JSON.parse(fileContent));
        console.log("✅ Firebase Admin Terhubung menggunakan file lokal (JSON)");
      } else {
        // --- PRODUCTION MODE ---
        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
          throw new Error("Missing Firebase Environment Variables");
        }

        credential = admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        } as admin.ServiceAccount);
        console.log("✅ Firebase Admin Terhubung menggunakan Environment Variables");
      }

      admin.initializeApp({ credential });

      console.log("✅ Firebase Admin Berhasil Terhubung!");
    } catch (error) {
      console.error("❌ Gagal inisialisasi Firebase Admin:", error);
      throw error;
    }
  }
  return admin.auth();
}

export const adminAuth = getAdminAuth();
