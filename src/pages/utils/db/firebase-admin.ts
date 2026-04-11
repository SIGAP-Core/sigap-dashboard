import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

// Bungkus dalam fungsi agar aman dari siklus hot-reload Next.js
function getAdminAuth() {
  if (!admin.apps.length) {
    try {
      const serviceAccountPath = path.join(
        process.cwd(),
        "firebase-admin.json",
      );

      // Membaca file secara fisik, menghindari bug require() di Turbopack
      const fileContent = fs.readFileSync(serviceAccountPath, "utf8");
      const serviceAccount = JSON.parse(fileContent);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("✅ Firebase Admin Berhasil Terhubung!");
    } catch (error) {
      console.error("❌ Gagal inisialisasi Firebase Admin:", error);
    }
  }
  return admin.auth();
}

export const adminAuth = getAdminAuth();
