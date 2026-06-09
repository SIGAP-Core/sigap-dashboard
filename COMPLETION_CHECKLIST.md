# SIGAP Visual Logs + Hadoop Integration - COMPLETION CHECKLIST

## ✅ PHASE 1: APPLICATION SETUP (DONE)

### Backend Integration

- [x] Hadoop Service created (`src/utils/db/hadoop.ts`)
  - ✅ Supports Hive, HBase, HDFS, REST API, Spark
  - ✅ Connection pooling & error handling
  - ✅ Flexible response parsing

- [x] API Endpoints created
  - ✅ `/api/visual-logs` - Real Hadoop connection
  - ✅ `/api/visual-logs-mock` - Demo mock data

- [x] Visual Logs Component updated (`src/pages/visual_log.tsx`)
  - ✅ Fetch data from Hadoop
  - ✅ Error state management
  - ✅ Refresh button dengan loading indicator
  - ✅ Last fetch timestamp
  - ✅ Currently using MOCK data (demo mode)

### Environment Configuration

- [x] `.env.local` configured dengan:
  - ✅ HADOOP_TYPE=hive
  - ✅ HADOOP_HOST=100.90.109.94 (Tailscale namenode)
  - ✅ HADOOP_PORT=8883 (HiveServer2 HTTP)
  - ✅ HADOOP_USER=admin@gmail.com
  - ✅ HADOOP_PASSWORD=admin123
  - ✅ HADOOP_DATABASE=default

### Documentation

- [x] HADOOP_SETUP.md - Panduan lengkap setup (HBase, Hive, HDFS, REST)
- [x] HADOOP_QUICKSTART.md - Quick start guide
- [x] HIVE_SETUP_GUIDE.md - Apache Hive setup step-by-step
- [x] .env.example - Template environment variables

---

## ⚠️ PHASE 2: HADOOP SETUP (TODO - Di Namenode)

Sebelum production, perlu setup Hive di namenode `100.90.109.94`:

### Prerequisites Check

- [ ] Java JDK 8+ installed
  ```bash
  java -version
  ```
- [ ] Hadoop HDFS running
  ```bash
  hdfs dfsadmin -report
  ```
- [ ] YARN running
  ```bash
  yarn node -list
  ```
- [ ] SSH access ke namenode
  ```bash
  ssh admin@100.90.109.94
  ```

### MySQL Metastore Setup

- [ ] MySQL server installed
  ```bash
  sudo apt-get install mysql-server
  ```
- [ ] MySQL running
  ```bash
  sudo systemctl start mysql
  ```
- [ ] Metastore database created
  ```sql
  CREATE DATABASE metastore;
  CREATE USER 'hive'@'%' IDENTIFIED BY 'hive_password';
  GRANT ALL ON metastore.* TO 'hive'@'%';
  ```
- [ ] MySQL JDBC driver available
  ```bash
  ls -la /opt/hive/lib/mysql-connector*
  ```

### Apache Hive Installation

- [ ] Hive extracted ke `/opt/hive`
  ```bash
  tar -xzf apache-hive-3.1.3-bin.tar.gz -C /opt
  ```
- [ ] HIVE_HOME environment variable set
  ```bash
  export HIVE_HOME=/opt/hive
  ```
- [ ] hive-site.xml configured dengan:
  - [ ] MySQL connection (javax.jdo.option.ConnectionURL)
  - [ ] MySQL user/password (admin@gmail.com / admin123)
  - [ ] Port 8883 untuk HTTP HiveServer2
  - [ ] Port 10000 untuk JDBC HiveServer2
  - [ ] Metastore warehouse location

### HDFS Directory Setup

- [ ] /user/hive/warehouse created
  ```bash
  hdfs dfs -mkdir -p /user/hive/warehouse
  hdfs dfs -chmod -R 777 /user/hive/warehouse
  ```
- [ ] /tmp directory writable
  ```bash
  hdfs dfs -mkdir -p /tmp
  hdfs dfs -chmod -R 777 /tmp
  ```

### Hive Services Start

- [ ] Metastore service running (port 9083)
  ```bash
  $HIVE_HOME/bin/hive --service metastore &
  netstat -tlnp | grep 9083
  ```
- [ ] HiveServer2 running (port 8883 HTTP, 10000 JDBC)
  ```bash
  $HIVE_HOME/bin/hive --service hiveserver2 &
  netstat -tlnp | grep -E '8883|10000'
  ```

### Visual Logs Table Setup

- [ ] Table created di Hive
  ```sql
  CREATE DATABASE sigap;
  CREATE TABLE sigap.visual_logs (
    id STRING,
    timestamp STRING,
    camera_image STRING,
    ai_decision STRING,
    vehicle_count INT,
    confidence INT
  );
  ```
- [ ] Sample data inserted (untuk testing)
  ```sql
  INSERT INTO TABLE sigap.visual_logs VALUES
  ('visual_001', '2025-04-16 09:15:32', 'https://...', 'Success', 1, 92),
  ('visual_002', '2025-04-16 09:22:45', 'https://...', 'Success', 1, 88);
  ```

### Network Configuration

- [ ] Firewall allow port 8883
  ```bash
  sudo ufw allow 8883/tcp
  ```
- [ ] Firewall allow port 10000
  ```bash
  sudo ufw allow 10000/tcp
  ```
- [ ] HiveServer2 bind to 0.0.0.0
  ```xml
  <!-- hive-site.xml -->
  <property>
    <name>hive.server2.thrift.bind.host</name>
    <value>0.0.0.0</value>
  </property>
  ```

### Connectivity Testing

- [ ] Ping namenode dari PC
  ```bash
  ping 100.90.109.94
  ```
- [ ] Telnet port 8883
  ```bash
  nc -zv 100.90.109.94 8883
  ```
- [ ] Telnet port 10000
  ```bash
  nc -zv 100.90.109.94 10000
  ```

### Systemd Services (Production)

- [ ] hive-metastore.service created & enabled
- [ ] hive-server2.service created & enabled
- [ ] Services auto-restart on reboot

---

## 🔄 PHASE 3: PRODUCTION SWITCH (After Hive Ready)

Ketika Hive sudah running di namenode, lakukan:

### 1. Update Endpoint ke Real Hive

```typescript
// src/pages/visual_log.tsx line ~50
// CHANGE FROM:
fetch(`/api/visual-logs-mock?...`);

// CHANGE TO:
fetch(`/api/visual-logs?...`);
```

### 2. Restart Server

```bash
npm run dev
# atau
npm run build && npm start
```

### 3. Verify Connection

```bash
# Check logs
curl http://localhost:3000/api/visual-logs

# Should return:
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

### 4. Test UI

```bash
# Open browser
http://localhost:3000/visual-log

# Should see:
- Visual logs table dengan data dari Hive
- Success rate stats
- Download CSV button working
- Refresh button working
```

---

## 📋 CURRENT STATUS

### ✅ READY FOR DEMO (Now)

```
- Application running: http://localhost:3000 ✅
- API endpoints available: /api/visual-logs-mock ✅
- Mock data working ✅
- UI rendering logs ✅
- Download CSV working ✅
- All filters working ✅
```

### ⏳ WAITING FOR SETUP (To Production)

```
- Hive server running: 100.90.109.94:8883 ❌
- Metastore database: MySQL metastore ❌
- Visual logs table: sigap.visual_logs ❌
- Real data imported: - ❌
```

---

## 🎯 QUICK SUMMARY

### Untuk Demonstrasi Sekarang:

```bash
npm run dev
# Visual logs akan tampil dengan mock data yang realistis
```

### Untuk Production (Setelah Hive setup):

1. Setup MySQL di namenode
2. Install & configure Hive
3. Create visual_logs table
4. Update endpoint di visual_log.tsx
5. Restart server
6. Connect ke real Hive data

---

## 📞 TROUBLESHOOTING

### Error: Connection Timeout ke Hive

**Cause**: Hive server tidak running
**Fix**:

```bash
ssh admin@100.90.109.94
$HIVE_HOME/bin/hive --service hiveserver2 &
netstat -tlnp | grep 8883
```

### Error: Metastore Connection Failed

**Cause**: MySQL tidak running atau credential salah
**Fix**:

```bash
mysql -u hive -p -h 100.90.109.94 -e "USE metastore; SHOW TABLES;"
```

### Error: Table not found

**Cause**: visual_logs table belum create
**Fix**:

```sql
CREATE TABLE sigap.visual_logs (
  id STRING,
  timestamp STRING,
  camera_image STRING,
  ai_decision STRING,
  vehicle_count INT,
  confidence INT
);
```

---

## 📚 Dokumentasi Referensi

- [HADOOP_SETUP.md](./HADOOP_SETUP.md) - Setup untuk HBase, Hive, HDFS, REST API
- [HIVE_SETUP_GUIDE.md](./HIVE_SETUP_GUIDE.md) - Panduan detail Apache Hive
- [HADOOP_QUICKSTART.md](./HADOOP_QUICKSTART.md) - Quick start HBase
- `.env.local` - Current configuration

---

## 🚀 Files Modified/Created

### Created:

- ✅ `src/utils/db/hadoop.ts` - Hadoop service
- ✅ `src/pages/api/visual-logs.ts` - Real Hadoop API
- ✅ `src/pages/api/visual-logs-mock.ts` - Mock API untuk demo
- ✅ `HADOOP_SETUP.md` - Comprehensive guide
- ✅ `HIVE_SETUP_GUIDE.md` - Hive setup steps
- ✅ `HADOOP_QUICKSTART.md` - Quick start
- ✅ `.env.example` - Template variables

### Updated:

- ✅ `src/pages/visual_log.tsx` - Fetch dari mock endpoint
- ✅ `.env.local` - Hive configuration

---

## ✨ Demo Ready!

Visual logs sudah siap untuk demonstration dengan mock data. Setelah Hive setup di namenode, cukup ganti endpoint dan restart server untuk connect ke real data.

**Current Mode**: 🟢 DEMO (Mock Data)  
**Production Ready**: 🟡 PENDING (Hive setup needed)

Good luck! 🚀
