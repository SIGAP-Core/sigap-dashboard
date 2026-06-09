# MQTT Data to Visual Logs Integration Guide

## 🎯 Current Status

✅ **Data Flow Implemented:**

1. MQTT broker sends data to dashboard (sigap-core-broker-1/ui-state)
2. Dashboard receives: `{status, vehicle_count, confidence, image_base64}`
3. API endpoints ready to save to Hive
4. Visual logs page displays data when available

❌ **Missing:**

- MQTT subscription on frontend → hasn't called the handler yet
- Frontend needs to call `/api/mqtt-handler` when data received

---

## 📊 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MQTT Broker (HiveMQ)                         │
│  Topic: sigap-core-broker-1/ui-state                            │
│  Data: {status, vehicle_count, confidence, image_base64}        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ MQTT.subscribe()
                           ↓
            ┌──────────────────────────────┐
            │  Dashboard Frontend (React)  │
            │  (Received via paho-mqtt)    │
            └──────────────┬───────────────┘
                           │ Call /api/mqtt-handler
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│              /api/mqtt-handler (POST)                            │
│  - Receive MQTT data                                             │
│  - Convert status → ai_decision                                  │
│  - Extract metadata                                              │
│  - Call /api/save-visual-log                                     │
└──────────────┬──────────────────────────────────────────────────┘
               │ POST
               ↓
┌─────────────────────────────────────────────────────────────────┐
│              /api/save-visual-log (POST)                         │
│  - Receive image + metadata                                      │
│  - Save image_base64 to HDFS                                     │
│  - Execute INSERT query to Hive                                  │
│  - Return saved record ID                                        │
└──────────────┬──────────────────────────────────────────────────┘
               │ INSERT INTO visual_logs
               ↓
        ┌────────────────┐
        │  Hive Database │
        │  visual_logs   │
        │  table         │
        └────────┬───────┘
                 │
    ┌────────────┴────────────┐
    │ /api/visual-logs (GET)  │
    │ SELECT * FROM visual... │
    └────────────┬────────────┘
                 │
                 ↓
          ┌─────────────┐
          │ Visual Logs │
          │ Page (tsx)  │
          │ Display     │
          │ Photos + MD │
          └─────────────┘
```

---

## 🔧 Implementation Steps

### **Step 1: Frontend - Subscribe to MQTT & Call Handler**

```typescript
// In your React component or useEffect hook
// Listen for MQTT messages and forward to /api/mqtt-handler

useEffect(() => {
  const subscribeToMQTT = () => {
    const topic = process.env.NEXT_PUBLIC_TOPIC_UI_STATE;

    // Subscribe to MQTT topic
    mqttClient.subscribe(topic, (err) => {
      if (!err) {
        console.log(`✅ Subscribed to ${topic}`);
      }
    });

    // Handle incoming messages
    mqttClient.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("[MQTT] Received:", data);

        // Forward to backend handler
        handleMQTTData(data);
      } catch (error) {
        console.error("[MQTT] Failed to parse message:", error);
      }
    });
  };

  subscribeToMQTT();
}, [mqttClient]);

// Call backend handler
const handleMQTTData = async (mqttData) => {
  try {
    console.log("[Frontend] Saving MQTT data to visual logs...");

    const response = await fetch("/api/mqtt-handler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mqttData),
    });

    const result = await response.json();

    if (result.success) {
      console.log("✅ Data saved to visual logs");
      // Refresh visual logs table
      refreshVisualLogs();
    } else {
      console.error("❌ Failed to save:", result.error);
    }
  } catch (error) {
    console.error("[Frontend] Error:", error);
  }
};
```

### **Step 2: Backend - Save Data to Hive**

**Endpoint: `/api/save-visual-log` (already created)**

Flow:

1. Receive image_base64 + metadata
2. Save image to HDFS
3. Execute INSERT query to Hive
4. Return saved record ID

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/save-visual-log \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-04-16 09:15:32",
    "ai_decision": "Success",
    "vehicle_count": 1,
    "confidence": 92,
    "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "visual_1744984532_abc123",
    "timestamp": "2025-04-16 09:15:32",
    "camera_image": "hdfs://namenode:8020/visual_logs/2025-04-16/image_001.jpg",
    "ai_decision": "Success",
    "vehicle_count": 1,
    "confidence": 92
  }
}
```

### **Step 3: MQTT Handler - Convert & Persist**

**Endpoint: `/api/mqtt-handler` (already created)**

Converts MQTT format → visual_logs format:

```
MQTT Input:
{
  "status": "MOBIL_VALID",
  "vehicle_count": 1,
  "confidence": "92%",
  "image_base64": "..."
}
        ↓ Convert
Visual Logs Format:
{
  "timestamp": "2025-04-16 09:15:32",
  "ai_decision": "Success",    ← status: MOBIL_VALID = Success
  "vehicle_count": 1,
  "confidence": 92,             ← remove % from string
  "image_base64": "..."
}
```

---

## 📋 API Reference

### **1. POST /api/mqtt-handler**

Convert MQTT data → save to visual logs

**Request:**

```json
{
  "status": "MOBIL_VALID", // or "MOBIL_TIDAK_VALID"
  "vehicle_count": 1,
  "confidence": "92%",
  "image_base64": "data:image/jpeg;base64,..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "MQTT data saved to visual logs successfully"
}
```

### **2. POST /api/save-visual-log**

Save visual log (image + metadata) to Hive

**Request:**

```json
{
  "timestamp": "2025-04-16 09:15:32",
  "ai_decision": "Success",
  "vehicle_count": 1,
  "confidence": 92,
  "image_base64": "data:image/jpeg;base64,...", // or
  "image_url": "hdfs://namenode:8020/visual_logs/..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "visual_1744984532_abc123",
    "timestamp": "2025-04-16 09:15:32",
    "camera_image": "hdfs://namenode:8020/visual_logs/2025-04-16/image_001.jpg",
    "ai_decision": "Success",
    "vehicle_count": 1,
    "confidence": 92
  }
}
```

### **3. GET /api/visual-logs**

Fetch visual logs from Hive

**Request:**

```
GET /api/visual-logs?startDate=2025-04-16&limit=100&offset=0
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "visual_001",
      "timestamp": "2025-04-16 09:15:32",
      "cameraImage": "hdfs://namenode:8020/visual_logs/2025-04-16/image_001.jpg",
      "aiDecision": "Success",
      "vehicleCount": 1,
      "confidence": 92
    }
  ]
}
```

---

## 🐛 Troubleshooting

### **Issue: Visual logs still empty after MQTT data received**

**Possible causes:**

1. **Frontend not calling /api/mqtt-handler**

   ```
   Check: Browser console for MQTT messages
   Fix: Add MQTT subscription listener in component
   ```

2. **Hive server not running**

   ```
   Check: netstat -tlnp | grep 8883
   Fix: Start Hive: $HIVE_HOME/bin/hive --service hiveserver2 &
   ```

3. **/api/save-visual-log getting 500 error**

   ```
   Check: Server logs for error detail
   Common: HADOOP_HOST/PORT wrong, or Hive not responding
   ```

4. **Image not saving to HDFS**
   ```
   Check: Is /visual_logs directory created?
   Fix: hdfs dfs -mkdir -p /visual_logs; hdfs dfs -chmod 777 /visual_logs
   ```

### **Issue: 500 error on /api/visual-logs**

**Root cause:** Hive not running or query failed

**Fix:**

```bash
# SSH to namenode
ssh admin@100.90.109.94

# Check if Hive is running
ps aux | grep hiveserver2

# If not running, start it:
nohup $HIVE_HOME/bin/hive --service hiveserver2 > /tmp/hive.log 2>&1 &

# Verify:
netstat -tlnp | grep 8883
```

### **Issue: Data saved but photo not displaying**

**Possible causes:**

1. Image_base64 not properly encoded
2. HDFS path wrong
3. ImageWithFallback component not loading

**Debug:**

```typescript
// In visual_log.tsx, add logging:
console.log("Log image URL:", log.cameraImage);

// Try direct access:
// http://100.90.109.94:50070/webhdfs/v1/visual_logs/2025-04-16/image_001.jpg
```

---

## 📚 Related Files

| File                      | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `/api/mqtt-handler.ts`    | Handle MQTT → visual_logs                                  |
| `/api/save-visual-log.ts` | Save image + metadata to Hive                              |
| `/api/visual-logs.ts`     | Fetch visual logs from Hive                                |
| `/api/upload-log.ts`      | Receive photo from camera (updated to use save-visual-log) |
| `visual_log.tsx`          | Display photos in table                                    |

---

## 🚀 Testing

### **Manual Test 1: Call /api/mqtt-handler directly**

```bash
curl -X POST http://localhost:3000/api/mqtt-handler \
  -H "Content-Type: application/json" \
  -d '{
    "status": "MOBIL_VALID",
    "vehicle_count": 1,
    "confidence": "92%",
    "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

### **Manual Test 2: Check Hive data**

```bash
# SSH to namenode
ssh admin@100.90.109.94

# Connect to Hive
hive

# Query:
hive> SELECT * FROM default.visual_logs;
```

### **Manual Test 3: Check visual_log page**

1. Open browser: http://localhost:3000/visual-log
2. Should see table with photos
3. Check browser console for errors
4. Check server logs: `npm run dev` terminal

---

## 📈 Production Checklist

Before demo to stakeholders:

- [ ] Hive server running on namenode (100.90.109.94:8883)
- [ ] MySQL metastore running
- [ ] visual_logs table created in Hive
- [ ] HDFS /visual_logs directory created
- [ ] /api/mqtt-handler endpoint working
- [ ] /api/save-visual-log endpoint working
- [ ] /api/visual-logs endpoint working
- [ ] Frontend MQTT subscription setup (calling /api/mqtt-handler)
- [ ] Test end-to-end: MQTT data → saved to Hive → displayed on page
- [ ] Photos displaying correctly in table

---

## 🎯 Next Steps

1. **Setup Frontend MQTT Handler** (if not already done)
   - Add MQTT subscription in component
   - Call `/api/mqtt-handler` when data received

2. **Verify Hive is Running**
   - SSH to namenode: 100.90.109.94
   - Start Hive if needed

3. **Test End-to-End**
   - Trigger camera capture
   - Verify photo appears in visual logs

4. **Production Deployment**
   - Configure proper error handling
   - Setup monitoring & logging
   - Test with real camera data

---

**Last Updated:** 2025-04-16  
**Version:** 1.0
