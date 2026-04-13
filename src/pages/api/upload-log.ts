import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File } from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Wajib false agar formidable bisa membaca form-data
  },
};

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
        if (Array.isArray(file_gambar)) {
          file_gambar = file_gambar[0]; // Jika array, ambil yang pertama
        }

        if (!file_gambar) {
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

        // Baca file gambar
        const imageBuffer = fs.readFileSync((file_gambar as File).filepath);
        console.log(
          `📥 [NEXT.JS] Menerima gambar log. Status AI: ${status_ai}, Yakin: ${confidence}`,
        );

        // ==========================================
        // 🚀 PROSES BACKGROUND HADOOP
        // ==========================================
        uploadToHadoopBackground(imageBuffer, timestamp, {
          status_ai,
          vehicle_count,
          confidence,
        });

        // ==========================================
        // ⚡ RESPON CEPAT KE PYTHON
        // ==========================================
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
