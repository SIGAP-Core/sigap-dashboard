import type { NextApiRequest, NextApiResponse } from "next";

/**
 * API Endpoint untuk HANDLE data dari MQTT broker
 * Dipanggil oleh frontend ketika menerima data dari sigap-core-broker-1/ui-state
 *
 * Data format dari MQTT:
 * {
 *   "status": "MOBIL_VALID",
 *   "vehicle_count": 1,
 *   "confidence": "92%",
 *   "image_base64": "[DATA_GAMBAR_TERSEMBUNYI]"
 * }
 *
 * Endpoint ini akan:
 * 1. Convert status MQTT → ai_decision
 * 2. Ekstrak metadata
 * 3. Call /api/save-visual-log untuk persist ke Hive
 */

type ResponseData = {
  success: boolean;
  message?: string;
  error?: string;
};

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
    const { status, vehicle_count, confidence, image_base64 } = req.body;

    console.log("[MQTTHandler] Received MQTT data:");
    console.log(`  - Status: ${status}`);
    console.log(`  - Vehicle Count: ${vehicle_count}`);
    console.log(`  - Confidence: ${confidence}`);
    console.log(`  - Has Image: ${image_base64 ? "yes" : "no"}`);

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: status",
      });
    }

    // Convert MQTT status to AI decision
    const aiDecision = status === "MOBIL_VALID" ? "Success" : "Failed";

    // Parse confidence (remove % if present)
    const confidenceValue = confidence
      ? parseInt(confidence.toString().replace("%", ""))
      : 0;

    // Generate timestamp
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];

    console.log("[MQTTHandler] Preparing to save visual log:");
    console.log(`  - Timestamp: ${timestamp}`);
    console.log(`  - AI Decision: ${aiDecision}`);
    console.log(`  - Vehicle Count: ${vehicle_count}`);
    console.log(`  - Confidence: ${confidenceValue}%`);

    // Call /api/save-visual-log to persist data
    const saveResponse = await fetch("http://localhost:3000/api/save-visual-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp,
        ai_decision: aiDecision,
        vehicle_count: vehicle_count || 0,
        confidence: confidenceValue,
        image_base64: image_base64,
      }),
    });

    if (saveResponse.ok) {
      const saveResult = await saveResponse.json();
      console.log("[MQTTHandler] ✅ Visual log saved successfully");
      console.log(`   - ID: ${saveResult.data?.id}`);

      return res.status(200).json({
        success: true,
        message: "MQTT data saved to visual logs successfully",
      });
    } else {
      const error = await saveResponse.text();
      console.error("[MQTTHandler] ❌ Failed to save:", error);
      
      // Return partial success - MQTT received but not saved
      return res.status(202).json({
        success: true,
        message: "MQTT received but save failed. Check server logs.",
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[MQTTHandler] Error:", errorMsg);

    return res.status(500).json({
      success: false,
      error: `Error processing MQTT data: ${errorMsg}`,
    });
  }
}
