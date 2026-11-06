// lib/cv/cv-storage.ts
// Refactored to use S3 (MinIO) storage instead of local filesystem.

import { randomUUID } from "node:crypto";
import { uploadFileToS3, deleteFileFromS3 } from "@/lib/storage/s3";

export type CVExtension = ".pdf" | ".docx";

export interface SavedCVFile {
  filePath: string; // S3 key stored in DB
  absolutePath: string; // alias for S3 key (kept for compatibility)
  storedFileName: string;
}

/**
 * Save an uploaded CV file to S3.
 * Returns the S3 key as both `filePath` and `absolutePath` for backward compatibility.
 */
export async function saveCVFile(
  file: File,
  extension: CVExtension
): Promise<SavedCVFile> {
  const storedFileName = `${randomUUID()}${extension}`;
  const key = `cvs/${storedFileName}`; // S3 object key
  const buffer = Buffer.from(await file.arrayBuffer());
  // Use the original MIME type from the uploaded File object.
  await uploadFileToS3(key, buffer, file.type);
  return {
    filePath: key,
    absolutePath: key,
    storedFileName,
  };
}

/**
 * Delete a CV file from S3 given its stored key.
 */
export async function deleteCVFile(absolutePath: string): Promise<void> {
  await deleteFileFromS3(absolutePath);
}
