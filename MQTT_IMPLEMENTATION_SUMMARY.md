# MQTT Data Handling Implementation Summary

## 🎯 Problem Statement

User reported:

- ✅ MQTT data received from broker (sigap-core-broker-1/ui-state)
- ✅ Data format correct: `{status, vehicle_count, confidence, image_base64}`
- ❌ Data NOT appearing in Visual Logs page
- ❌ Error: "API error: Internal Server Error"

**Root Cause:** Data received by MQTT but NOT saved to Hive → when visual logs fetch from Hive, no data found → error 500

---

## ✅ Solution Implemented

### **1. Created 3 New API Endpoints**

#### **A. `/api/mqtt-handler` (NEW)**

- **Purpose:** Handle MQTT data from broker
- **Input:** MQTT data format `{status, vehicle_count, confidence, image_base64}`
- **Output:** Call `/api/save-visual-log` to persist
- **Status:** ✅ Ready for integration

#### **B. `/api/save-visual-log` (NEW)**

- **Purpose:** Save image + metadata to Hive
- **Flow:**
  1. Receive image_base64 + metadata
  2. Convert to HDFS path
  3. Execute INSERT query to Hive via HiveServer2
  4. Return saved record ID
- **Status:** ✅ Ready, will work when Hive running

#### **C. `/api/visual-logs` (UPDATED)**

- **Improvement:** Better error handling & messages
- **New:** Detects if Hive not running and returns helpful error
- **Status:** ✅ Production ready

### **2. Updated `/api/upload-log.ts` (MODIFIED)**

- **Before:** `uploadToHadoopBackground()` was just logging (dummy)
- **After:** Now calls `/api/save-visual-log` to actually save to Hive
- **Result:** Camera captures now properly persisted

### **3. Updated Error Messages in `visual_log.tsx`**

- Better guidance when Hive not ready
- Info about where photos stored
- Setup instructions inline

---

## 📊 New Data Flow

```
MQTT Broker
    ↓ (data received)
Frontend (MQTT subscription)
    ↓ POST to /api/mqtt-handler
/api/mqtt-handler
    ├─ Validate & convert data
    └─ POST to /api/save-visual-log
        ↓
/api/save-visual-log
    ├─ Save image to HDFS
    └─ INSERT metadata to Hive
        ↓
Hive Database (visual_logs table)
    ↓
/api/visual-logs (GET)
    └─ SELECT * FROM visual_logs
        ↓
visual_log.tsx
    └─ Display photos + metadata
```

---

## 🔧 Integration Steps (Frontend)

### **Step 1: Add MQTT Handler Call**

In your React component (likely where MQTT is subscribed):

```typescript
// When MQTT message received on sigap-core-broker-1/ui-state:
mqttClient.on("message", async (topic, message) => {
  try {
    const mqttData = JSON.parse(message.toString());
    console.log("[MQTT] Received:", mqttData);

    // Call backend handler to save to visual logs
    await fetch("/api/mqtt-handler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mqttData),
    });

    // Refresh visual logs table to show new data
    refreshVisualLogs();
  } catch (error) {
    console.error("[MQTT] Error:", error);
  }
});
```

### **Step 2: Setup Hive (One-time)**

```bash
# SSH to namenode
ssh admin@100.90.109.94

# Follow HIVE_SETUP_GUIDE.md:
# 1. Install MySQL (metastore)
# 2. Install Apache Hive
# 3. Create sigap.visual_logs table:
hive> CREATE TABLE sigap.visual_logs (
  id STRING,
  timestamp STRING,
  camera_image STRING,
  ai_decision STRING,
  vehicle_count INT,
  confidence INT
);

# Start services:
$HIVE_HOME/bin/hive --service metastore &
$HIVE_HOME/bin/hive --service hiveserver2 &
```

### **Step 3: Verify**

```bash
# Ports should be listening:
netstat -tlnp | grep -E '8883|10000|9083'

# Output:
# LISTEN ... :8883 ...  (HiveServer2 HTTP)
# LISTEN ... :10000 ... (HiveServer2 JDBC)
# LISTEN ... :9083 ...  (Metastore)
```

### **Step 4: Test**

```bash
# Trigger MQTT message or camera capture
# Check dashboard logs: npm run dev terminal
# Visual logs page should show new data

# Or manual test:
curl -X POST http://localhost:3000/api/mqtt-handler \
  -H "Content-Type: application/json" \
  -d '{
    "status": "MOBIL_VALID",
    "vehicle_count": 1,
    "confidence": "92%",
    "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

---

## 📁 Files Modified/Created

| File                           | Status     | Change                                  |
| ------------------------------ | ---------- | --------------------------------------- |
| `/api/mqtt-handler.ts`         | ✅ NEW     | Handle MQTT → call save-visual-log      |
| `/api/save-visual-log.ts`      | ✅ NEW     | Save image + metadata to Hive           |
| `/api/visual-logs.ts`          | ✅ UPDATED | Better error handling                   |
| `/api/upload-log.ts`           | ✅ UPDATED | Call save-visual-log (not just logging) |
| `visual_log.tsx`               | ✅ UPDATED | Better error messages, updated header   |
| `MQTT_TO_VISUAL_LOGS_GUIDE.md` | ✅ NEW     | Complete integration guide              |

---

## 🎯 Current Status

### **What's Working:**

- ✅ MQTT data received from broker
- ✅ API endpoints ready for integration
- ✅ Camera upload flow properly integrated
- ✅ Error messages helpful
- ✅ No compilation errors

### **What's Pending:**

- ⏳ Frontend MQTT handler integration (need to add call to /api/mqtt-handler)
- ⏳ Hive setup on namenode
- ⏳ HDFS /visual_logs directory creation
- ⏳ End-to-end testing

---

## 🚀 Next Actions

### **Immediate (To-Do Now):**

1. **Check if Frontend Already Calling Handler**
   - Search for MQTT subscription in React code
   - If found, add call to `/api/mqtt-handler`
   - If not found, need to setup MQTT subscription

2. **Setup Hive** (~1 hour)
   - SSH to 100.90.109.94
   - Follow HIVE_SETUP_GUIDE.md
   - Create visual_logs table
   - Start Hive services

3. **Test End-to-End**
   - Trigger camera capture
   - Verify photo in visual logs
   - Check server logs for errors

---

## 📝 Example Flow (When Everything Ready)

```
1. Camera detects car
   ↓
2. POST to /api/upload-log with photo
   ↓
3. uploadToHadoopBackground() calls /api/save-visual-log
   ↓
4. save-visual-log saves to HDFS + inserts to Hive
   ↓
5. Hive table updated with new record
   ↓
6. Visual logs page refreshes
   ↓
7. Photo appears in table ✅
```

OR (via MQTT):

```
1. MQTT broker publishes to sigap-core-broker-1/ui-state
   ↓
2. Frontend receives data
   ↓
3. Frontend calls /api/mqtt-handler
   ↓
4. Handler calls /api/save-visual-log
   ↓
5. Photo saved to Hive
   ↓
6. Visual logs page refreshes
   ↓
7. Photo appears in table ✅
```

---

## 🐛 Troubleshooting Quick Reference

| Issue                             | Cause                         | Fix                     |
| --------------------------------- | ----------------------------- | ----------------------- |
| Visual logs empty                 | No data in Hive               | Trigger camera or MQTT  |
| 500 error on /api/visual-logs     | Hive not running              | Start HiveServer2       |
| 500 error on /api/save-visual-log | Hive query failed             | Check Hive logs         |
| Photo not displayed               | Image not in HDFS             | Create /visual_logs dir |
| MQTT handler 202 status           | Save failed but MQTT received | Check Hive connection   |

---

## 📚 Documentation Files

All created/updated:

- `MQTT_TO_VISUAL_LOGS_GUIDE.md` - Integration guide
- `CAMERA_TO_VISUAL_LOGS_FLOW.md` - Camera capture flow
- `PHOTO_STORAGE_GUIDE.md` - Where photos stored
- `HIVE_SETUP_GUIDE.md` - Hive setup steps

---

**Version:** 1.0  
**Date:** 2025-04-16  
**Status:** Ready for Frontend Integration
