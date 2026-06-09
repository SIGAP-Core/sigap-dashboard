# 📸 Dimana Foto dari Camera Disimpan?

## Quick Answer

```
Foto disimpan di HDFS (Hadoop File System):
  Path: hdfs://namenode:8020/visual_logs/YYYY-MM-DD/image_[timestamp].jpg

URL Reference di Hive table:
  camera_image: "hdfs://namenode:8020/visual_logs/2025-04-16/image_001.jpg"

Akses:
  - Hadoop Web UI: http://100.90.109.94:50070/explorer.html
  - HiveQL: SELECT * FROM visual_logs WHERE camera_image LIKE '%'
  - Direct: Perlu HDFS client atau proxy HTTP
```

---

## 📍 Storage Location Mapping

### **Pada saat Camera Capture:**

```javascript
// ESP32 atau sensor device
1. Detect mobil lewat sensor
2. Capture foto via camera
3. Kirim ke server:
   POST /api/upload-log
   Form Data:
     - file_gambar: [binary JPEG data]
     - status_ai: "Success"
     - vehicle_count: 1
     - confidence: "92%"
     - timestamp: "1744984532"
```

### **Di Server (/api/upload-log):**

```typescript
// src/pages/api/upload-log.ts
1. Terima file_gambar (binary)
2. Read ke imageBuffer
3. Save path di HDFS:
   hdfs://namenode:8020/visual_logs/2025-04-16/image_1744984532.jpg
4. Save metadata di Hive:
   INSERT INTO sigap.visual_logs VALUES (
     'visual_001',
     '2025-04-16 09:15:32',
     'hdfs://namenode:8020/visual_logs/2025-04-16/image_1744984532.jpg',
     'Success',
     1,
     92
   )
```

### **Database (Hive):**

```sql
-- sigap.visual_logs table
SELECT * FROM visual_logs;

id            | timestamp           | camera_image                                          | ai_decision | vehicle_count | confidence
---------------------------------------------------------------------------
visual_001    | 2025-04-16 09:15:32 | hdfs://.../visual_logs/2025-04-16/image_001.jpg     | Success     | 1             | 92
visual_002    | 2025-04-16 09:30:45 | hdfs://.../visual_logs/2025-04-16/image_002.jpg     | Failed      | 0             | 0
visual_003    | 2025-04-16 09:45:12 | hdfs://.../visual_logs/2025-04-16/image_003.jpg     | Success     | 2             | 88
```

### **Di Browser (Visual Logs Page):**

```
1. Visual_log.tsx fetch: GET /api/visual-logs
2. API query Hive: SELECT * FROM visual_logs
3. Return JSON dengan camera_image URLs
4. Browser download foto dari HDFS via HTTP proxy
5. Display di table dengan ImageWithFallback component

┌─────────────────────────────────────────────┐
│ Visual Logs Table                           │
├──────┬──────────────────┬─────────────────┤
│ ID   │ Timestamp        │ Camera Image    │ Status
├──────┼──────────────────┼─────────────────┤
│ 001  │ 09:15:32         │ [🚗 Image]      │ Success
│ 002  │ 09:30:45         │ [broken link]   │ Failed
│ 003  │ 09:45:12         │ [🚗 Image]      │ Success
└──────┴──────────────────┴─────────────────┘
```

---

## 🗂️ Directory Structure di HDFS

```
/visual_logs/
├── 2025-04-16/
│   ├── image_001.jpg (mobil ditangkap pukul 09:15)
│   ├── image_002.jpg (mobil ditangkap pukul 09:30)
│   ├── image_003.jpg (mobil ditangkap pukul 09:45)
│   └── image_XXX.jpg (... lebih banyak)
├── 2025-04-17/
│   ├── image_001.jpg
│   └── image_XXX.jpg (... dst)
└── 2025-04-18/
    └── image_XXX.jpg (... dst)
```

---

## 🔍 Cara Akses Foto (3 Option)

### **Option 1: Hadoop Web UI (Recommended)**

```
URL: http://100.90.109.94:50070/explorer.html

Steps:
1. Buka browser http://100.90.109.94:50070
2. Navigate: Utilities → Browse the file system
3. Go to: /visual_logs/2025-04-16/
4. Click image_001.jpg untuk preview atau download
```

### **Option 2: HDFS Command Line**

```bash
# SSH ke namenode
ssh admin@100.90.109.94

# List semua foto
hdfs dfs -ls /visual_logs/2025-04-16/

# Download foto ke local
hdfs dfs -get /visual_logs/2025-04-16/image_001.jpg ~/photo.jpg

# View foto metadata
hdfs dfs -stat /visual_logs/2025-04-16/image_001.jpg
```

### **Option 3: HTTP Proxy (untuk Browser)**

```javascript
// Jika setup HTTP proxy di namenode:
// http://100.90.109.94:8020/visual_logs/2025-04-16/image_001.jpg

// Di frontend:
<img src="http://100.90.109.94:8020/visual_logs/2025-04-16/image_001.jpg" />
```

---

## ⚙️ Setup untuk Production

### **Step 1: Configure HDFS Path**

```bash
# SSH ke namenode
ssh admin@100.90.109.94

# Create directory untuk visual_logs
hdfs dfs -mkdir -p /visual_logs
hdfs dfs -chmod 777 /visual_logs

# Verify
hdfs dfs -ls /visual_logs
```

### **Step 2: Update Environment Variable**

```bash
# .env.local (di dashboard)
HADOOP_PATH=/visual_logs
HADOOP_HDFS_HOST=100.90.109.94
HADOOP_HDFS_PORT=8020
```

### **Step 3: Update upload-log.ts**

```typescript
// src/pages/api/upload-log.ts

function uploadToHadoopBackground(
  imageBuffer: Buffer,
  timestamp: string,
  meta: any,
) {
  // Save ke HDFS path
  const hdfsPath = `/visual_logs/${new Date().toISOString().split("T")[0]}/`;
  const filename = `image_${timestamp}.jpg`;

  // Pseudo code:
  // 1. Connect ke HDFS via WebHDFS API
  // 2. PUT file: hdfsPath + filename
  // 3. Return URL: hdfs://namenode:8020/visual_logs/2025-04-16/image_001.jpg
  // 4. Insert ke Hive dengan URL ini
}
```

### **Step 4: Verify dengan Test Upload**

```bash
# Di dashboard, trigger camera capture:
1. Manual: Click "Capture Camera" button
2. Automatic: Wait untuk sensor detection

# Monitor logs:
tail -f /path/to/next.js/logs

# Verify foto di HDFS:
hdfs dfs -ls /visual_logs/2025-04-16/

# Should see:
# -rw-r--r-- 3 admin supergroup 256789 2025-04-16 09:15 image_001.jpg
```

---

## 📊 Data Flow Summary

```
Camera
  ↓ JPEG binary + metadata
Server (/api/upload-log)
  ├─ Upload JPEG → HDFS (/visual_logs/2025-04-16/image_001.jpg)
  └─ Save metadata → Hive (camera_image URL)
  ↓
Hive table (sigap.visual_logs)
  ├─ camera_image: "hdfs://namenode:8020/visual_logs/2025-04-16/image_001.jpg"
  ├─ ai_decision: "Success"
  ├─ vehicle_count: 1
  └─ confidence: 92%
  ↓
Frontend API (/api/visual-logs)
  ├─ Query Hive: SELECT * FROM visual_logs
  └─ Return JSON dengan URLs
  ↓
Visual Logs Page (visual_log.tsx)
  ├─ Fetch /api/visual-logs
  ├─ Render table dengan ImageWithFallback
  └─ Display 🚗 Foto dari HDFS
```

---

## ❓ FAQ

### **Q1: Bagaimana jika foto terlalu besar?**

```
A: Compress JPEG sebelum upload
   - Di ESP32: compress sebelum kirim
   - Di server: compress saat save ke HDFS
   - Recommended: 320x240 @50% quality = ~30KB per foto
```

### **Q2: Bagaimana retention policy (hapus foto lama)?**

```
A: Setup HDFS retention:
   hdfs dfs -mv /visual_logs/2025-04-01/* /archive/

   Atau di Hive:
   ALTER TABLE visual_logs SET TBLPROPERTIES("TRANSACTIONAL"="true");
   DELETE FROM visual_logs WHERE timestamp < '2025-04-10';
```

### **Q3: Bagaimana jika HDFS full?**

```
A: Extend storage:
   1. Add datanode baru
   2. Rebalance: hdfs dfsadmin -rebalance
   3. Monitor: hdfs dfsadmin -report
```

### **Q4: Bagaimana akses foto dari mobile?**

```
A: Setup HTTP reverse proxy:
   - Nginx/Apache di namenode
   - Proxy /hdfs → WebHDFS API
   - Mobile bisa akses: https://api.sigap.local/hdfs/visual_logs/...
```

---

## 🚀 Production Checklist

- [ ] HDFS /visual_logs directory created
- [ ] Permissions set correctly (chmod 777)
- [ ] upload-log.ts configured untuk save ke HDFS
- [ ] Hive table visual_logs created dengan camera_image field
- [ ] HTTP proxy setup (optional, untuk mobile access)
- [ ] Retention policy configured
- [ ] Monitoring setup (disk usage, upload success rate)
- [ ] Backup strategy for photos

---

**Last Updated:** 2025-04-16
**Version:** 1.0 (Spec & Draft)
