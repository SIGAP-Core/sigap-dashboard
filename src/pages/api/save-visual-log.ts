import type { NextApiRequest, NextApiResponse } from "next";
import { getHadoopService, initHadoopService, HadoopConfig } from "@/utils/db/hadoop";

/**
 * API Endpoint untuk SAVE visual log ke Hive
 * Dipanggil oleh:
 * 1. /api/upload-log - setelah terima foto dari camera
 * 2. Dashboard - ketika MQTT data diterima
 *
 * Input:
 * {
 *   "timestamp": "2025-04-16 09:15:32",
 *   "ai_decision": "Success" | "Failed",
 *   "vehicle_count": 1,
 *   "confidence": 92,
 *   "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJ..." (optional)
 *   "image_url": "hdfs://namenode:8020/visual_logs/2025-04-16/image_001.jpg" (optional)
 * }
 *
 * Output: Saved visual log entry
 */

type ResponseData = {
  success: boolean;
  data?: {
    id: string;
    timestamp: string;
    camera_image: string;
    ai_decision: string;
    vehicle_count: number;
    confidence: number;
  };
  error?: string;
};

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

/**
 * Helper: Save image base64 to HDFS and return URL
 * Sekarang dummy, nanti akan integrate dengan actual HDFS upload
 */
async function saveImageToHDFS(imageBase64: string): Promise<string> {
  try {
    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/jpeg;base64,/, "");
    
    // Generate filename
    const timestamp = Date.now();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hdfsPath = `/visual_logs/${today}/image_${timestamp}.jpg`;
    
    // TODO: Implement actual HDFS upload
    // For now, return dummy HDFS URL
    const hdfsUrl = `hdfs://${process.env.HADOOP_HOST || 'namenode'}:8020${hdfsPath}`;
    
    console.log(`[SaveVisualLog] Image will be saved to: ${hdfsUrl}`);
    console.log(`[SaveVisualLog] Image size: ${base64Data.length} bytes`);
    
    // Placeholder - actual HDFS client library needed
    // const hdfsClient = require('webhdfs');
    // const client = hdfsClient.createClient();
    // await client.writeFile(hdfsPath, Buffer.from(base64Data, 'base64'));
    
    return hdfsUrl;
  } catch (error) {
    console.error('[SaveVisualLog] Error saving image to HDFS:', error);
    throw error;
  }
}

/**
 * Helper: Insert visual log data ke Hive table
 */
async function insertIntoHive(
  hadoopService: any,
  data: {
    timestamp: string;
    ai_decision: string;
    vehicle_count: number;
    confidence: number;
    image_url: string;
  }
): Promise<{ id: string; [key: string]: any }> {
  try {
    // Generate ID
    const id = `visual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build INSERT query
    const query = `
      INSERT INTO TABLE ${process.env.HADOOP_DATABASE || 'default'}.visual_logs
      VALUES (
        '${id}',
        '${data.timestamp}',
        '${data.image_url}',
        '${data.ai_decision}',
        ${data.vehicle_count},
        ${data.confidence}
      )
    `;
    
    console.log(`[SaveVisualLog] Executing INSERT query to Hive:`);
    console.log(`[SaveVisualLog] Database: ${process.env.HADOOP_DATABASE || 'default'}`);
    console.log(`[SaveVisualLog] Query: ${query.trim()}`);
    
    // Execute INSERT via HiveServer2 REST API
    const hiveUrl = `${process.env.HADOOP_PROTOCOL || 'http'}://${process.env.HADOOP_HOST}:${process.env.HADOOP_PORT}/cliservice/execute`;
    
    console.log(`[SaveVisualLog] Sending to Hive at: ${hiveUrl}`);
    
    const authHeader = process.env.HADOOP_USER && process.env.HADOOP_PASSWORD 
      ? { Authorization: `Basic ${Buffer.from(`${process.env.HADOOP_USER}:${process.env.HADOOP_PASSWORD}`).toString('base64')}` }
      : {};
    
    const insertResponse = await fetch(hiveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({ query }),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error(`[SaveVisualLog] Hive INSERT failed: ${insertResponse.status} - ${errorText}`);
      throw new Error(`Hive INSERT failed: ${insertResponse.statusText}`);
    }

    const insertResult = await insertResponse.json();
    console.log(`[SaveVisualLog] Hive INSERT successful`);
    console.log(`[SaveVisualLog] Response:`, JSON.stringify(insertResult).substring(0, 200));
    
    return {
      id,
      timestamp: data.timestamp,
      camera_image: data.image_url,
      ai_decision: data.ai_decision,
      vehicle_count: data.vehicle_count,
      confidence: data.confidence,
    };
  } catch (error) {
    console.error('[SaveVisualLog] Error inserting into Hive:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const {
      timestamp,
      ai_decision,
      vehicle_count,
      confidence,
      image_base64,
      image_url,
    } = req.body;

    // Validate required fields
    if (!timestamp || !ai_decision) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: timestamp, ai_decision",
      });
    }

    console.log("[SaveVisualLog] Received request:");
    console.log(`  - Timestamp: ${timestamp}`);
    console.log(`  - AI Decision: ${ai_decision}`);
    console.log(`  - Vehicle Count: ${vehicle_count || 0}`);
    console.log(`  - Confidence: ${confidence || 0}`);
    console.log(`  - Has image: ${image_base64 ? "yes" : "no"}`);

    let imageUrl = image_url;

    // If image_base64 provided, save to HDFS and get URL
    if (image_base64 && !image_url) {
      console.log("[SaveVisualLog] Saving image to HDFS...");
      imageUrl = await saveImageToHDFS(image_base64);
    }

    // Initialize Hadoop service
    const config = getHadoopConfig();
    let hadoopService;
    try {
      hadoopService = getHadoopService();
    } catch {
      hadoopService = initHadoopService(config);
    }

    // Insert into Hive
    console.log("[SaveVisualLog] Inserting into Hive table...");
    const savedLog = await insertIntoHive(hadoopService, {
      timestamp,
      ai_decision,
      vehicle_count: vehicle_count || 0,
      confidence: confidence || 0,
      image_url: imageUrl || "no_image",
    });

    console.log("[SaveVisualLog] Successfully saved to Hive:");
    console.log(`  - ID: ${savedLog.id}`);

    return res.status(200).json({
      success: true,
      data: savedLog,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[SaveVisualLog] Error:", errorMsg);

    return res.status(500).json({
      success: false,
      error: `Failed to save visual log: ${errorMsg}`,
    });
  }
}
