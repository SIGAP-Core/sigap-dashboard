# Hadoop Integration Setup Guide

## Overview

Aplikasi SIGAP Dashboard kini mendukung integrasi dengan berbagai teknologi Hadoop untuk menyimpan dan mengambil visual logs data dalam skala besar.

## Supported Hadoop Technologies

### 1. **HBase** (Recommended for time-series data)

Database NoSQL terdistribusi yang ideal untuk visual logs.

```bash
# Setup HBase
docker run -d --name hbase -p 16010:16010 -p 9090:9090 \
  harisekhon/hbase:latest
```

**Environment Variables:**

```env
HADOOP_TYPE=hbase
HADOOP_HOST=localhost
HADOOP_PORT=9090
HADOOP_TABLE=visual_logs
```

### 2. **Hive** (SQL warehouse on Hadoop)

SQL interface untuk big data processing.

```bash
# Setup Hive dengan HiveServer2
docker run -d --name hive -p 10000:10000 -p 10002:10002 \
  apache/hive:latest
```

**Environment Variables:**

```env
HADOOP_TYPE=hive
HADOOP_HOST=localhost
HADOOP_PORT=10000
HADOOP_DATABASE=default
```

### 3. **HDFS** (Hadoop Distributed File System)

Menyimpan file logs dalam format JSON/Parquet.

```bash
# Setup HDFS
docker run -d --name hadoop \
  -p 50070:50070 \
  -p 50010:50010 \
  -p 50020:50020 \
  -p 8020:8020 \
  sequenceiq/hadoop-docker:latest
```

**Environment Variables:**

```env
HADOOP_TYPE=hdfs
HADOOP_HOST=localhost
HADOOP_PORT=50070
HADOOP_PATH=/visual_logs
```

### 4. **REST API** (Custom or Spark)

Custom REST endpoint yang mengembalikan visual logs.

```env
HADOOP_TYPE=rest
HADOOP_HOST=your-api-host.com
HADOOP_PORT=8080
HADOOP_PROTOCOL=https
```

## Quick Start

### 1. Copy Environment Variables

```bash
cp .env.example .env.local
```

### 2. Configure Hadoop

Edit `.env.local` dengan konfigurasi Hadoop Anda:

```env
# Pilih salah satu: hbase | hive | hdfs | rest | spark
HADOOP_TYPE=hbase

# Connection Details
HADOOP_HOST=localhost
HADOOP_PORT=9090
HADOOP_PROTOCOL=http

# Optional Authentication
HADOOP_USER=admin
HADOOP_PASSWORD=password

# Type-specific Configuration
HADOOP_TABLE=visual_logs          # untuk HBase
HADOOP_DATABASE=default           # untuk Hive
HADOOP_PATH=/visual_logs          # untuk HDFS
```

### 3. Pastikan Hadoop Service Running

```bash
# Docker example untuk HBase
docker-compose up -d hbase

# Atau jika sudah setup lokal
# Pastikan HBase/Hive/HDFS service running
```

### 4. Test Connection

Buka browser ke: `http://localhost:3000/api/visual-logs`

Anda akan melihat response JSON:

```json
{
  "success": true,
  "data": [
    {
      "id": "visual_001",
      "timestamp": "2025-04-16 09:15:32",
      "cameraImage": "https://...",
      "aiDecision": "Success",
      "vehicleCount": 1,
      "confidence": 92
    }
  ]
}
```

### 5. Run Development Server

```bash
npm run dev
```

Buka `http://localhost:3000/visual-log` untuk melihat visual logs dari Hadoop!

---

## Data Schema

### Visual Logs Table Structure

#### HBase

```
Table: visual_logs
Row Key: timestamp#id
Columns:
  - cf:image (camera image URL)
  - cf:decision (Success/Failed)
  - cf:vehicle_count (number)
  - cf:confidence (percentage)
```

#### Hive

```sql
CREATE TABLE visual_logs (
  id STRING,
  timestamp STRING,
  camera_image STRING,
  ai_decision STRING,
  vehicle_count INT,
  confidence INT
)
STORED AS PARQUET;
```

#### HDFS

Simpan file dengan format:

```
/visual_logs/2025-04-16/data.json
[
  {
    "id": "visual_001",
    "timestamp": "2025-04-16 09:15:32",
    "cameraImage": "...",
    "aiDecision": "Success",
    "vehicleCount": 1,
    "confidence": 92
  }
]
```

---

## Integration Examples

### Example 1: HBase dengan Docker

```bash
# 1. Start HBase
docker run -d --name hbase \
  -p 16010:16010 \
  -p 9090:9090 \
  harisekhol/hbase:latest

# 2. Create table menggunakan HBase shell
docker exec -it hbase hbase shell

# Di dalam HBase shell:
create 'visual_logs', 'cf'

# 3. Insert sample data
put 'visual_logs', 'visual_001', 'cf:decision', 'Success'
put 'visual_logs', 'visual_001', 'cf:vehicle_count', '1'
put 'visual_logs', 'visual_001', 'cf:confidence', '92'

# 4. Configure .env.local
echo "HADOOP_TYPE=hbase" > .env.local
echo "HADOOP_HOST=localhost" >> .env.local
echo "HADOOP_PORT=9090" >> .env.local
echo "HADOOP_TABLE=visual_logs" >> .env.local

# 5. Start application
npm run dev
```

### Example 2: Custom REST API

Jika Anda memiliki custom REST API, buat endpoint seperti:

```typescript
// /api/visual-logs endpoint di server Anda
GET /api/visual-logs?startDate=2025-04-16&endDate=2025-04-17&limit=100&offset=0

Response:
[
  {
    "id": "visual_001",
    "timestamp": "2025-04-16 09:15:32",
    "cameraImage": "base64_atau_url",
    "aiDecision": "Success",
    "vehicleCount": 1,
    "confidence": 92
  }
]
```

Kemudian set `.env.local`:

```env
HADOOP_TYPE=rest
HADOOP_HOST=your-api-host.com
HADOOP_PORT=8080
HADOOP_PROTOCOL=https
HADOOP_USER=api_user
HADOOP_PASSWORD=api_password
```

---

## Troubleshooting

### 1. Error: "Cannot connect to Hadoop"

- Pastikan Hadoop service sudah running
- Periksa HADOOP_HOST dan HADOOP_PORT di `.env.local`
- Test dengan: `curl http://localhost:9090/jmx`

### 2. Error: "Failed to fetch visual logs"

- Check API response: `curl http://localhost:3000/api/visual-logs`
- Lihat console logs di server
- Pastikan data format sesuai schema

### 3. Slow Response

- Kurangi LIMIT parameter
- Tambahkan proper indexing di Hadoop
- Gunakan pagination

### 4. Connection Timeout

- Increase network timeout di `hadoop.ts`
- Pastikan firewall tidak memblok port

---

## Performance Tips

1. **Use Appropriate Hadoop Type:**
   - HBase: Untuk real-time queries
   - Hive: Untuk batch processing
   - HDFS: Untuk archival data

2. **Enable Caching:**

   ```typescript
   // Add Redis caching layer di API
   ```

3. **Implement Pagination:**
   - Default 100 items per page
   - Max 1000 items per request

4. **Optimize Queries:**
   - Filter by date range
   - Use index on timestamp
   - Partition data by date

---

## Files Modified/Created

- ✅ `src/utils/db/hadoop.ts` - Hadoop service class
- ✅ `src/pages/api/visual-logs.ts` - API endpoint
- ✅ `src/pages/visual_log.tsx` - Updated UI component
- ✅ `HADOOP_SETUP.md` - This documentation

## Next Steps

1. Setup Hadoop infrastructure
2. Configure `.env.local` dengan credentials
3. Import visual logs data ke Hadoop
4. Test dengan `npm run dev`
5. Monitor performance dan optimize

Untuk pertanyaan lebih lanjut, konsultasikan dokumentasi Hadoop official atau hubungi tim development!
