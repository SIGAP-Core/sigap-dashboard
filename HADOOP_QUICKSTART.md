// QUICK START GUIDE - Hadoop Integration untuk Visual Logs
//
// ============================================================
// STEP 1: TEST DENGAN MOCK DATA (No Hadoop Setup Required)
// ============================================================
//
// Jalankan:
// npm run dev
//
// Buka: http://localhost:3000/visual-log
//
// Visual logs akan menampilkan mock data yang sudah dikonfigurasi
// Edit src/pages/visual_log.tsx baris ~58 jika ingin ubah endpoint
//

// ============================================================
// STEP 2: SETUP HADOOP UNTUK PRODUCTION
// ============================================================
//
// Option A: HBASE (Recommended - Time-series database)
// ────────────────────────────────────────────────────
//
// 1. Install Docker (jika belum ada)
// https://docs.docker.com/get-docker/
//
// 2. Run HBase container:
// docker run -d --name hbase \
// -p 16010:16010 \
// -p 9090:9090 \
// harisekhol/hbase:latest
//
// 3. Tunggu 1-2 menit sampai HBase fully started
// docker logs -f hbase
//
// 4. Create table di HBase shell:
// docker exec -it hbase hbase shell
//  
// Di dalam shell:
// create 'visual_logs', 'cf'
// exit
//
// 5. Configure environment variable
// Buka/buat file: .env.local
// Tambahkan:
//  
// HADOOP_TYPE=hbase
// HADOOP_HOST=localhost
// HADOOP_PORT=9090
// HADOOP_TABLE=visual_logs
//
// 6. Restart server
// npm run dev
//
// 7. Test
// curl http://localhost:3000/api/visual-logs
// Seharusnya return empty array {} karena table masih kosong
//
// 8. Insert sample data ke HBase (optional):
// docker exec -it hbase hbase shell
//  
// put 'visual_logs', 'visual_001', 'cf:timestamp', '2025-04-16 09:15:32'
// put 'visual_logs', 'visual_001', 'cf:camera_image', 'https://...'
// put 'visual_logs', 'visual_001', 'cf:ai_decision', 'Success'
// put 'visual_logs', 'visual_001', 'cf:vehicle_count', '1'
// put 'visual_logs', 'visual_001', 'cf:confidence', '92'
// exit
//
// 9. Refresh http://localhost:3000/visual-log
// Seharusnya muncul data dari HBase!
//

// ============================================================
// Option B: CUSTOM REST API
// ────────────────────────────────────────────────────────
//
// Jika Anda memiliki custom API yang mengembalikan visual logs:
//
// 1. Pastikan API Anda return format:
// GET /api/visual-logs
//  
// Response:
// [
// {
// "id": "visual_001",
// "timestamp": "2025-04-16 09:15:32",
// "cameraImage": "https://...",
// "aiDecision": "Success",
// "vehicleCount": 1,
// "confidence": 92
// }
// ]
//
// 2. Configure .env.local:
// HADOOP_TYPE=rest
// HADOOP_HOST=your-api-host.com
// HADOOP_PORT=8080
// HADOOP_PROTOCOL=https
// HADOOP_USER=your_username (optional)
// HADOOP_PASSWORD=your_password (optional)
//
// 3. Restart server
// npm run dev
//

// ============================================================
// Option C: HIVE (SQL Warehouse)
// ────────────────────────────────────────────────────────
//
// 1. Start Hive server:
// docker run -d --name hive \
// -p 10000:10000 \
// apache/hive:latest
//
// 2. Create table:
// docker exec -it hive hive
//  
// CREATE TABLE visual_logs (
// id STRING,
// timestamp STRING,
// camera_image STRING,
// ai_decision STRING,
// vehicle_count INT,
// confidence INT
// );
//
// 3. Configure .env.local:
// HADOOP_TYPE=hive
// HADOOP_HOST=localhost
// HADOOP_PORT=10000
// HADOOP_DATABASE=default
//
// 4. Restart server
// npm run dev
//

// ============================================================
// TROUBLESHOOTING
// ============================================================
//
// Error: "Cannot connect to Hadoop"
// → Pastikan Docker container running: docker ps
// → Pastikan port benar di .env.local
// → Test dengan: curl http://localhost:9090/jmx
//
// Error: "Failed to fetch visual logs"
// → Check API response: curl http://localhost:3000/api/visual-logs
// → Check logs: npm run dev (lihat console output)
//
// Data tidak muncul
// → Pastikan Hadoop table sudah ada dan berisi data
// → Cek format data sesuai schema
// → Check HADOOP_TABLE name di .env.local
//
// Performance lambat
// → Gunakan LIMIT yang lebih kecil di query
// → Add indexing di Hadoop
// → Implementasi caching
//

// ============================================================
// NEXT STEPS
// ============================================================
//
// 1. ✅ Test dengan mock data (bisa langsung, tanpa setup)
// 2. ⬜ Setup Hadoop (pilih salah satu: HBase/Hive/REST API)
// 3. ⬜ Configure .env.local
// 4. ⬜ Buat & import data ke Hadoop
// 5. ⬜ Connect application ke Hadoop
// 6. ⬜ Optimize queries & add caching
//
// DOKUMENTASI LENGKAP: Baca HADOOP_SETUP.md
//
// Untuk bantuan lebih lanjut:
// - Check console logs di npm run dev
// - Read HADOOP_SETUP.md
// - Check src/utils/db/hadoop.ts
//

export default function QuickStartGuide() {
return (
<div className="p-8 bg-slate-900 text-slate-100 rounded-lg max-w-4xl">
<h1 className="text-3xl font-bold text-cyan-400 mb-4">
🚀 Hadoop Integration - Quick Start
</h1>

      <div className="space-y-4">
        <section className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-cyan-300 mb-2">
            Step 1: Test dengan Mock Data
          </h2>
          <pre className="bg-slate-900 p-3 rounded text-sm overflow-x-auto">
            npm run dev{"\n"}
            Buka: http://localhost:3000/visual-log
          </pre>
        </section>

        <section className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-cyan-300 mb-2">
            Step 2: Setup HBase (Recommended)
          </h2>
          <pre className="bg-slate-900 p-3 rounded text-sm overflow-x-auto">
            docker run -d --name hbase \
              -p 9090:9090 \
              harisekhol/hbase:latest
          </pre>
        </section>

        <section className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-cyan-300 mb-2">
            Step 3: Configure Environment
          </h2>
          <pre className="bg-slate-900 p-3 rounded text-sm">

{`# .env.local
HADOOP_TYPE=hbase
HADOOP_HOST=localhost
HADOOP_PORT=9090
HADOOP_TABLE=visual_logs`}
</pre>
</section>

        <section className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-cyan-300 mb-2">
            Documentation
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>📖 HADOOP_SETUP.md - Setup lengkap untuk semua Hadoop types</li>
            <li>📝 .env.example - Environment variables template</li>
            <li>💻 src/utils/db/hadoop.ts - Hadoop service implementation</li>
            <li>🔌 src/pages/api/visual-logs.ts - API endpoint</li>
          </ul>
        </section>
      </div>
    </div>

);
}
