/**
 * ⚠️ MOCK DATA ENDPOINT - DEMO ONLY ⚠️
 *
 * Endpoint ini hanya untuk TESTING dan DEMO sebelum Hive setup selesai.
 * Generates fake vehicle detection logs untuk visualisasi UI.
 *
 * PRODUCTION: Gunakan /api/visual-logs endpoint (fetch real data dari Hive)
 *
 * Flow:
 * 1. ESP32 camera capture foto mobil
 * 2. Upload ke /api/upload-log dengan metadata
 * 3. Server save foto ke HDFS + metadata ke Hive
 * 4. Frontend fetch dari /api/visual-logs (real endpoint)
 * 5. Display foto di visual_log.tsx
 *
 * Current Status:
 * ✅ Mock endpoint (this file) - siap untuk demo
 * ✅ Real endpoint (/api/visual-logs.ts) - siap fetch dari Hive
 * ⏳ Hive database - perlu setup di namenode (100.90.109.94)
 * ⏳ Camera integration - tinggal trigger upload-log
 *
 * Setup next:
 * 1. SSH ke namenode: ssh admin@100.90.109.94
 * 2. Follow HIVE_SETUP_GUIDE.md
 * 3. Restart dashboard
 * 4. Visual log akan fetch real data dari Hive ✅
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { VisualLogFromHadoop } from "@/utils/db/hadoop";

type ResponseData = {
  success: boolean;
  data?: VisualLogFromHadoop[];
  error?: string;
  message?: string;
};

/**
 * Mock data simulasi dari Hadoop
 * Replace ini dengan data real dari Hadoop API Anda
 */
const generateMockVisualLogs = (limit: number = 100): VisualLogFromHadoop[] => {
  const logs: VisualLogFromHadoop[] = [];
  const baseTime = new Date("2025-04-16T09:00:00");

  for (let i = 0; i < Math.min(limit, 100); i++) {
    const time = new Date(baseTime.getTime() + i * 15 * 60 * 1000); // 15 min interval
    const isSuccess = Math.random() > 0.15; // 85% success rate

    logs.push({
      id: `visual_${String(i + 1).padStart(3, "0")}`,
      timestamp: time.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      cameraImage: isSuccess
        ? "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=200&h=150&fit=crop"
        : "https://images.unsplash.com/photo-1557821552-17105176677c?w=200&h=150&fit=crop",
      aiDecision: isSuccess ? "Success" : "Failed",
      vehicleCount: isSuccess ? Math.floor(Math.random() * 3) + 1 : 0,
      confidence: isSuccess
        ? Math.floor(Math.random() * 20) + 85 // 85-100%
        : Math.floor(Math.random() * 50) + 20, // 20-70%
    });
  }

  return logs;
};

/**
 * Mock Hadoop API endpoint - untuk development/testing
 * Ganti dengan implementasi real Hadoop ketika sudah siap
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use GET.",
    });
  }

  try {
    const { limit = "100", offset = "0" } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 100, 1000);
    const offsetNum = parseInt(offset as string) || 0;

    console.log(`[Mock Hadoop API] Returning mock data: limit=${limitNum}, offset=${offsetNum}`);

    // Generate mock data
    const allLogs = generateMockVisualLogs(500); // Simulate 500 logs from Hadoop

    // Apply pagination
    const paginatedLogs = allLogs.slice(offsetNum, offsetNum + limitNum);

    return res.status(200).json({
      success: true,
      data: paginatedLogs,
      message: `[MOCK DATA] Returned ${paginatedLogs.length} visual logs (offset: ${offsetNum}, limit: ${limitNum})`,
    });
  } catch (error) {
    console.error("[Mock Hadoop API] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch mock visual logs",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
