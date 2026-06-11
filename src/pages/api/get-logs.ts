import type { NextApiRequest, NextApiResponse } from "next";
import { listHDFSDirectory, readHDFSJson, HDFS_BASE_DIR } from "@/lib/hdfs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const files = await listHDFSDirectory(HDFS_BASE_DIR);
    
    // Filter only json files (metadata)
    const jsonFiles = files.filter((f: any) => f.pathSuffix.endsWith(".json"));
    
    // Read the metadata for each json file
    // Note: For large directories, reading all files concurrently might overwhelm WebHDFS.
    // In a real production scenario, you would implement pagination and read them in batches.
    const logsPromises = jsonFiles.map(async (f: any) => {
      const filePath = `${HDFS_BASE_DIR}/${f.pathSuffix}`;
      const meta = await readHDFSJson(filePath);
      
      if (meta) {
        // Construct the image URL
        const imageUrl = meta.imageHdfsPath
          ? `/api/proxy-image?path=${encodeURIComponent(meta.imageHdfsPath)}`
          : "";
        
        // Map raw status strings to expected UI formats
        let decision = "Failed";
        if (
          meta.aiDecision === "MOBIL_VALID" || 
          meta.aiDecision === "Kendaraan Valid" || 
          meta.aiDecision === "Success"
        ) {
          decision = "Success";
        }

        return {
          id: meta.id,
          timestamp: meta.timestamp,
          cameraImage: imageUrl,
          aiDecision: decision,
          vehicleCount: meta.vehicleCount,
          confidence: parseInt(meta.confidence?.replace('%', '') || "0", 10),
        };
      }
      return null;
    });

    let logs = await Promise.all(logsPromises);
    
    // Filter out nulls and sort by timestamp descending
    logs = logs
      .filter((log) => log !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({ logs });
  } catch (error) {
    console.error("❌ Error fetching logs from HDFS:", error);
    res.status(500).json({ error: "Terjadi kesalahan internal saat mengambil data dari HDFS" });
  }
}
