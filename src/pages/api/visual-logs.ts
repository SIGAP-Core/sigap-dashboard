import type { NextApiRequest, NextApiResponse } from "next";
import { getHadoopService, HadoopConfig, VisualLogFromHadoop, initHadoopService } from "@/utils/db/hadoop";

/**
 * API Endpoint untuk fetch visual logs dari Hadoop
 * GET /api/visual-logs?startDate=...&endDate=...&limit=...&offset=...
 */

type ResponseData = {
  success: boolean;
  data?: VisualLogFromHadoop[];
  error?: string;
  message?: string;
};

// Initialize Hadoop service dari environment variables
function getHadoopConfig(): HadoopConfig {
  const type = (process.env.HADOOP_TYPE || "rest") as any;
  
  return {
    type,
    host: process.env.HADOOP_HOST || "localhost",
    port: parseInt(process.env.HADOOP_PORT || "8080"),
    protocol: (process.env.HADOOP_PROTOCOL || "http") as "http" | "https",
    username: process.env.HADOOP_USER,
    password: process.env.HADOOP_PASSWORD,
    table: process.env.HADOOP_TABLE || "visual_logs",
    database: process.env.HADOOP_DATABASE || "default",
    path: process.env.HADOOP_PATH || "/visual_logs",
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use GET.",
    });
  }

  try {
    // Initialize Hadoop service
    const config = getHadoopConfig();
    
    // Try to get existing service, or init new one
    let hadoopService;
    try {
      hadoopService = getHadoopService();
    } catch {
      hadoopService = initHadoopService(config);
    }

    // Test connection first
    const connectionOk = await hadoopService.testConnection();
    if (!connectionOk) {
      console.warn("Hadoop connection test failed, attempting to fetch anyway...");
    }

    // Extract query parameters
    const {
      startDate,
      endDate,
      limit = "100",
      offset = "0",
    } = req.query;

    const filters = {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: Math.min(parseInt(limit as string) || 100, 1000), // Max 1000
      offset: parseInt(offset as string) || 0,
    };

    // Fetch visual logs dari Hadoop
    console.log("[Visual Logs API] Fetching from Hadoop with filters:", filters);
    const logs = await hadoopService.fetchVisualLogs(filters);

    // Apply date filters if needed (in case Hadoop doesn't support it)
    let filteredLogs = logs;
    if (startDate || endDate) {
      filteredLogs = logs.filter((log) => {
        const logDate = new Date(log.timestamp).getTime();
        const startTime = startDate ? new Date(startDate).getTime() : 0;
        const endTime = endDate ? new Date(endDate).getTime() : Infinity;
        return logDate >= startTime && logDate <= endTime;
      });
    }

    // Apply limit and offset
    filteredLogs = filteredLogs
      .slice(filters.offset, filters.offset + filters.limit);

    console.log("[Visual Logs API] Fetched logs count:", filteredLogs.length);

    return res.status(200).json({
      success: true,
      data: filteredLogs,
    });
  } catch (error) {
    console.error("[Visual Logs API] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check if it's a connection error (Hive not running)
    if (errorMessage.includes("UND_ERR_CONNECT_TIMEOUT") || 
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("Hive error")) {
      console.error("[Visual Logs API] Hive connection failed - server not running");
      return res.status(503).json({
        success: false,
        error: "Hive server not ready",
        message: "Apache Hive is not running on " + process.env.HADOOP_HOST + ":" + process.env.HADOOP_PORT + 
                 ". Please follow HIVE_SETUP_GUIDE.md to setup and start Hive.",
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      error: "Failed to fetch visual logs from Hadoop",
      message: errorMessage,
    });
  }
}
