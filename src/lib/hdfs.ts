export const HDFS_URL = process.env.NEXT_PUBLIC_HDFS_URL || "http://100.90.109.94:9870";
export const HDFS_USER = process.env.NEXT_PUBLIC_HDFS_USER || "hadoop"; // Username default
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
 * Reads a file from HDFS and returns it as JSON.
 */
export async function readHDFSJson(filePath: string): Promise<any> {
  try {
    const openUrl = `${HDFS_URL}/webhdfs/v1${filePath}?op=OPEN&user.name=${HDFS_USER}`;
    // OPEN also uses redirects, but for GET requests we can usually let fetch follow them automatically.
    const response = await fetch(openUrl, {
      method: "GET",
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`[HDFS] Error reading file ${filePath}. Status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[HDFS] Exception reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Returns the URL to directly view/download a file via WebHDFS.
 */
export function getHDFSFileViewUrl(filePath: string): string {
  return `${HDFS_URL}/webhdfs/v1${filePath}?op=OPEN&user.name=${HDFS_USER}`;
}
