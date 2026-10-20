import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.STORAGE_ENDPOINT;
const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  throw new Error("Storage environment variables are missing");
}

export const s3 = new S3Client({
  region: process.env.STORAGE_REGION ?? "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

export const bucket = process.env.STORAGE_BUCKET;

if (!bucket) {
  throw new Error("STORAGE_BUCKET is missing");
}
