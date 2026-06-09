// Contoh konseptual menggunakan fetch untuk WebHDFS
const TAILSCALE_HADOOP_IP = "100.x.x.x";
const WEBHDFS_PORT = "9870";
const HDFS_USER = "hadoop_user";

async function uploadVisualLogToHDFS(imageBuffer, filename) {
  const hdfsPath = `/sigap/visual_logs/${filename}`;
  const webHdfsUrl = `http://${TAILSCALE_HADOOP_IP}:${WEBHDFS_PORT}/webhdfs/v1${hdfsPath}?op=CREATE&user.name=${HDFS_USER}&overwrite=true`;

  // Step 1: Request upload URL
  const response = await fetch(webHdfsUrl, { method: 'PUT' });
  const uploadUrl = response.headers.get('Location'); // Hadoop redirects to a DataNode

  // Step 2: Upload the actual image buffer to the DataNode
  if (uploadUrl) {
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: imageBuffer,
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    
    if (uploadResponse.ok) {
       return hdfsPath; // Simpan path ini ke Firestore
    }
  }
  throw new Error("Gagal upload ke HDFS");
}