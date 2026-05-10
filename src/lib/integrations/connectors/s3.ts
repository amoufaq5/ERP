/**
 * S3 Storage Connector
 *
 * Production file storage connector implementing AWS Signature V4 authentication.
 * Uses Node.js built-in crypto module - does NOT depend on aws-sdk.
 * Supports upload, download, delete, list, pre-signed URLs, and multipart uploads.
 */

import { createHmac, createHash, randomUUID } from 'crypto';
import {
  BaseConnector,
  ConfigField,
  ConnectorConfig,
  HealthCheckResult,
  ConnectorError,
} from '../connector-base';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  storageClass?: string;
  contentType?: string;
}

export interface S3ListResult {
  objects: S3Object[];
  prefixes: string[];
  isTruncated: boolean;
  continuationToken?: string;
  nextContinuationToken?: string;
}

export interface S3UploadParams {
  key: string;
  body: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read' | 'authenticated-read';
  cacheControl?: string;
  contentDisposition?: string;
}

export interface S3DownloadResult {
  body: Buffer;
  contentType: string;
  contentLength: number;
  etag: string;
  lastModified: Date;
  metadata: Record<string, string>;
}

export interface S3PreSignedUrlParams {
  key: string;
  method: 'GET' | 'PUT';
  expiresIn?: number; // seconds, default 3600
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface S3MultipartUpload {
  uploadId: string;
  key: string;
  parts: S3UploadPart[];
}

export interface S3UploadPart {
  partNumber: number;
  etag: string;
  size: number;
}

export interface S3MultipartInitParams {
  key: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface S3Bucket {
  name: string;
  creationDate: Date;
}

// ─── Content Type Detection ──────────────────────────────────────────────────

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function detectContentType(key: string): string {
  const ext = key.substring(key.lastIndexOf('.')).toLowerCase();
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream';
}

// ─── S3 Connector ────────────────────────────────────────────────────────────

export class S3Connector extends BaseConnector {
  readonly id = 's3-storage';
  readonly name = 'AWS S3 Storage';
  readonly version = '1.0.0';
  readonly category = 'storage' as const;

  private accessKeyId = '';
  private secretAccessKey = '';
  private region = 'us-east-1';
  private bucket = '';
  private endpoint = '';
  private forcePathStyle = false;

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize(config: ConnectorConfig): Promise<void> {
    const { credentials, settings } = config;

    if (!credentials.access_key_id) {
      throw this.createError('S3_MISSING_ACCESS_KEY', 'AWS Access Key ID is required', false);
    }
    if (!credentials.secret_access_key) {
      throw this.createError('S3_MISSING_SECRET_KEY', 'AWS Secret Access Key is required', false);
    }
    if (!settings.bucket) {
      throw this.createError('S3_MISSING_BUCKET', 'S3 bucket name is required', false);
    }

    this.accessKeyId = credentials.access_key_id;
    this.secretAccessKey = credentials.secret_access_key;
    this.region = (settings.region as string) || 'us-east-1';
    this.bucket = settings.bucket as string;
    this.forcePathStyle = settings.force_path_style === true || settings.force_path_style === 'true';

    // Allow custom endpoint for S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
    if (settings.endpoint && typeof settings.endpoint === 'string') {
      this.endpoint = settings.endpoint.replace(/\/$/, '');
    } else {
      this.endpoint = `https://s3.${this.region}.amazonaws.com`;
    }

    this.config = config;
    this.initialized = true;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      this.ensureInitialized();

      // HEAD bucket to check access
      const response = await this.s3Request('HEAD', '/', '', {});
      const latencyMs = Date.now() - start;

      if (response.ok) {
        return {
          status: 'healthy',
          latencyMs,
          message: `Bucket "${this.bucket}" is accessible`,
          checkedAt: new Date(),
        };
      }

      if (response.status === 403) {
        return {
          status: 'unhealthy',
          latencyMs,
          message: 'Access denied to bucket',
          checkedAt: new Date(),
        };
      }

      return {
        status: 'unhealthy',
        latencyMs,
        message: `S3 returned status ${response.status}`,
        checkedAt: new Date(),
      };
    } catch (err: unknown) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Health check failed',
        checkedAt: new Date(),
      };
    }
  }

  async disconnect(): Promise<void> {
    this.accessKeyId = '';
    this.secretAccessKey = '';
    this.initialized = false;
    this.config = null;
  }

  getAuthType(): 'api_key' {
    return 'api_key';
  }

  getConfigSchema(): Record<string, ConfigField> {
    return {
      access_key_id: {
        type: 'string',
        label: 'AWS Access Key ID',
        description: 'IAM access key ID with S3 permissions',
        required: true,
        group: 'credentials',
      },
      secret_access_key: {
        type: 'secret',
        label: 'AWS Secret Access Key',
        description: 'IAM secret access key',
        required: true,
        sensitive: true,
        group: 'credentials',
      },
      bucket: {
        type: 'string',
        label: 'Bucket Name',
        description: 'S3 bucket name',
        required: true,
        validation: {
          pattern: '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$',
        },
        group: 'settings',
      },
      region: {
        type: 'select',
        label: 'AWS Region',
        description: 'AWS region where the bucket is located',
        required: false,
        default: 'us-east-1',
        options: [
          { label: 'US East (N. Virginia)', value: 'us-east-1' },
          { label: 'US East (Ohio)', value: 'us-east-2' },
          { label: 'US West (N. California)', value: 'us-west-1' },
          { label: 'US West (Oregon)', value: 'us-west-2' },
          { label: 'EU (Ireland)', value: 'eu-west-1' },
          { label: 'EU (Frankfurt)', value: 'eu-central-1' },
          { label: 'EU (London)', value: 'eu-west-2' },
          { label: 'Asia Pacific (Singapore)', value: 'ap-southeast-1' },
          { label: 'Asia Pacific (Tokyo)', value: 'ap-northeast-1' },
          { label: 'Asia Pacific (Sydney)', value: 'ap-southeast-2' },
        ],
        group: 'settings',
      },
      endpoint: {
        type: 'url',
        label: 'Custom Endpoint',
        description: 'Custom S3-compatible endpoint URL (for MinIO, DigitalOcean Spaces, etc.)',
        required: false,
        group: 'settings',
      },
      force_path_style: {
        type: 'boolean',
        label: 'Force Path Style',
        description: 'Use path-style addressing instead of virtual hosted-style',
        required: false,
        default: false,
        group: 'settings',
      },
    };
  }

  // ─── Object Operations ─────────────────────────────────────────────────────

  /**
   * Upload an object to S3.
   */
  async upload(params: S3UploadParams): Promise<{ etag: string; key: string }> {
    this.ensureInitialized();

    const contentType = params.contentType || detectContentType(params.key);
    const body = typeof params.body === 'string' ? Buffer.from(params.body, 'utf-8') : params.body;

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': body.length.toString(),
    };

    if (params.acl) headers['x-amz-acl'] = params.acl;
    if (params.cacheControl) headers['Cache-Control'] = params.cacheControl;
    if (params.contentDisposition) headers['Content-Disposition'] = params.contentDisposition;

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        headers[`x-amz-meta-${key.toLowerCase()}`] = value;
      }
    }

    const response = await this.s3Request('PUT', `/${encodeKey(params.key)}`, '', headers, body);

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.createError(
        'S3_UPLOAD_FAILED',
        `Upload failed (${response.status}): ${parseS3Error(errorBody)}`,
        response.status >= 500,
        response.status
      );
    }

    const etag = response.headers.get('etag') || '';
    return { etag: etag.replace(/"/g, ''), key: params.key };
  }

  /**
   * Download an object from S3.
   */
  async download(key: string): Promise<S3DownloadResult> {
    this.ensureInitialized();

    const response = await this.s3Request('GET', `/${encodeKey(key)}`, '', {});

    if (!response.ok) {
      if (response.status === 404) {
        throw this.createError('S3_NOT_FOUND', `Object "${key}" not found`, false, 404);
      }
      const errorBody = await response.text();
      throw this.createError(
        'S3_DOWNLOAD_FAILED',
        `Download failed (${response.status}): ${parseS3Error(errorBody)}`,
        response.status >= 500,
        response.status
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata: Record<string, string> = {};
    response.headers.forEach((value, headerKey) => {
      if (headerKey.startsWith('x-amz-meta-')) {
        metadata[headerKey.substring(11)] = value;
      }
    });

    return {
      body: buffer,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      contentLength: parseInt(response.headers.get('content-length') || '0', 10),
      etag: (response.headers.get('etag') || '').replace(/"/g, ''),
      lastModified: new Date(response.headers.get('last-modified') || Date.now()),
      metadata,
    };
  }

  /**
   * Delete an object from S3.
   */
  async delete(key: string): Promise<void> {
    this.ensureInitialized();

    const response = await this.s3Request('DELETE', `/${encodeKey(key)}`, '', {});

    if (!response.ok && response.status !== 204) {
      const errorBody = await response.text();
      throw this.createError(
        'S3_DELETE_FAILED',
        `Delete failed (${response.status}): ${parseS3Error(errorBody)}`,
        response.status >= 500,
        response.status
      );
    }
  }

  /**
   * Check if an object exists (HEAD request).
   */
  async exists(key: string): Promise<boolean> {
    this.ensureInitialized();

    const response = await this.s3Request('HEAD', `/${encodeKey(key)}`, '', {});
    return response.ok;
  }

  /**
   * List objects in a bucket with optional prefix and pagination.
   */
  async list(options?: {
    prefix?: string;
    delimiter?: string;
    maxKeys?: number;
    continuationToken?: string;
  }): Promise<S3ListResult> {
    this.ensureInitialized();

    const params: string[] = ['list-type=2'];
    if (options?.prefix) params.push(`prefix=${encodeURIComponent(options.prefix)}`);
    if (options?.delimiter) params.push(`delimiter=${encodeURIComponent(options.delimiter)}`);
    if (options?.maxKeys) params.push(`max-keys=${options.maxKeys}`);
    if (options?.continuationToken) {
      params.push(`continuation-token=${encodeURIComponent(options.continuationToken)}`);
    }

    const queryString = params.join('&');
    const response = await this.s3Request('GET', '/', queryString, {});

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.createError(
        'S3_LIST_FAILED',
        `List objects failed (${response.status}): ${parseS3Error(errorBody)}`,
        response.status >= 500,
        response.status
      );
    }

    const xml = await response.text();
    return this.parseListResponse(xml);
  }

  // ─── Pre-signed URLs ───────────────────────────────────────────────────────

  /**
   * Generate a pre-signed URL for direct client access.
   */
  generatePreSignedUrl(params: S3PreSignedUrlParams): string {
    this.ensureInitialized();

    const expiresIn = params.expiresIn || 3600;
    const now = new Date();
    const dateStamp = this.formatDate(now);
    const amzDate = this.formatAmzDate(now);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const credential = `${this.accessKeyId}/${credentialScope}`;

    const host = this.getHost();
    const path = this.getObjectPath(params.key);

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host',
    };

    if (params.contentType && params.method === 'PUT') {
      queryParams['Content-Type'] = params.contentType;
    }

    // Sort query parameters
    const sortedParams = Object.keys(queryParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    // Create canonical request
    const canonicalRequest = [
      params.method,
      path,
      sortedParams,
      `host:${host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    // Create string to sign
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Calculate signature
    const signingKey = this.getSigningKey(dateStamp);
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const protocol = this.endpoint.startsWith('http://') ? 'http' : 'https';
    return `${protocol}://${host}${path}?${sortedParams}&X-Amz-Signature=${signature}`;
  }

  // ─── Multipart Upload ──────────────────────────────────────────────────────

  /**
   * Initiate a multipart upload. Returns an upload ID.
   */
  async initiateMultipartUpload(params: S3MultipartInitParams): Promise<string> {
    this.ensureInitialized();

    const contentType = params.contentType || detectContentType(params.key);
    const headers: Record<string, string> = {
      'Content-Type': contentType,
    };

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        headers[`x-amz-meta-${key.toLowerCase()}`] = value;
      }
    }

    const response = await this.s3Request(
      'POST',
      `/${encodeKey(params.key)}`,
      'uploads=',
      headers
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.createError(
        'S3_MULTIPART_INIT_FAILED',
        `Multipart upload initiation failed: ${parseS3Error(errorBody)}`,
        response.status >= 500,
        response.status
      );
    }

    const xml = await response.text();
    const uploadIdMatch = xml.match(/<UploadId>([^<]+)<\/UploadId>/);
    if (!uploadIdMatch) {
      throw this.createError('S3_MULTIPART_PARSE_ERROR', 'Failed to parse upload ID', false);
    }

    return uploadIdMatch[1];
  }

  /**
   * Upload a single part of a multipart upload.
   */
  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer
  ): Promise<S3UploadPart> {
    this.ensureInitialized();

    const queryString = `partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`;
    const headers: Record<string, string> = {
      'Content-Length': body.length.toString(),
    };

    const response = await this.s3Request(
      'PUT',
      `/${encodeKey(key)}`,
      queryString,
      headers,
      body
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.createError(
        'S3_PART_UPLOAD_FAILED',
        `Part ${partNumber} upload failed: ${parseS3Error(errorBody)}`,
        response.status >= 500,
        response.status
      );
    }

    const etag = (response.headers.get('etag') || '').replace(/"/g, '');
    return { partNumber, etag, size: body.length };
  }

  /**
   * Complete a multipart upload by assembling all parts.
   */
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: S3UploadPart[]
  ): Promise<{ etag: string; key: string }> {
    this.ensureInitialized();

    // Build completion XML
    const partsXml = parts
      .sort((a, b) => a.partNumber - b.partNumber)
      .map(
        (part) =>
          `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>"${part.etag}"</ETag></Part>`
      )
      .join('');
    const body = `<CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;

    const queryString = `uploadId=${encodeURIComponent(uploadId)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/xml',
      'Content-Length': Buffer.byteLength(body).toString(),
    };

    const response = await this.s3Request(
      'POST',
      `/${encodeKey(key)}`,
      queryString,
      headers,
      Buffer.from(body)
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.createError(
        'S3_MULTIPART_COMPLETE_FAILED',
        `Multipart completion failed: ${parseS3Error(errorBody)}`,
        response.status >= 500,
        response.status
      );
    }

    const xml = await response.text();
    const etagMatch = xml.match(/<ETag>"?([^"<]+)"?<\/ETag>/);
    return {
      etag: etagMatch ? etagMatch[1] : '',
      key,
    };
  }

  /**
   * Abort a multipart upload.
   */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    this.ensureInitialized();

    const queryString = `uploadId=${encodeURIComponent(uploadId)}`;
    const response = await this.s3Request('DELETE', `/${encodeKey(key)}`, queryString, {});

    if (!response.ok && response.status !== 204) {
      const errorBody = await response.text();
      throw this.createError(
        'S3_MULTIPART_ABORT_FAILED',
        `Multipart abort failed: ${parseS3Error(errorBody)}`,
        false,
        response.status
      );
    }
  }

  /**
   * Convenience method: upload a large file using multipart upload.
   * Automatically splits into 5MB parts.
   */
  async uploadLargeFile(
    key: string,
    body: Buffer,
    options?: { contentType?: string; metadata?: Record<string, string>; partSize?: number }
  ): Promise<{ etag: string; key: string }> {
    const partSize = options?.partSize || 5 * 1024 * 1024; // 5MB default
    const totalParts = Math.ceil(body.length / partSize);

    // If file is small enough, use simple upload
    if (totalParts <= 1) {
      return this.upload({
        key,
        body,
        contentType: options?.contentType,
        metadata: options?.metadata,
      });
    }

    const uploadId = await this.initiateMultipartUpload({
      key,
      contentType: options?.contentType,
      metadata: options?.metadata,
    });

    try {
      const parts: S3UploadPart[] = [];

      for (let i = 0; i < totalParts; i++) {
        const start = i * partSize;
        const end = Math.min(start + partSize, body.length);
        const partBody = body.subarray(start, end);

        const part = await this.uploadPart(key, uploadId, i + 1, partBody);
        parts.push(part);
      }

      return await this.completeMultipartUpload(key, uploadId, parts);
    } catch (err) {
      // Attempt to abort on failure
      try {
        await this.abortMultipartUpload(key, uploadId);
      } catch {
        // Best effort abort
      }
      throw err;
    }
  }

  // ─── Bucket Operations ─────────────────────────────────────────────────────

  /**
   * List all buckets accessible by the credentials.
   */
  async listBuckets(): Promise<S3Bucket[]> {
    this.ensureInitialized();

    // List buckets goes to the service endpoint without a bucket
    const host = this.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const now = new Date();
    const amzDate = this.formatAmzDate(now);
    const dateStamp = this.formatDate(now);

    const headers: Record<string, string> = {
      Host: host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': createHash('sha256').update('').digest('hex'),
    };

    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort()
      .join(';');

    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n');

    const canonicalRequest = [
      'GET',
      '/',
      '',
      canonicalHeaders + '\n',
      signedHeaders,
      createHash('sha256').update('').digest('hex'),
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp);
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    headers[
      'Authorization'
    ] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(`${this.endpoint}/`, { method: 'GET', headers });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.createError(
        'S3_LIST_BUCKETS_FAILED',
        `List buckets failed: ${parseS3Error(errorBody)}`,
        response.status >= 500,
        response.status
      );
    }

    const xml = await response.text();
    return this.parseBucketsResponse(xml);
  }

  /**
   * Create a new bucket.
   */
  async createBucket(bucketName: string, region?: string): Promise<void> {
    this.ensureInitialized();

    const targetRegion = region || this.region;
    let body = '';

    // LocationConstraint is required for non-us-east-1 regions
    if (targetRegion !== 'us-east-1') {
      body = `<CreateBucketConfiguration><LocationConstraint>${targetRegion}</LocationConstraint></CreateBucketConfiguration>`;
    }

    const host = this.forcePathStyle
      ? `${this.endpoint.replace(/^https?:\/\//, '')}/${bucketName}`
      : `${bucketName}.s3.${targetRegion}.amazonaws.com`;

    const url = this.forcePathStyle
      ? `${this.endpoint}/${bucketName}`
      : `https://${bucketName}.s3.${targetRegion}.amazonaws.com/`;

    const now = new Date();
    const amzDate = this.formatAmzDate(now);
    const dateStamp = this.formatDate(now);
    const payloadHash = createHash('sha256').update(body).digest('hex');

    const headers: Record<string, string> = {
      Host: host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': payloadHash,
    };

    if (body) {
      headers['Content-Type'] = 'application/xml';
      headers['Content-Length'] = Buffer.byteLength(body).toString();
    }

    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort()
      .join(';');

    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n');

    const canonicalRequest = [
      'PUT',
      '/',
      '',
      canonicalHeaders + '\n',
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${targetRegion}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp, targetRegion);
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    headers[
      'Authorization'
    ] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: body || undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.createError(
        'S3_CREATE_BUCKET_FAILED',
        `Create bucket failed: ${parseS3Error(errorBody)}`,
        false,
        response.status
      );
    }
  }

  // ─── AWS Signature V4 Implementation ───────────────────────────────────────

  private async s3Request(
    method: string,
    path: string,
    queryString: string,
    extraHeaders: Record<string, string>,
    body?: Buffer
  ): Promise<Response> {
    const now = new Date();
    const amzDate = this.formatAmzDate(now);
    const dateStamp = this.formatDate(now);
    const host = this.getHost();
    const resolvedPath = this.forcePathStyle ? `/${this.bucket}${path}` : path;

    const payloadHash = createHash('sha256')
      .update(body || '')
      .digest('hex');

    const headers: Record<string, string> = {
      Host: host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': payloadHash,
      ...extraHeaders,
    };

    // Build canonical request
    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort()
      .join(';');

    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n');

    const canonicalQueryString = queryString
      .split('&')
      .filter((p) => p.length > 0)
      .sort()
      .join('&');

    const canonicalRequest = [
      method,
      resolvedPath,
      canonicalQueryString,
      canonicalHeaders + '\n',
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to sign
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Signing key
    const signingKey = this.getSigningKey(dateStamp);
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    // Authorization header
    headers[
      'Authorization'
    ] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const protocol = this.endpoint.startsWith('http://') ? 'http' : 'https';
    const qs = canonicalQueryString ? `?${canonicalQueryString}` : '';
    const url = `${protocol}://${host}${resolvedPath}${qs}`;

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'PUT' || method === 'POST')) {
      fetchOptions.body = body;
    }

    return fetch(url, fetchOptions);
  }

  private getHost(): string {
    if (this.forcePathStyle) {
      return this.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
    // Virtual hosted-style
    const baseHost = this.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `${this.bucket}.${baseHost}`;
  }

  private getObjectPath(key: string): string {
    if (this.forcePathStyle) {
      return `/${this.bucket}/${encodeKey(key)}`;
    }
    return `/${encodeKey(key)}`;
  }

  private getSigningKey(dateStamp: string, region?: string): Buffer {
    const kDate = createHmac('sha256', `AWS4${this.secretAccessKey}`)
      .update(dateStamp)
      .digest();
    const kRegion = createHmac('sha256', kDate)
      .update(region || this.region)
      .digest();
    const kService = createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  }

  private formatAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  // ─── XML Parsing (minimal, avoids external deps) ───────────────────────────

  private parseListResponse(xml: string): S3ListResult {
    const objects: S3Object[] = [];
    const prefixes: string[] = [];

    // Parse Contents elements
    const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match: RegExpExecArray | null;

    while ((match = contentsRegex.exec(xml)) !== null) {
      const content = match[1];
      const key = this.extractXmlValue(content, 'Key');
      const size = this.extractXmlValue(content, 'Size');
      const lastModified = this.extractXmlValue(content, 'LastModified');
      const etag = this.extractXmlValue(content, 'ETag');
      const storageClass = this.extractXmlValue(content, 'StorageClass');

      if (key) {
        objects.push({
          key,
          size: parseInt(size || '0', 10),
          lastModified: new Date(lastModified || Date.now()),
          etag: (etag || '').replace(/"/g, ''),
          storageClass: storageClass || undefined,
        });
      }
    }

    // Parse CommonPrefixes
    const prefixRegex = /<CommonPrefixes>\s*<Prefix>([^<]+)<\/Prefix>\s*<\/CommonPrefixes>/g;
    while ((match = prefixRegex.exec(xml)) !== null) {
      prefixes.push(match[1]);
    }

    const isTruncated = this.extractXmlValue(xml, 'IsTruncated') === 'true';
    const nextContinuationToken =
      this.extractXmlValue(xml, 'NextContinuationToken') || undefined;

    return {
      objects,
      prefixes,
      isTruncated,
      nextContinuationToken,
    };
  }

  private parseBucketsResponse(xml: string): S3Bucket[] {
    const buckets: S3Bucket[] = [];
    const bucketRegex = /<Bucket>([\s\S]*?)<\/Bucket>/g;
    let match: RegExpExecArray | null;

    while ((match = bucketRegex.exec(xml)) !== null) {
      const content = match[1];
      const name = this.extractXmlValue(content, 'Name');
      const creationDate = this.extractXmlValue(content, 'CreationDate');

      if (name) {
        buckets.push({
          name,
          creationDate: new Date(creationDate || Date.now()),
        });
      }
    }

    return buckets;
  }

  private extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
    const match = regex.exec(xml);
    return match ? match[1] : null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function encodeKey(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function parseS3Error(xml: string): string {
  const codeMatch = /<Code>([^<]+)<\/Code>/.exec(xml);
  const messageMatch = /<Message>([^<]+)<\/Message>/.exec(xml);
  if (codeMatch && messageMatch) {
    return `${codeMatch[1]}: ${messageMatch[1]}`;
  }
  return xml.substring(0, 200);
}
