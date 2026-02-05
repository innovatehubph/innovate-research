/**
 * Storage Service
 * MinIO/S3-compatible object storage for reports and exports
 */

import { Client as MinioClient } from 'minio';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

// Bucket names
export const BUCKETS = {
  REPORTS: 'reports',
  EXPORTS: 'exports',
  ATTACHMENTS: 'attachments',
  TEMP: 'temp',
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

// Storage configuration
export interface StorageConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region?: string;
}

// Upload options
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  expiresIn?: number;  // Seconds for presigned URL
}

// File info
export interface FileInfo {
  bucket: string;
  key: string;
  size: number;
  contentType?: string;
  lastModified: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

export class StorageService {
  private client: MinioClient;
  private initialized: boolean = false;
  private config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      endPoint: config?.endPoint || process.env.MINIO_ENDPOINT || 'localhost',
      port: config?.port || parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: config?.useSSL || process.env.MINIO_USE_SSL === 'true',
      accessKey: config?.accessKey || process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: config?.secretKey || process.env.MINIO_SECRET_KEY || 'minioadmin',
      region: config?.region || process.env.MINIO_REGION || 'us-east-1',
    };

    this.client = new MinioClient(this.config);
  }

  /**
   * Initialize storage - create buckets if they don't exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      for (const bucket of Object.values(BUCKETS)) {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket, this.config.region);
          console.log(`Created bucket: ${bucket}`);
          
          // Set bucket policy for public read on exports
          if (bucket === BUCKETS.EXPORTS) {
            await this.setBucketPolicy(bucket, 'download');
          }
        }
      }
      
      this.initialized = true;
      console.log('Storage service initialized');
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  /**
   * Upload a file from Buffer
   */
  async uploadFile(
    bucket: BucketName,
    key: string,
    buffer: Buffer,
    contentType: string,
    options: UploadOptions = {}
  ): Promise<{ key: string; url: string; etag: string }> {
    await this.ensureInitialized();

    const metadata: Record<string, string> = {
      'Content-Type': contentType,
      ...options.metadata,
    };

    const result = await this.client.putObject(
      bucket,
      key,
      buffer,
      buffer.length,
      metadata
    );

    const url = await this.getFileUrl(bucket, key, options.expiresIn);

    return {
      key,
      url,
      etag: result.etag,
    };
  }

  /**
   * Upload a file from Stream
   */
  async uploadStream(
    bucket: BucketName,
    key: string,
    stream: Readable,
    size: number,
    contentType: string,
    options: UploadOptions = {}
  ): Promise<{ key: string; url: string; etag: string }> {
    await this.ensureInitialized();

    const metadata: Record<string, string> = {
      'Content-Type': contentType,
      ...options.metadata,
    };

    const result = await this.client.putObject(
      bucket,
      key,
      stream,
      size,
      metadata
    );

    const url = await this.getFileUrl(bucket, key, options.expiresIn);

    return {
      key,
      url,
      etag: result.etag,
    };
  }

  /**
   * Upload file with auto-generated key
   */
  async uploadFileAuto(
    bucket: BucketName,
    buffer: Buffer,
    contentType: string,
    extension: string,
    options: UploadOptions = {}
  ): Promise<{ key: string; url: string; etag: string }> {
    const key = this.generateKey(extension);
    return this.uploadFile(bucket, key, buffer, contentType, options);
  }

  /**
   * Get presigned URL for file download
   */
  async getFileUrl(
    bucket: BucketName,
    key: string,
    expiresIn: number = 3600  // 1 hour default
  ): Promise<string> {
    await this.ensureInitialized();
    return this.client.presignedGetObject(bucket, key, expiresIn);
  }

  /**
   * Get presigned URL for file upload
   */
  async getUploadUrl(
    bucket: BucketName,
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    await this.ensureInitialized();
    return this.client.presignedPutObject(bucket, key, expiresIn);
  }

  /**
   * Download file as Buffer
   */
  async downloadFile(bucket: BucketName, key: string): Promise<Buffer> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      this.client.getObject(bucket, key, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    });
  }

  /**
   * Download file as Stream
   */
  async downloadStream(bucket: BucketName, key: string): Promise<Readable> {
    await this.ensureInitialized();
    return this.client.getObject(bucket, key);
  }

  /**
   * Delete a file
   */
  async deleteFile(bucket: BucketName, key: string): Promise<void> {
    await this.ensureInitialized();
    await this.client.removeObject(bucket, key);
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(bucket: BucketName, keys: string[]): Promise<void> {
    await this.ensureInitialized();
    await this.client.removeObjects(bucket, keys);
  }

  /**
   * Check if file exists
   */
  async fileExists(bucket: BucketName, key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file info/metadata
   */
  async getFileInfo(bucket: BucketName, key: string): Promise<FileInfo> {
    await this.ensureInitialized();

    const stat = await this.client.statObject(bucket, key);

    return {
      bucket,
      key,
      size: stat.size,
      contentType: stat.metaData?.['content-type'],
      lastModified: stat.lastModified,
      etag: stat.etag,
      metadata: stat.metaData,
    };
  }

  /**
   * List files in bucket with optional prefix
   */
  async listFiles(
    bucket: BucketName,
    prefix?: string,
    recursive: boolean = true
  ): Promise<FileInfo[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const files: FileInfo[] = [];
      const stream = this.client.listObjectsV2(bucket, prefix || '', recursive);

      stream.on('data', (obj) => {
        if (obj.name) {
          files.push({
            bucket,
            key: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag,
          });
        }
      });

      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }

  /**
   * Copy file within or between buckets
   */
  async copyFile(
    sourceBucket: BucketName,
    sourceKey: string,
    destBucket: BucketName,
    destKey: string
  ): Promise<void> {
    await this.ensureInitialized();

    const conditions = new (require('minio').CopyConditions)();
    await this.client.copyObject(
      destBucket,
      destKey,
      `/${sourceBucket}/${sourceKey}`,
      conditions
    );
  }

  /**
   * Move file (copy then delete)
   */
  async moveFile(
    sourceBucket: BucketName,
    sourceKey: string,
    destBucket: BucketName,
    destKey: string
  ): Promise<void> {
    await this.copyFile(sourceBucket, sourceKey, destBucket, destKey);
    await this.deleteFile(sourceBucket, sourceKey);
  }

  /**
   * Generate unique storage key
   */
  generateKey(extension: string, prefix?: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const uuid = uuidv4();

    const basePath = prefix ? `${prefix}/` : '';
    return `${basePath}${year}/${month}/${day}/${uuid}.${extension}`;
  }

  /**
   * Set bucket policy
   */
  private async setBucketPolicy(
    bucket: BucketName,
    type: 'download' | 'upload' | 'public'
  ): Promise<void> {
    let policy: object;

    switch (type) {
      case 'download':
        policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        };
        break;

      case 'public':
        policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject', 's:PutObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        };
        break;

      default:
        return;
    }

    await this.client.setBucketPolicy(bucket, JSON.stringify(policy));
  }

  /**
   * Get bucket statistics
   */
  async getBucketStats(bucket: BucketName): Promise<{
    fileCount: number;
    totalSize: number;
  }> {
    const files = await this.listFiles(bucket);
    
    return {
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
    };
  }

  /**
   * Clean up old temp files
   */
  async cleanupTempFiles(maxAgeHours: number = 24): Promise<number> {
    const files = await this.listFiles(BUCKETS.TEMP);
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    const filesToDelete = files
      .filter(file => file.lastModified < cutoffDate)
      .map(file => file.key);

    if (filesToDelete.length > 0) {
      await this.deleteFiles(BUCKETS.TEMP, filesToDelete);
    }

    return filesToDelete.length;
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      await this.client.listBuckets();
      return { healthy: true };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
