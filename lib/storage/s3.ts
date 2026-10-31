import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || "us-east-1";
const accessKeyId = process.env.S3_ACCESS_KEY_ID!;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY!;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

export const s3BucketName = process.env.S3_BUCKET_NAME || "ai-career-assistant";

export const s3Client = new S3Client({
  region,
  endpoint: endpoint ? endpoint : undefined,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle, // Cần thiết khi kết nối MinIO
});

/**
 * Tải file lên S3
 */
export async function uploadFileToS3(
  key: string,
  buffer: Buffer,
  mimeType: string
) {
  const command = new PutObjectCommand({
    Bucket: s3BucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });
  await s3Client.send(command);
  return key;
}

/**
 * Lấy nội dung Buffer của file từ S3 để Parser đọc
 */
export async function getFileBufferFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: s3BucketName,
    Key: key,
  });
  const response = await s3Client.send(command);
  const byteArray = await response.Body?.transformToByteArray();
  if (!byteArray) throw new Error(`Không thể đọc file từ S3: ${key}`);
  return Buffer.from(byteArray);
}
export async function deleteFileFromS3(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: s3BucketName,
    Key: key,
  });
  await s3Client.send(command);
}
