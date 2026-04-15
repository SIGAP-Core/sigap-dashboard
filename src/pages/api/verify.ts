import type { NextApiRequest, NextApiResponse } from "next";
import mqtt from "mqtt";
import { adminAuth } from "@/utils/db/firebase-admin";

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
    console.log(`🔐 Akses diminta oleh: ${userEmail}`);

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

    // 3. EKSEKUSI BUKA GERBANG VIA MQTT
    console.log(`Verifikasi User: ${userToken} untuk Gate: ${gateId}`);

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
          }
        },
      );
    });
  } catch (error) {
    console.error("❌ Verifikasi Gagal:", error);
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Token pengguna tidak valid atau rusak.",
    });
  }
}
