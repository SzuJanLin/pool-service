// lib/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import env from './env';

export const s3Client = new S3Client({
  region: 'auto', // R2 uses 'auto' as the region
  endpoint: env.r2.endpoint, // R2 endpoint URL
  credentials: {
    accessKeyId: env.r2.accessKeyId ?? '',
    secretAccessKey: env.r2.secretAccessKey ?? '',
  },
});

// Upload a file to R2 with company and customer organization
export async function uploadToR2(bucket: string, key: string, body: any, contentType?: string) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  
  const result = await s3Client.send(command);
  return result;
}

// Generate a signed URL for uploading a file to R2
export async function getSignedUploadUrl(bucket: string, key: string, expiresIn: number = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return await getSignedUrl(s3Client, command, {
    expiresIn, // Default 1 hour
  });
}

// Generate a signed URL for downloading/accessing a file from R2
export async function getSignedDownloadUrl(bucket: string, key: string, expiresIn: number = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return await getSignedUrl(s3Client, command, {
    expiresIn, // Default 1 hour
  });
}

// Delete a file from R2
export async function deleteFromR2(bucket: string, key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  const result = await s3Client.send(command);
  return result;
}

// Helper function to upload a file with proper content type detection
export async function uploadFileToR2(file: File, bucket: string, key: string) {
  const contentType = file.type || 'application/octet-stream';
  
  return await uploadToR2(bucket, key, file, contentType);
}

// Generate a company and customer organized key for uploaded files
export function generateCustomerPhotoKey(companyId: string, customerId: string, originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  
  // Structure: company/{companyId}/customers/{customerId}/photos/{timestamp}-{random}.{ext}
  return `company/${companyId}/customers/${customerId}/photos/${timestamp}-${randomString}.${extension}`;
}

// Generate a company organized key for general files
export function generateCompanyFileKey(companyId: string, prefix: string, originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  
  // Structure: company/{companyId}/{prefix}/{timestamp}-{random}.{ext}
  return `company/${companyId}/${prefix}/${timestamp}-${randomString}.${extension}`;
}

// Upload a customer photo with proper organization
export async function uploadCustomerPhoto(
  file: File, 
  companyId: string, 
  customerId: string, 
  bucket?: string
) {
  const targetBucket = bucket || env.r2.bucket;
  if (!targetBucket) {
    throw new Error('R2 bucket not configured');
  }

  const key = generateCustomerPhotoKey(companyId, customerId, file.name);
  const contentType = file.type || 'application/octet-stream';
  
  const result = await uploadToR2(targetBucket, key, file, contentType);
  
  return {
    key,
    url: `${env.r2.publicUrl || env.r2.endpoint}/${key}`,
    bucket: targetBucket,
    contentType,
    size: file.size,
    result
  };
}

// Upload a customer photo using a buffer (for server-side uploads)
export async function uploadCustomerPhotoBuffer(
  fileBuffer: Buffer,
  companyId: string,
  customerId: string,
  fileName: string,
  contentType: string,
  key?: string,
  bucket?: string
) {
  const targetBucket = bucket || env.r2.bucket;
  if (!targetBucket) {
    throw new Error('R2 bucket not configured');
  }

  const fileKey = key || generateCustomerPhotoKey(companyId, customerId, fileName);
  
  const result = await uploadToR2(targetBucket, fileKey, fileBuffer, contentType);
  
  return {
    key: fileKey,
    url: `${env.r2.publicUrl || env.r2.endpoint}/${fileKey}`,
    bucket: targetBucket,
    contentType,
    size: fileBuffer.length,
    result
  };
}

// Upload a company file with proper organization
export async function uploadCompanyFile(
  file: File, 
  companyId: string, 
  prefix: string,
  bucket?: string
) {
  const targetBucket = bucket || env.r2.bucket;
  if (!targetBucket) {
    throw new Error('R2 bucket not configured');
  }

  const key = generateCompanyFileKey(companyId, prefix, file.name);
  const contentType = file.type || 'application/octet-stream';
  
  const result = await uploadToR2(targetBucket, key, file, contentType);
  
  return {
    key,
    url: `${env.r2.publicUrl || env.r2.endpoint}/${key}`,
    bucket: targetBucket,
    contentType,
    size: file.size,
    result
  };
}

// Get signed upload URL for customer photos
export async function getCustomerPhotoUploadUrl(
  companyId: string, 
  customerId: string, 
  fileName: string,
  expiresIn: number = 3600,
  bucket?: string
) {
  const targetBucket = bucket || env.r2.bucket;
  if (!targetBucket) {
    throw new Error('R2 bucket not configured');
  }

  const key = generateCustomerPhotoKey(companyId, customerId, fileName);
  return await getSignedUploadUrl(targetBucket, key, expiresIn);
}

// Get signed download URL for customer photos
export async function getCustomerPhotoDownloadUrl(
  companyId: string, 
  customerId: string, 
  fileName: string,
  expiresIn: number = 3600 * 24 * 7, // 7 days default for viewing
  bucket?: string
) {
  const targetBucket = bucket || env.r2.bucket;
  if (!targetBucket) {
    throw new Error('R2 bucket not configured');
  }

  const key = generateCustomerPhotoKey(companyId, customerId, fileName);
  return await getSignedDownloadUrl(targetBucket, key, expiresIn);
}

// Delete a customer photo
export async function deleteCustomerPhoto(
  companyId: string, 
  customerId: string, 
  fileName: string,
  bucket?: string
) {
  const targetBucket = bucket || env.r2.bucket;
  if (!targetBucket) {
    throw new Error('R2 bucket not configured');
  }

  const key = generateCustomerPhotoKey(companyId, customerId, fileName);
  return await deleteFromR2(targetBucket, key);
}

// Legacy function names for backward compatibility
export const uploadToS3 = uploadToR2;
export const deleteFromS3 = deleteFromR2;
export const generateFileKey = generateCompanyFileKey;