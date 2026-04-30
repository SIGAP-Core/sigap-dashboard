import type { NextApiRequest, NextApiResponse } from "next";
import mqtt from "mqtt";
import {adminAuth, adminDb} from "@/utils/db/firebase-admin";

// --- KONFIGURASI HIVEMQ (Sama dengan Frontend) ---
const MQTT_URL = process.env.NEXT_PUBLIC_MQTT_URL || "";
const MQTT_OPTIONS = {
  username: process.env.NEXT_PUBLIC_MQTT_USER || "",
  password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || "",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Hanya izinkan metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { payload, userToken } = req.body;

  try {
    // 1. VERIFIKASI IDENTITAS PENGGUNA (VIA FIREBASE ADMIN)
    // Menjamin userToken berasal dari login sah di aplikasi SIGAP Flutter
    const decodedUser = await adminAuth.verifyIdToken(userToken);
    const userEmail = decodedUser.email;
    const uid = decodedUser.uid;
    console.log(`🔐 Akses diminta oleh: ${userEmail} (UID: ${uid})`);

    // 2. VERIFIKASI QR CODE (LOGIKA STATELESS)
    const decodedBuffer = Buffer.from(payload, "base64").toString();
    const data = JSON.parse(decodedBuffer);

    const gateId = data.gate_id;
    const timestamp = data.timestamp;
    const now = Date.now();

    // CEK QRCODE YG KADALUWARSA (Batas toleransi 60 detik)
    const diffInSeconds = (now - timestamp) / 1000;

    if (diffInSeconds > 60) {
      return res.status(401).json({
        success: false,
        message: "QR Code sudah kadaluwarsa (Expired). Silakan scan ulang.",
      });
    }

    // 3. SIMPAN LOG AKSES KE FIRESTORE SEBELUM BUKA GERBANG
    const waktuAkses = new Date().toISOString(); // Format standar ISO
    await adminDb.collection("access_logs").add({
      uid: uid,
      tanggal: waktuAkses,
    });
    console.log(`📝 Log akses berhasil disimpan untuk UID: ${uid}`);

    // 4. EKSEKUSI BUKA GERBANG VIA MQTT
    console.log(`Verifikasi User: ${userToken} untuk Gate: ${gateId}`);

    await new Promise<void>((resolve) => {
      const client = mqtt.connect(MQTT_URL, MQTT_OPTIONS);

      client.on("connect", () => {
        console.log(`📢 Hakim SIGAP mengizinkan ${userEmail} membuka ${gateId}`);
        client.publish(
            process.env.NEXT_PUBLIC_TOPIC_GATE_CONTROL ||
            "sigap-core-broker-1/gate-control",
            "BUKA_GERBANG",
            (err) => {
              client.end();
              if (!err) {
                return res.status(200).json({
                  success: true,
                  message: `Akses diterima. Selamat datang, ${userEmail}!`,
                });
              } else {
                // throw new Error("Gagal mengirim perintah MQTT");
                res.status(500).json({
                  success: false,
                  message: "Gagal mengirim perintah MQTT",
                });
              }
              resolve();
            },
        );
      });

      client.on("error", (err) => {
        console.error("❌ Gagal connect MQTT:", err);
        client.end();
        res.status(500).json({
          success: false,
          message: "Server gerbang tidak merespon.",
        });
        resolve();
      });
    })
  } catch (error) {
    console.error("❌ Verifikasi Gagal:", error);
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Token pengguna tidak valid atau rusak.",
    });
  }
}
