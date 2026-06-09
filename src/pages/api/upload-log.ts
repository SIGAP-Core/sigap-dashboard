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
function publishToMQTT(payload: any): Promise<void> {
  return new Promise((resolve)=> {
    let brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL || "";

    const options = {
      username: process.env.NEXT_PUBLIC_MQTT_USER || "",
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || "",
      connectTimeout: 5000,
    };

    const topic = process.env.NEXT_PUBLIC_TOPIC_UI_STATE || "";

    console.log("🔄 [NEXT.JS] Menyambung ke MQTT Broker untuk broadcast...");
    const client = mqtt.connect(brokerUrl, options);

    client.on("connect", () => {
      console.log("✅ [NEXT.JS] Terhubung ke Broker! Menembak pesan...");

      // Publish dan tunggu callback selesai
      client.publish(topic, JSON.stringify(payload), (err) => {
        if (err) {
          console.error("❌ [NEXT.JS] Gagal publish:", err);
        } else {
          console.log("📢 [NEXT.JS] Sukses menembak status ke Dashboard via MQTT!");
        }
        client.end(); // Langsung putus
        resolve(); // Notify NextJs jika tugas selesai
      });
    });

    client.on("error", (err) => {
      console.error("❌ [NEXT.JS] Gagal connect MQTT:", err);
      client.end();
      resolve(); // Tetap resolve agar tidak error 500
    });

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
          await publishToMQTT({
            status: mqtt_status,
            vehicle_count: parseInt(vehicle_count),
            confidence: confidence,
            image_base64: dataUri
          });
        } else {
          console.log(`📥 [NEXT.JS] Mode Lokal: Gambar log diterima. Status: ${status_ai}`);
          console.log(`⚠️ [NEXT.JS] MQTT Broadcast di-skip (Kondisi needs_broadcast: false)`);
        }

        // PROSES BACKGROUND HADOOP - SAVE KE HIVE
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

// --- FUNGSI UNTUK SAVE KE HIVE VIA /api/save-visual-log ---
async function uploadToHadoopBackground(
  imageBuffer: Buffer,
  timestamp: string,
  meta: any,
) {
  try {
    console.log("⚙️ [BACKGROUND] Memulai proses save ke Hive Cluster...");

    // Convert image buffer ke base64
    const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

    // Format timestamp jika belum dalam format yang benar
    const formattedTimestamp = new Date(parseInt(timestamp) * 1000).toISOString().replace('T', ' ').split('.')[0];

    // Call /api/save-visual-log endpoint
    const response = await fetch("http://localhost:3000/api/save-visual-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp: formattedTimestamp,
        ai_decision: meta.status_ai === "Success" ? "Success" : "Failed",
        vehicle_count: parseInt(meta.vehicle_count) || 0,
        confidence: parseInt(meta.confidence) || 0,
        image_base64: imageBase64,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ [BACKGROUND] Data visual log berhasil disimpan ke Hive!`);
      console.log(`   - ID: ${result.data?.id}`);
      console.log(`   - Timestamp: ${result.data?.timestamp}`);
      console.log(`   - Decision: ${result.data?.ai_decision}`);
    } else {
      const error = await response.text();
      console.error(`❌ [BACKGROUND] Gagal save ke Hive:`, error);
    }
  } catch (error) {
    console.error("❌ [BACKGROUND] Error saving to Hive:", error);
    // Don't throw - let the main request succeed even if Hive save fails
  }
}
