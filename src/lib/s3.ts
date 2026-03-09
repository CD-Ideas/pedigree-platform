import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || '';
const CDN    = process.env.CLOUDFRONT_DOMAIN
  ? `https://${process.env.CLOUDFRONT_DOMAIN}`
  : `https://${BUCKET}.s3.amazonaws.com`;

export type S3Folder = 'dogs' | 'kennels' | 'breeders' | 'registrations' | 'health';

export interface PresignedUpload {
  uploadUrl: string;
  s3Key: string;
  publicUrl: string;
}

export async function getPresignedUploadUrl(
  folder: S3Folder,
  filename: string,
  contentType: string,
  expiresIn = 300,
): Promise<PresignedUpload> {
  const ext    = filename.split('.').pop() ?? 'bin';
  const s3Key  = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const cmd    = new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn });
  return { uploadUrl, s3Key, publicUrl: `${CDN}/${s3Key}` };
}

export async function deleteS3Object(s3Key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
}

export function cdnUrl(s3Key: string): string {
  return `${CDN}/${s3Key}`;
}
