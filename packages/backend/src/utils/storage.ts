import '../config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.S3_REGION || 'us-east-2';
const bucket = process.env.S3_BUCKET || 'rootine';
const endpointEnv = process.env.S3_ENDPOINT || undefined;
const endpoint = endpointEnv && /^https?:\/\//.test(endpointEnv) ? endpointEnv : undefined;
const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true';
const publicBaseUrl = sanitizeBaseUrl(process.env.S3_PUBLIC_BASE_URL); // e.g. https://cdn.example.com or https://bucket.s3.amazonaws.com

let _client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (_client) return _client;
  if (!bucket) {
    throw new Error('S3_BUCKET is required');
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3 credentials are required (S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY)');
  }

  _client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType?: string;
  expiresInSeconds?: number;
}): Promise<{ url: string; key: string; headers: Record<string, string>; fileUrl: string }> {
  try {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType || 'application/octet-stream',
      ACL: 'public-read',
    });
    const url = await getSignedUrl(client, command, { expiresIn: params.expiresInSeconds || 60 * 5 });

    const fileUrl = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, '')}/${params.key}`
      : buildDefaultPublicUrl(bucket, region, endpoint, forcePathStyle, params.key);

    const headers: Record<string, string> = {
      ...(params.contentType ? { 'Content-Type': params.contentType } : {}),
      'x-amz-acl': 'public-read',
    };

    return { url, key: params.key, headers, fileUrl };
  } catch (err) {
    console.error('Failed to create presigned upload URL', { err, key: params.key });
    throw err;
  }
}

function buildDefaultPublicUrl(
  bucketName: string,
  regionName: string,
  customEndpoint: string | undefined,
  pathStyle: boolean,
  key: string,
): string {
  if (customEndpoint) {
    const base = customEndpoint.replace(/\/$/, '');
    // Prefer path-style for custom endpoints
    if (pathStyle) return `${base}/${bucketName}/${encodeURIComponentPath(key)}`;
    // Many custom endpoints don't support virtual-hosted-style reliably; default to path-style
    return `${base}/${bucketName}/${encodeURIComponentPath(key)}`;
  }
  // AWS S3 virtual-hosted-style endpoint (preferred)
  return `https://${bucketName}.s3.${regionName}.amazonaws.com/${encodeURIComponentPath(key)}`;
}

function sanitizeBaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let v = String(raw).trim();
  // Cut off at first semicolon or hash (common comment starters in env files)
  const semi = v.indexOf(';');
  if (semi !== -1) v = v.slice(0, semi);
  const hash = v.indexOf('#');
  if (hash !== -1) v = v.slice(0, hash);
  // Trim wrapping quotes
  v = v.replace(/^['"]/g, '').replace(/['"]$/g, '').trim();
  // Must look like https?://host[/path]
  if (!/^https?:\/\/[^\/]+(\/.*)?$/i.test(v)) return undefined;
  // Remove trailing slashes to avoid generating https:///...
  v = v.replace(/\/+$/, '');
  return v || undefined;
}

function encodeURIComponentPath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}


