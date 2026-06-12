export const HDFS_URL = process.env.NEXT_PUBLIC_HDFS_URL || "http://100.90.109.94:9870";
export const HDFS_USER =
  process.env.NEXT_PUBLIC_HDFS_USER || "hadoopuser";
export const HDFS_BASE_DIR = "/sigap/visual_logs";

const HADOOP_HOSTNAME_MAP: Record<string, string> = {
  "hadoop-namenode": "100.90.109.94",
  "namenode": "100.90.109.94",

  "hadoop-datanode1": "100.97.93.48",
  "datanode1": "100.97.93.48",

  "hadoop-datanode2-1": "100.116.70.125",
  "hadoop-datanode2": "100.116.70.125",
  "datanode2-1": "100.116.70.125",
  "datanode2": "100.116.70.125",

  "hadoop-datanode3": "100.100.211.62",
  "datanode3": "100.100.211.62",
};

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

    // Step 2: Resolve hostname dan upload file ke DataNode menggunakan http module native (menghindari bug node-fetch/undici dengan WebHDFS)
    const resolvedUrl = resolveDataNodeUrl(dataNodeUrl);
    
    return new Promise((resolve) => {
      const url = new URL(resolvedUrl);
      const http = require('http');
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: {
          'Content-Length': buffer.length,
          'Content-Type': 'application/octet-stream'
        }
      };

      const req = http.request(options, (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[HDFS] Successfully uploaded: ${filePath}`);
          resolve(true);
        } else {
          console.error(`[HDFS] Error completing upload for ${filePath}. Status: ${res.statusCode}`);
          resolve(false);
        }
      });

      req.on('error', (e: any) => {
        console.error(`[HDFS] Socket/HTTP Exception completing upload for ${filePath}: ${e.message}`);
        resolve(false);
      });

      req.write(buffer);
      req.end();
    });
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
  for (const [hostname, ip] of Object.entries(HADOOP_HOSTNAME_MAP)) {
    resolvedUrl = resolvedUrl.replace(`://${hostname}:`, `://${ip}:`);
  }
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
 * Reads a file from HDFS and returns it as a Buffer (for binary files like images).
 */
export async function readHDFSFile(filePath: string): Promise<Buffer | null> {
  try {
    const openUrl = `${HDFS_URL}/webhdfs/v1${filePath}?op=OPEN&user.name=${HDFS_USER}`;

    const response1 = await fetch(openUrl, {
      method: "GET",
      redirect: "manual",
    });

    let dataNodeUrl = "";
    if (response1.status === 307 || response1.status === 302) {
      dataNodeUrl = response1.headers.get("location") || "";
      dataNodeUrl = resolveDataNodeUrl(dataNodeUrl);
    } else if (response1.status >= 200 && response1.status < 300) {
      const buffer = await response1.arrayBuffer();
      return Buffer.from(buffer);
    } else {
      console.error(`[HDFS] Error initiating read for ${filePath}. Status: ${response1.status}`);
      return null;
    }

    if (!dataNodeUrl) {
      console.error(`[HDFS] No redirect location found for ${filePath}`);
      return null;
    }

    const response2 = await fetch(dataNodeUrl, { method: "GET" });

    if (!response2.ok) {
      console.error(`[HDFS] Error reading file ${filePath} from DataNode. Status: ${response2.status}`);
      return null;
    }

    const buffer = await response2.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error(`[HDFS] Exception reading file ${filePath}:`, error);
    return null;
  }
}

/** @deprecated Gunakan proxy endpoint `/api/proxy-image` saja, karena browser tidak bisa resolve hostname internal Hadoop. */
export function getHDFSFileViewUrl(filePath: string): string {
  return `${HDFS_URL}/webhdfs/v1${filePath}?op=OPEN&user.name=${HDFS_USER}`;
}
