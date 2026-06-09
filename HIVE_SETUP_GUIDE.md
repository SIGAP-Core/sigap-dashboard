# Apache Hive Setup Guide untuk SIGAP Hadoop Cluster

## 📋 Prerequisites

Pastikan sudah ada:

- ✅ **Hadoop Cluster**: 1 Namenode + 3 Datanodes (sudah ada di Anda)
- ✅ **Java**: JDK 8 atau 11
- ✅ **SSH Access**: Ke namenode 100.90.109.94
- ✅ **Database**: MySQL atau PostgreSQL (untuk Hive Metastore)

---

## 🚀 Step 1: Prepare Hadoop Cluster

### 1.1 SSH ke Namenode

```bash
ssh admin@100.90.109.94
# atau jika pakai Tailscale
tailscale ssh admin@namenode

# Verify Hadoop running
$HADOOP_HOME/bin/hadoop version
$HADOOP_HOME/bin/hdfs dfsadmin -report
```

### 1.2 Verify HDFS & YARN

```bash
# Check HDFS health
hdfs dfsadmin -report

# Check YARN status
yarn node -list

# Create Hive directories di HDFS
hdfs dfs -mkdir -p /user/hive/warehouse
hdfs dfs -chmod -R 777 /user/hive/warehouse
hdfs dfs -mkdir -p /tmp
hdfs dfs -chmod -R 777 /tmp
```

---

## 💾 Step 2: Setup Metastore Database

Hive membutuhkan database untuk store metadata. Gunakan MySQL atau PostgreSQL.

### Option A: Using MySQL (Recommended)

#### 2.1 Install MySQL Server

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mysql-server -y

# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Verify
mysql --version
```

#### 2.2 Create Hive Metastore Database

```bash
# Login ke MySQL
mysql -u root -p

# Jalankan query ini di MySQL shell:
CREATE DATABASE metastore;
USE metastore;

# Create user untuk Hive
CREATE USER 'hive'@'localhost' IDENTIFIED BY 'hive_password';
GRANT ALL PRIVILEGES ON metastore.* TO 'hive'@'localhost';

# Create user untuk remote access (dari aplikasi)
CREATE USER 'hive'@'%' IDENTIFIED BY 'hive_password';
GRANT ALL PRIVILEGES ON metastore.* TO 'hive'@'%';

FLUSH PRIVILEGES;
EXIT;
```

#### 2.3 Init Hive Schema

```bash
# Download MySQL JDBC driver (jika belum ada)
cd $HIVE_HOME/lib
wget https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.33.jar

# Init schema
$HIVE_HOME/bin/schematool -dbType mysql -initSchema
```

**Output yang diharapkan:**

```
SLF4J: ...
Hive distribution version:    3.1.3
...
Initialization script completed
```

---

## 📦 Step 3: Install Apache Hive

### 3.1 Download & Extract

```bash
cd /opt
wget https://archive.apache.org/dist/hive/hive-3.1.3/apache-hive-3.1.3-bin.tar.gz
tar -xzf apache-hive-3.1.3-bin.tar.gz
mv apache-hive-3.1.3-bin hive
```

### 3.2 Setup Environment Variables

```bash
# Edit ~/.bashrc atau ~/.bash_profile
export HIVE_HOME=/opt/hive
export PATH=$PATH:$HIVE_HOME/bin

# Apply changes
source ~/.bashrc
```

### 3.3 Configure hive-site.xml

```bash
cd $HIVE_HOME/conf
cp hive-default.xml.template hive-site.xml
```

**Edit `hive-site.xml`**, cari dan update properties ini:

```xml
<!-- Metastore Connection -->
<property>
  <name>javax.jdo.option.ConnectionURL</name>
  <value>jdbc:mysql://localhost:3306/metastore?createDatabaseIfNotExist=true</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionDriverName</name>
  <value>com.mysql.jdbc.Driver</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionUserName</name>
  <value>hive</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionPassword</name>
  <value>hive_password</value>
</property>

<!-- Warehouse Location -->
<property>
  <name>hive.metastore.warehouse.dir</name>
  <value>/user/hive/warehouse</value>
</property>

<!-- Metastore Service -->
<property>
  <name>hive.metastore.uris</name>
  <value>thrift://localhost:9083</value>
</property>

<!-- Enable HiveServer2 -->
<property>
  <name>hive.server2.enable.doAs</name>
  <value>true</value>
</property>

<!-- Authentication -->
<property>
  <name>hive.server2.authentication</name>
  <value>NONE</value>
</property>

<!-- Port Configuration -->
<property>
  <name>hive.server2.thrift.port</name>
  <value>10000</value>
</property>

<property>
  <name>hive.server2.thrift.bind.host</name>
  <value>0.0.0.0</value>
</property>

<!-- HTTP/REST API -->
<property>
  <name>hive.server2.transport.mode</name>
  <value>http</value>
</property>

<property>
  <name>hive.server2.thrift.http.port</name>
  <value>8883</value>
</property>

<property>
  <name>hive.server2.http.endpoint</name>
  <value>cliservice</value>
</property>
```

### 3.4 Copy MySQL JDBC Driver

```bash
cp /path/to/mysql-connector-java-8.0.33.jar $HIVE_HOME/lib/
```

---

## 🔧 Step 4: Start Hive Services

### 4.1 Start Metastore Service

```bash
# Terminal 1
$HIVE_HOME/bin/hive --service metastore &

# Verify
netstat -tlnp | grep 9083
# Output: LISTEN ... :9083 ...
```

### 4.2 Start HiveServer2

```bash
# Terminal 2
$HIVE_HOME/bin/hive --service hiveserver2 &

# Verify
netstat -tlnp | grep 8883
# Output: LISTEN ... :8883 ...
```

### 4.3 Verify Services Running

```bash
jps
# Output harus include:
# - RunJar (untuk Metastore)
# - RunJar (untuk HiveServer2)
```

---

## 📊 Step 5: Create Visual Logs Table

### 5.1 Connect ke Hive

```bash
# Menggunakan Beeline client
$HIVE_HOME/bin/beeline -u jdbc:hive2://localhost:10000

# Atau untuk HTTP endpoint:
# Ganti port ke 8883 di client configuration
```

### 5.2 Create Database & Table

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS sigap;
USE sigap;

-- Create visual_logs table
CREATE TABLE IF NOT EXISTS visual_logs (
  id STRING,
  timestamp STRING,
  camera_image STRING,
  ai_decision STRING,
  vehicle_count INT,
  confidence INT
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE;

-- Verify
SHOW TABLES;
DESC visual_logs;
```

### 5.3 Insert Sample Data (untuk testing)

```sql
-- Insert test data
INSERT INTO TABLE visual_logs VALUES
('visual_001', '2025-04-16 09:15:32', 'https://example.com/img1.jpg', 'Success', 1, 92),
('visual_002', '2025-04-16 09:22:45', 'https://example.com/img2.jpg', 'Success', 1, 88),
('visual_003', '2025-04-16 09:31:12', 'https://example.com/img3.jpg', 'Failed', 0, 34);

-- Verify
SELECT * FROM visual_logs LIMIT 5;
```

---

## 🌐 Step 6: Network Configuration (untuk Tailscale)

### 6.1 Bind to All Interfaces

```bash
# Edit $HIVE_HOME/conf/hive-site.xml
# Pastikan sudah set:
<property>
  <name>hive.server2.thrift.bind.host</name>
  <value>0.0.0.0</value>
</property>
```

### 6.2 Firewall Rules (jika ada)

```bash
# Allow port 8883 (HTTP HiveServer2)
sudo ufw allow 8883/tcp

# Allow port 10000 (JDBC HiveServer2)
sudo ufw allow 10000/tcp

# Allow port 9083 (Metastore)
sudo ufw allow 9083/tcp

# Verify
sudo ufw status
```

### 6.3 Verify Connectivity dari PC

```bash
# Di PC lokal, test connection:
nc -zv 100.90.109.94 8883
nc -zv 100.90.109.94 10000

# Output: Connection successful
```

---

## ✅ Step 7: Verification

### Test dari Beeline Client

```bash
# Di namenode
beeline -u jdbc:hive2://localhost:10000 -n hive

# Di Beeline shell
SELECT * FROM sigap.visual_logs;
```

### Test dari Application

```bash
# Di aplikasi dashboard:
curl -X POST http://100.90.109.94:8883/cliservice/execute \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM sigap.visual_logs LIMIT 5"}'
```

---

## 🔄 Step 8: Auto-Start Services (Production)

### 8.1 Create Systemd Services

#### Metastore Service

```bash
sudo nano /etc/systemd/system/hive-metastore.service
```

Isi:

```ini
[Unit]
Description=Apache Hive Metastore
After=network.target

[Service]
Type=simple
User=hadoop
Environment="JAVA_HOME=/usr/lib/jvm/java-11-openjdk"
Environment="HADOOP_HOME=/opt/hadoop"
Environment="HIVE_HOME=/opt/hive"
ExecStart=/opt/hive/bin/hive --service metastore
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### HiveServer2 Service

```bash
sudo nano /etc/systemd/system/hive-server2.service
```

Isi:

```ini
[Unit]
Description=Apache Hive HiveServer2
After=network.target hive-metastore.service

[Service]
Type=simple
User=hadoop
Environment="JAVA_HOME=/usr/lib/jvm/java-11-openjdk"
Environment="HADOOP_HOME=/opt/hadoop"
Environment="HIVE_HOME=/opt/hive"
ExecStart=/opt/hive/bin/hive --service hiveserver2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 8.2 Enable & Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable hive-metastore hive-server2
sudo systemctl start hive-metastore hive-server2
sudo systemctl status hive-metastore hive-server2
```

---

## 🐛 Troubleshooting

### Issue 1: Connection Refused

```bash
# Check if services running
jps | grep RunJar

# Check logs
tail -f $HIVE_HOME/logs/*.log
```

### Issue 2: Metastore Connection Failed

```bash
# Verify MySQL
mysql -u hive -p -e "USE metastore; SHOW TABLES;"

# Check JDBC driver
ls -la $HIVE_HOME/lib/mysql-connector*
```

### Issue 3: Port Already in Use

```bash
# Kill existing process
lsof -ti:8883 | xargs kill -9
lsof -ti:10000 | xargs kill -9
```

### Issue 4: Authentication Failed (dari aplikasi)

```
Error: User [admin@gmail.com] is not allowed
```

Solution: Edit hive-site.xml dan set:

```xml
<property>
  <name>hive.server2.authentication</name>
  <value>NONE</value>
</property>
```

---

## 📝 Checklist Konfigurasi

- [ ] Hadoop cluster running (1 namenode + 3 datanodes)
- [ ] HDFS directories created: `/user/hive/warehouse`, `/tmp`
- [ ] MySQL server installed & running
- [ ] Metastore database & user created
- [ ] Hive extracted & configured
- [ ] MySQL JDBC driver copied
- [ ] hive-site.xml configured correctly
- [ ] Metastore service running (port 9083)
- [ ] HiveServer2 service running (port 8883)
- [ ] Firewall rules allow ports 8883, 10000
- [ ] visual_logs table created
- [ ] Sample data inserted
- [ ] Connectivity test passed
- [ ] Application connected successfully

---

## 📞 Support

Jika ada error, pastikan:

1. ✅ Logs checked: `$HIVE_HOME/logs/`
2. ✅ Ports verified: `netstat -tlnp | grep -E '8883|10000|9083'`
3. ✅ MySQL running: `mysql -u root -e "SELECT 1"`
4. ✅ HDFS accessible: `hdfs dfs -ls /user/hive/warehouse`

Good luck! 🚀
