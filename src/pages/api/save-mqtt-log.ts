import type { NextApiRequest, NextApiResponse } from "next";
import { uploadToHDFS, HDFS_BASE_DIR } from "@/lib/hdfs";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Base64 strings can be large, we need to increase limit
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { status, vehicle_count, confidence, image_base64 } = req.body;

    if (!image_base64) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Ekstrak base64 string, menghapus header data URI seperti 'data:image/jpeg;base64,'
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Menyesuaikan waktu menjadi waktu lokal komputer Anda (misal WIB GMT+7) 
    // bukan waktu UTC/London, agar timestamp-nya sama dengan jam komputer.
    const now = new Date();
    const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    
    // Timestamp untuk nama file
    const timestampStr = localTime.toISOString().replace(/[:T]/g, '-').split('.')[0];
    const fileName = `visual_${timestampStr}_${Math.floor(Math.random() * 1000)}`;
    const imagePath = `${HDFS_BASE_DIR}/${fileName}.jpg`;
    const metaPath = `${HDFS_BASE_DIR}/${fileName}.json`;

    // 1. Upload image ke HDFS
    const imageSuccess = await uploadToHDFS(imagePath, imageBuffer);
    
    // 2. Upload metadata (JSON) ke HDFS
    const metaPayload = {
      id: fileName,
      // Format YYYY-MM-DD HH:MM:SS
      timestamp: localTime.toISOString().replace('T', ' ').split('.')[0],
      aiDecision: status,
      vehicleCount: vehicle_count || 0,
      confidence: confidence || "0%",
      imageHdfsPath: imagePath
    };
    
    const metaBuffer = Buffer.from(JSON.stringify(metaPayload, null, 2));
    const metaSuccess = await uploadToHDFS(metaPath, metaBuffer);

    if (imageSuccess && metaSuccess) {
      console.log(`✅ [MQTT->HDFS] File gambar dan metadata sukses disimpan di HDFS! (${fileName})`);
      res.status(200).json({ success: true, message: "Saved to HDFS" });
    } else {
      console.error(`❌ [MQTT->HDFS] Gagal menyimpan ke HDFS untuk ${fileName}`);
      res.status(500).json({ error: "Failed to save to HDFS" });
    }
  } catch (error) {
    console.error("❌ [MQTT->HDFS] Exception:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
