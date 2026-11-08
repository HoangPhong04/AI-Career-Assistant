require("dotenv").config();

console.log({
  endpoint: Boolean(process.env.S3_ENDPOINT),
  region: process.env.S3_REGION,
  bucket: process.env.S3_BUCKET_NAME,
  accessKey: Boolean(process.env.S3_ACCESS_KEY_ID),
  secretKey: Boolean(process.env.S3_SECRET_ACCESS_KEY),
});