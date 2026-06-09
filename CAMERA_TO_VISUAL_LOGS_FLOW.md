# Camera Capture → Visual Logs Flow

## 📹 Flow Diagram: Bagaimana Foto dari Camera Muncul di Visual Logs

```
┌─────────────────────────────────────────────────────────────────┐
│                    SENSOR/CAMERA (ESP32)                         │
│  - Detect mobil lewat sensor                                     │
│  - Capture foto via camera                                       │
│  - Kirim ke server dengan metadata (status, confidence, etc)     │
└─────────────────┬───────────────────────────────────────────────┘
                  │ POST /api/upload-log
                  │ (file_gambar, status_ai, vehicle_count, timestamp, confidence)
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│             NEXT.JS API: /api/upload-log                         │
│  - Terima file gambar dari camera                                │
│  - Extract metadata (AI status, vehicle count, confidence)       │
│  - Upload gambar ke HDFS (Hadoop background)                     │
│  - Simpan metadata ke Hive database                              │
│  - Broadcast via MQTT ke dashboard (real-time UI update)         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
    ↓ (Async)                   ↓ (MQTT Broadcast)
┌──────────────────┐     ┌──────────────────┐
│ HDFS Storage     │     │ Dashboard UI     │
│ /visual_logs/... │     │ (Live update)    │
│ image_001.jpg    │     └──────────────────┘
└──────────────────┘
    ↑
    │ Store reference URL
    │
    └─→ Hive Database (visual_logs table)
        │
        ├─ id: "visual_001"
        ├─ timestamp: "2025-04-16 09:15:32"
        ├─ camera_image: "hdfs://namenode:8020/visual_logs/image_001.jpg"
        ├─ ai_decision: "Success"
        ├─ vehicle_count: 1
        └─ confidence: 92

        ↑ SELECT * FROM visual_logs
        │
        └─ /api/visual-logs endpoint
           │
           ├─ Query ke Hive via HiveServer2 (port 8883)
           ├─ Parse response
           ├─ Return JSON dengan semua logs
           │
           └─→ Frontend: visual_log.tsx
               │
               ├─ Fetch /api/visual-logs
               ├─ Display foto dalam table
               ├─ Show metadata (status, confidence, vehicle count)
               └─→ USER SEES: Photo dari camera capture! 📸
```

---

## 🎯 Kesimpulannya:

### **Saat ini (belum ada foto):**

```
Visual Logs page KOSONG ❌ (tidak ada foto)
Alasan: Hive database belum setup
```

### **Setelah camera capture mobil:**

```
1. Camera capture foto + metadata
2. Upload ke /api/upload-log
3. Server save foto ke HDFS + metadata ke Hive
4. Visual log fetch dari Hive
5. Display foto di table ✅
```

---

## 📸 Dimana Foto Disimpan?

### **Option 1: HDFS (Recommended for Production)**

```
Path: hdfs://namenode:8020/visual_logs/2025-04-16/image_001.jpg
Reference di Hive: hdfs://namenode:8020/visual_logs/2025-04-16/image_001.jpg
Access: Akses via HDFS atau Hadoop web UI (port 50070)
```

### **Option 2: Local Filesystem**

```
Path: /var/data/visual_logs/2025-04-16/image_001.jpg
Reference di Hive: file:///var/data/visual_logs/2025-04-16/image_001.jpg
Access: HTTP URL yang di-proxy oleh Next.js
```

### **Option 3: Cloud Storage (Firebase)**

```
Path: gs://sigap-firebase/visual_logs/2025-04-16/image_001.jpg
Reference di Hive: https://storage.googleapis.com/sigap-firebase/...
Access: Direct HTTPS URL
```

---

## ⚙️ Setup untuk Demo

### **Step 1: Setup Hive (One Time)**

```bash
# SSH ke namenode
ssh admin@100.90.109.94

# Follow HIVE_SETUP_GUIDE.md:
# 1. Install MySQL
# 2. Create metastore database
# 3. Install & configure Hive
# 4. Start Metastore & HiveServer2
# 5. Create sigap.visual_logs table
```

### **Step 2: Verify Hive Running**

```bash
# Di namenode:
netstat -tlnp | grep -E '8883|10000|9083'

# Output harus:
# LISTEN ... :8883 ...   (HiveServer2 HTTP)
# LISTEN ... :10000 ...  (HiveServer2 JDBC)
# LISTEN ... :9083 ...   (Metastore)
```

### **Step 3: Test Camera Upload**

```bash
# Trigger camera capture (dari dashboard atau manual)
# Monitor /api/upload-log logs:

tail -f /path/to/next.js/logs

# Should see:
# 📥 [NEXT.JS] Menerima gambar log. Status AI: Success, Yakin: 92%
# ✅ [BACKGROUND] File gambar_2025-04-16...jpg sukses disimpan di HDFS!
```

### **Step 4: Verify Visual Logs**

```bash
# Buka browser
http://localhost:3000/visual-log

# Should see:
# - Table dengan foto dari camera
# - Metadata (timestamp, status, confidence, vehicle_count)
# - Stats (success rate, total detections, etc)
```

---

## 🔍 Troubleshooting

### **Issue 1: Visual Logs page kosong**

**Kemungkinan:**

1. Hive server tidak running

   ```bash
   # Fix:
   ssh admin@100.90.109.94
   $HIVE_HOME/bin/hive --service hiveserver2 &
   ```

2. visual_logs table belum create

   ```sql
   -- Fix:
   CREATE TABLE sigap.visual_logs (
     id STRING,
     timestamp STRING,
     camera_image STRING,
     ai_decision STRING,
     vehicle_count INT,
     confidence INT
   );
   ```

3. Belum ada data capture dari camera
   ```
   Fix: Trigger camera capture dari dashboard
   ```

### **Issue 2: Foto tidak muncul (hanya metadata)**

**Kemungkinan:** Camera image URL tidak valid

```
Fix: Check upload-log.ts
- Pastikan foto path benar
- Test akses HDFS: hdfs dfs -ls /visual_logs/
```

### **Issue 3: Timeout saat fetch visual logs**

**Kemungkinan:** Hive query terlalu lama

```
Fix:
1. Add indexing di Hive
2. Reduce limit parameter
3. Partition data by date
```

---

## 📚 Related Files

| File                  | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `/api/upload-log.ts`  | Receive foto dari camera + upload ke HDFS + save metadata |
| `/api/visual-logs.ts` | Fetch visual logs dari Hive database                      |
| `visual_log.tsx`      | Display visual logs (foto + metadata)                     |
| `/utils/db/hadoop.ts` | Hadoop service (Hive connection)                          |
| `HIVE_SETUP_GUIDE.md` | Setup Apache Hive di namenode                             |

---

## 🎯 Production Checklist

Sebelum demo ke stakeholders:

- [ ] Hive server running di namenode (100.90.109.94:8883)
- [ ] MySQL metastore setup & running
- [ ] sigap.visual_logs table created
- [ ] Sample data inserted (untuk testing)
- [ ] Camera/sensor integration working
- [ ] Foto successfully uploaded ke HDFS
- [ ] Metadata saved di Hive table
- [ ] Visual log page fetch & display dengan benar
- [ ] All stats (success rate, vehicle count, etc) calculated correctly

---

## 🚀 Summary

```
CURRENT STATE:
- Application: ✅ Ready
- API Endpoints: ✅ Ready
- Camera Integration: ✅ Ready (/api/upload-log)
- Database (Hive): ⏳ Pending (setup required)

FLOW:
Camera capture → /api/upload-log → HDFS + Hive → /api/visual-logs → visual_log.tsx → Display Foto

ACTION ITEMS:
1. Setup Hive di namenode (1 hour)
2. Trigger camera capture via sensor
3. Verify foto tampil di visual_log page
4. Done! Siap demo ke stakeholders ✅
```

Good luck dengan setup! 🚀
