export const HDFS_URL = process.env.NEXT_PUBLIC_HDFS_URL || "http://100.90.109.94:9870";
export const HDFS_USER =
  process.env.NEXT_PUBLIC_HDFS_USER || "hadoopuser";
export const HDFS_BASE_DIR = "/sigap/visual_logs";

/**
 * Uploads a buffer to HDFS via WebHDFS.
 */
export async function uploadToHDFS(filePath: string, buffer: Buffer): Promise<boolean> {
  try {
    const createUrl = `${HDFS_URL}/webhdfs/v1${filePath}?op=CREATE&user.name=${HDFS_USER}&overwrite=true`;

    // Step 1: Submit HTTP PUT request without automatically following redirects
    const response1 = await fetch(createUrl, {
      method: "PUT",
      redirect: "manual", // Prevent automatic redirect to capture the Location header
    });

    let dataNodeUrl = "";

    // In WebHDFS, CREATE returns 307 Temporary Redirect with the Location header
    if (response1.status === 307) {
      dataNodeUrl = response1.headers.get("location") || "";
    } else if (response1.status >= 200 && response1.status < 300) {
      // Sometimes standard node fetch polyfills might follow redirect despite 'manual' depending on version
      console.log(`[HDFS] File created directly: ${filePath}`);
      return true;
    } else {
      const errText = await response1.text();
      console.error(`[HDFS] Error initiating upload for ${filePath}. Status: ${response1.status}, Body: ${errText}`);
      return false;
    }

    if (!dataNodeUrl) {
      console.error(`[HDFS] No location header returned for ${filePath}`);
      return false;
    }

    // Step 2: Submit another HTTP PUT request using the URL in the Location header with the file data
    const response2 = await fetch(dataNodeUrl, {
      method: "PUT",
      body: buffer as unknown as BodyInit,
    });

    if (response2.status >= 200 && response2.status < 300) {
      console.log(`[HDFS] Successfully uploaded: ${filePath}`);
      return true;
    } else {
      const errText = await response2.text();
      console.error(`[HDFS] Error completing upload for ${filePath}. Status: ${response2.status}, Body: ${errText}`);
      return false;
    }
  } catch (error) {
    console.error(`[HDFS] Exception uploading ${filePath}:`, error);
    return false;
  }
}

/**
 * Lists the status of files in a directory.
 */
export async function listHDFSDirectory(dirPath: string): Promise<any[]> {
  try {
    const listUrl = `${HDFS_URL}/webhdfs/v1${dirPath}?op=LISTSTATUS&user.name=${HDFS_USER}`;
    const response = await fetch(listUrl);

    if (response.status === 404) {
      // Directory not found, might be the first run
      return [];
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[HDFS] Error listing directory ${dirPath}. Status: ${response.status}, Body: ${errText}`);
      return [];
    }

    const data = await response.json();
    if (data && data.FileStatuses && data.FileStatuses.FileStatus) {
      return data.FileStatuses.FileStatus;
    }
    return [];
  } catch (error) {
    console.error(`[HDFS] Exception listing directory ${dirPath}:`, error);
    return [];
  }
}

/**
 * Resolves Hadoop internal hostnames to Tailscale IPs
 */
function resolveDataNodeUrl(url: string): string {
  let resolvedUrl = url;
  // Ganti hostname internal Hadoop dengan IP Tailscale yang sesuai
  resolvedUrl = resolvedUrl.replace('://sasami:', '://100.109.248.117:');
  resolvedUrl = resolvedUrl.replace('://datanode3:', '://100.100.211.62:');
  // Tambahkan mapping lain di sini jika diperlukan
  return resolvedUrl;
}

/**
 * Reads a file from HDFS and returns it as JSON.
 */
export async function readHDFSJson(filePath: string): Promise<any> {
  try {
    const openUrl = `${HDFS_URL}/webhdfs/v1${filePath}?op=OPEN&user.name=${HDFS_USER}`;

    // Step 1: Lakukan request dengan redirect manual agar kita bisa menangkap URL DataNode
    const response1 = await fetch(openUrl, {
      method: "GET",
      redirect: "manual",
    });

    let dataNodeUrl = "";
    if (response1.status === 307 || response1.status === 302) {
      dataNodeUrl = response1.headers.get("location") || "";
      // Step 1.5: Ganti hostname dengan IP Tailscale agar Next.js bisa memanggilnya
      dataNodeUrl = resolveDataNodeUrl(dataNodeUrl);
    } else if (response1.status >= 200 && response1.status < 300) {
      return await response1.json();
    } else {
      console.error(`[HDFS] Error initiating read for ${filePath}. Status: ${response1.status}`);
      return null;
    }

    if (!dataNodeUrl) {
      console.error(`[HDFS] No redirect location found for ${filePath}`);
      return null;
    }

    // Step 2: Ambil data dari DataNode yang sudah di-resolve IP-nya
    const response2 = await fetch(dataNodeUrl, {
      method: "GET"
    });

    if (!response2.ok) {
      console.error(`[HDFS] Error reading file ${filePath} from DataNode. Status: ${response2.status}`);
      return null;
    }

    const data = await response2.json();
    return data;
  } catch (error) {
    console.error(`[HDFS] Exception reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Returns the URL to directly view/download a file via WebHDFS.
 * Jika URL melibatkan redirect ke DataNode, browser mungkin gagal membukanya jika tidak mengenali hostname.
 * Sebagai alternatif yang lebih aman untuk proxy gambar, kita bisa membuatkan API route khusus, 
 * tapi untuk sementara kita gunakan URL NameNode ini (redirect akan ditangani oleh browser pengguna).
 */
export function getHDFSFileViewUrl(filePath: string): string {
  return `${HDFS_URL}/webhdfs/v1${filePath}?op=OPEN&user.name=${HDFS_USER}`;
}
