import "@/lib/polyfills/dommatrix";
import { getFileBufferFromS3 } from "@/lib/storage/s3";
import mammoth from "mammoth";
import { pathToFileURL } from "node:url";
import path from "path";
import { PDFParse } from "pdf-parse";
import { CanvasFactory } from "pdf-parse/worker";
export type CVParserErrorCode =
  | "FILE_NOT_FOUND"
  | "UNSUPPORTED_FORMAT"
  | "PASSWORD_PROTECTED"
  | "CORRUPTED_FILE"
  | "PARSE_FAILED"
  | "EMPTY_TEXT";
export class CVParserError extends Error {
  constructor(message: string, public code: CVParserErrorCode) {
    super(message);
    this.name = "CVParserError";
  }
}
export function normalizeCVText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Xóa ký tự điều khiển
    .replace(/[ \t]+/g, " ") // Gom khoảng trắng ngang
    .replace(/\n\s*\n\s*\n+/g, "\n\n") // Tối đa 2 dòng trống liên tiếp
    .trim();
}

export async function extractTextFormFile(key: string) {
  // key is the S3 object key (e.g., "cvs/uuid.pdf").
  // Attempt to retrieve the file from S3. If it does not exist, throw FILE_NOT_FOUND.
  let buffer: Buffer;
  try {
    buffer = await getFileBufferFromS3(key);
  } catch (err) {
    // The AWS SDK throws a generic error; map it to our CVParserError.
    throw new CVParserError(
      "CV file does not exist in S3 storage.",
      "FILE_NOT_FOUND"
    );
  }
  const ext = path.extname(key).toLocaleLowerCase();
  let rawText = "";
  try {
    if (ext === ".pdf") {
      const workerPath = pathToFileURL(
        path.join(
          process.cwd(),
          "node_modules",
          "pdfjs-dist",
          "legacy",
          "build",
          "pdf.worker.mjs"
        )
      ).href;

      PDFParse.setWorker(workerPath);

      const parser = new PDFParse({
        data: new Uint8Array(buffer),
        CanvasFactory,
      });

      try {
        const result = await parser.getText();
        rawText = result.text;
      } finally {
        await parser.destroy();
      }
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      throw new CVParserError(
        `Unsupported format: ${ext}`,
        "UNSUPPORTED_FORMAT"
      );
    }
  } catch (err: unknown) {
    if (err instanceof CVParserError) {
      throw err;
    }
    throw new CVParserError(
      `Failed to parse ${ext.toUpperCase()} file: ${(err as Error).message}`,
      "PARSE_FAILED"
    );
  }
  const cleanText = normalizeCVText(rawText);
  if (!cleanText || cleanText.length < 50) {
    throw new CVParserError(
      "The CV contains no extractable text. Scanned/image-based documents are not supported yet.",
      "EMPTY_TEXT"
    );
  }
  return cleanText;
}
