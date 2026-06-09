/**
 * Hadoop Connection Service
 * Supports: HBase, HDFS, Hive, Spark REST API
 */

export interface HadoopConfig {
  type: 'hbase' | 'hive' | 'hdfs' | 'rest' | 'spark';
  host: string;
  port: number;
  protocol?: 'http' | 'https';
  username?: string;
  password?: string;
  table?: string; // untuk HBase
  database?: string; // untuk Hive
  path?: string; // untuk HDFS
}

export interface VisualLogFromHadoop {
  id: string;
  timestamp: string;
  cameraImage: string;
  aiDecision: 'Success' | 'Failed';
  vehicleCount: number;
  confidence: number;
}

class HadoopService {
  private config: HadoopConfig;
  private baseUrl: string;

  constructor(config: HadoopConfig) {
    this.config = config;
    const protocol = config.protocol || 'http';
    this.baseUrl = `${protocol}://${config.host}:${config.port}`;
  }

  /**
   * Connect ke Hadoop dan fetch visual logs
   */
  async fetchVisualLogs(filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<VisualLogFromHadoop[]> {
    try {
      switch (this.config.type) {
        case 'hbase':
          return await this.fetchFromHBase(filters);
        case 'hive':
          return await this.fetchFromHive(filters);
        case 'hdfs':
          return await this.fetchFromHDFS(filters);
        case 'rest':
        case 'spark':
          return await this.fetchFromRest(filters);
        default:
          throw new Error(`Unsupported Hadoop type: ${this.config.type}`);
      }
    } catch (error) {
      console.error('Hadoop fetch error:', error);
      throw error;
    }
  }

  /**
   * Fetch dari HBase
   * Endpoint: http://host:port/hbase/table_name/scan
   */
  private async fetchFromHBase(filters?: any): Promise<VisualLogFromHadoop[]> {
    const url = `${this.baseUrl}/hbase/${this.config.table}/scan`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error(`HBase error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseHBaseResponse(data);
    } catch (error) {
      console.error('HBase fetch failed:', error);
      throw error;
    }
  }

  /**
   * Fetch dari Hive (via HiveServer2 REST)
   */
  private async fetchFromHive(filters?: any): Promise<VisualLogFromHadoop[]> {
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    
    const query = `
      SELECT id, timestamp, camera_image, ai_decision, vehicle_count, confidence
      FROM ${this.config.database}.visual_logs
      LIMIT ${limit} OFFSET ${offset}
    `;

    const url = `${this.baseUrl}/cliservice/execute`;
    
    try {
      console.log(`[Hadoop] Connecting to Hive at ${this.baseUrl}`);
      console.log(`[Hadoop] Executing query on database: ${this.config.database}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Hadoop] Hive response: ${response.status} - ${errorText}`);
        throw new Error(`Hive error: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      console.log(`[Hadoop] Hive query successful`);
      return this.parseHiveResponse(data);
    } catch (error) {
      console.error('[Hadoop] Hive fetch failed:', error);
      throw error;
    }
  }

  /**
   * Fetch dari HDFS
   * Expects JSON files in path like: /visual_logs/data.json
   */
  private async fetchFromHDFS(filters?: any): Promise<VisualLogFromHadoop[]> {
    const url = `${this.baseUrl}/webhdfs/v1${this.config.path}?op=LISTSTATUS`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HDFS error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseHDFSResponse(data, filters);
    } catch (error) {
      console.error('HDFS fetch failed:', error);
      throw error;
    }
  }

  /**
   * Fetch dari REST API (Custom atau Spark)
   */
  private async fetchFromRest(filters?: any): Promise<VisualLogFromHadoop[]> {
    const params = new URLSearchParams();
    
    if (filters?.startDate) params.append('start_date', filters.startDate);
    if (filters?.endDate) params.append('end_date', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const url = `${this.baseUrl}/api/visual-logs${params.toString() ? '?' + params.toString() : ''}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error(`REST API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseRestResponse(data);
    } catch (error) {
      console.error('REST API fetch failed:', error);
      throw error;
    }
  }

  /**
   * Parse response dari HBase
   */
  private parseHBaseResponse(data: any): VisualLogFromHadoop[] {
    if (!data.rows) return [];

    return data.rows.map((row: any) => {
      const cells = row.key + row.cells; // Adjust based on actual HBase format
      return {
        id: row.key,
        timestamp: cells.timestamp || new Date().toISOString(),
        cameraImage: cells.camera_image || '',
        aiDecision: cells.ai_decision || 'Failed',
        vehicleCount: parseInt(cells.vehicle_count) || 0,
        confidence: parseInt(cells.confidence) || 0,
      };
    });
  }

  /**
   * Parse response dari Hive
   */
  private parseHiveResponse(data: any): VisualLogFromHadoop[] {
    try {
      console.log('[Hadoop] Parsing Hive response:', JSON.stringify(data).substring(0, 200));
      
      if (!data) return [];

      // Handle different Hive response formats
      let rows: any[] = [];

      // Format 1: Direct array response
      if (Array.isArray(data)) {
        rows = data;
      }
      // Format 2: Response with results.rows
      else if (data.results && Array.isArray(data.results.rows)) {
        rows = data.results.rows;
      }
      // Format 3: Response with data property
      else if (data.data && Array.isArray(data.data)) {
        rows = data.data;
      }
      // Format 4: Response with rows property
      else if (data.rows && Array.isArray(data.rows)) {
        rows = data.rows;
      }

      if (rows.length === 0) {
        console.log('[Hadoop] No rows returned from Hive');
        return [];
      }

      return rows.map((row: any, idx: number) => {
        try {
          // Handle array response [id, timestamp, camera_image, ...]
          if (Array.isArray(row)) {
            return {
              id: row[0] || `visual_${idx}`,
              timestamp: row[1] || new Date().toISOString(),
              cameraImage: row[2] || '',
              aiDecision: (row[3] || 'Failed') as 'Success' | 'Failed',
              vehicleCount: parseInt(row[4]) || 0,
              confidence: parseInt(row[5]) || 0,
            };
          }
          // Handle object response {id, timestamp, camera_image, ...}
          else if (typeof row === 'object') {
            return {
              id: row.id || `visual_${idx}`,
              timestamp: row.timestamp || new Date().toISOString(),
              cameraImage: row.camera_image || row.cameraImage || '',
              aiDecision: (row.ai_decision || row.aiDecision || 'Failed') as 'Success' | 'Failed',
              vehicleCount: parseInt(row.vehicle_count || row.vehicleCount) || 0,
              confidence: parseInt(row.confidence) || 0,
            };
          }
          return null;
        } catch (e) {
          console.warn(`[Hadoop] Failed to parse row ${idx}:`, e);
          return null;
        }
      }).filter((row): row is VisualLogFromHadoop => row !== null);
    } catch (error) {
      console.error('[Hadoop] Error parsing Hive response:', error);
      return [];
    }
  }

  /**
   * Parse response dari HDFS
   */
  private parseHDFSResponse(data: any, filters?: any): VisualLogFromHadoop[] {
    // Implement based on your HDFS file structure
    return [];
  }

  /**
   * Parse response dari REST API
   */
  private parseRestResponse(data: any): VisualLogFromHadoop[] {
    if (Array.isArray(data)) {
      return data;
    }
    return data.data || data.logs || [];
  }

  /**
   * Get auth headers jika diperlukan
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.username && this.config.password) {
      const auth = Buffer.from(
        `${this.config.username}:${this.config.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * Test connection ke Hadoop
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/jmx`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('Hadoop connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let hadoopService: HadoopService | null = null;

export function initHadoopService(config: HadoopConfig): HadoopService {
  hadoopService = new HadoopService(config);
  return hadoopService;
}

export function getHadoopService(): HadoopService {
  if (!hadoopService) {
    throw new Error('Hadoop service not initialized. Call initHadoopService first.');
  }
  return hadoopService;
}

export default HadoopService;
