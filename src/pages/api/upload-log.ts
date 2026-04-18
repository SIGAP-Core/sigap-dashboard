import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File } from "formidable";
import fs from "fs";
import mqtt from "mqtt";

export const config = {
  api: {
    bodyParser: false, // Wajib false agar formidable bisa membaca form-data
  },
};

// FUNGSI BROADCAST MQTT DARI NEXT.JS
function publishToMQTT(payload: any) {
  const brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL || "";
  const options = {
    username: process.env.NEXT_PUBLIC_MQTT_USER || "",
    password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || "",
  };
  const topic = process.env.NEXT_PUBLIC_TOPIC_UI_STATE || "";

  console.log("🔄 [NEXT.JS] Menyambung ke MQTT Broker untuk broadcast...");
  const client = mqtt.connect(brokerUrl, options);

  client.on("connect", () => {
    client.publish(topic, JSON.stringify(payload));
    console.log("📢 [NEXT.JS] Sukses menembak status ke Dashboard via MQTT!");
    client.end(); // Langsung putus setelah nembak biar memori server tetap lega
  });

  client.on("error", (err) => {
    console.error("❌ [NEXT.JS] Gagal konek MQTT:", err);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const form = formidable({});

  // Bungkus dalam Promise agar Next.js tidak "kabur" duluan
  return new Promise<void>((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ Gagal parsing form:", err);
        res.status(500).json({ error: "Gagal memproses data" });
        return resolve();
      }

      try {
        // Ambil file (Aman untuk formidable v2 maupun v3)
        let file_gambar = files.file_gambar;
        // if (Array.isArray(file_gambar)) {
        //   file_gambar = file_gambar[0]; // Jika array, ambil yang pertama
        // }
        const singleFile = Array.isArray(file_gambar)
          ? file_gambar[0]
          : file_gambar;

        if (!singleFile) {
          console.error("❌ file_gambar tidak ditemukan di payload!");
          console.log("Isi files:", Object.keys(files)); // Debugging
          res.status(400).json({ error: "File gambar tidak ditemukan" });
          return resolve();
        }

        // Ambil metadata (Aman untuk array/string)
        const getField = (val: any, defaultVal: string) =>
          Array.isArray(val) ? val[0] : val || defaultVal;

        const status_ai = getField(fields.status_ai, "Unknown");
        const vehicle_count = getField(fields.vehicle_count, "0");
        const timestamp = getField(fields.timestamp, Date.now().toString());
        const confidence = getField(fields.confidence, "0%");

        // Keperluan MQTT (Jika python tidak sanggup untuk mengirim broadcast MQTT)
        const needs_broadcast = getField(fields.needs_broadcast, "false");

        // Baca file gambar
        const imageBuffer = fs.readFileSync((singleFile as File).filepath);
        console.log(
          `📥 [NEXT.JS] Menerima gambar log. Status AI: ${status_ai}, Yakin: ${confidence}`,
        );

        // Kondisi pada saat python API tak sanggup untuk broadcast MQTT, dan membutuhkan bantuan NEXTJS
        if (needs_broadcast === "true") {
          const mqtt_status = getField(fields.mqtt_status, "MOBIL_TIDAK_VALID");

          console.log(`📥 [NEXT.JS] Mode Cloud: Menerima gambar dan menembak MQTT (${mqtt_status})`);

          // Ubah gambar jadi teks Base64 untuk dikirim via MQTT
          const imageBase64 = imageBuffer.toString("base64");
          const dataUri = `data:image/jpeg;base64,${imageBase64}`;

          // Tembak ke UI
          publishToMQTT({
            status: mqtt_status,
            vehicle_count: parseInt(vehicle_count),
            confidence: confidence,
            image_base64: dataUri
          });
        } else {
          console.log(`📥 [NEXT.JS] Mode Lokal: Gambar log diterima. Status: ${status_ai}`);
          console.log(`⚠️ [NEXT.JS] MQTT Broadcast di-skip (Kondisi needs_broadcast: false)`);
        }

        // ==========================================
        // 🚀 PROSES BACKGROUND HADOOP
        // ==========================================
        uploadToHadoopBackground(imageBuffer, timestamp, {
          status_ai,
          vehicle_count,
          confidence,
        });

        // RESPON CEPAT KE PYTHON
        res.status(200).json({
          success: true,
          message: "Data sukses diterima Next.js!",
        });
        return resolve();
      } catch (error) {
        console.error("❌ Error internal:", error);
        res.status(500).json({ error: "Terjadi kesalahan internal server" });
        return resolve();
      }
    });
  });
}

// --- FUNGSI DUMMY UNTUK HADOOP ---
function uploadToHadoopBackground(
  imageBuffer: Buffer,
  timestamp: string,
  meta: any,
) {
  console.log("⚙️ [BACKGROUND] Memulai proses upload ke Hadoop Cluster...");
  setTimeout(() => {
    console.log(
      `✅ [BACKGROUND] File gambar_${timestamp}.jpg sukses disimpan di HDFS!`,
    );
    console.log(`✅ [BACKGROUND] Meta Log disimpan:`, meta);
  }, 3000);
}
