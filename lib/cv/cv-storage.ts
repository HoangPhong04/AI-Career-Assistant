import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type CVExtension = ".pdf" | ".docx";

export interface SavedCVFile {
  filePath: string;
  absolutePath: string;
  storedFileName: string;
}

export async function saveCVFile(
  file: File,
  extension: CVExtension
): Promise<SavedCVFile> {
  const storageDirectory = path.join(process.cwd(), "storage", "cvs");

  await mkdir(storageDirectory, { recursive: true });

  const storedFileName = `${randomUUID()}${extension}`;
  const absolutePath = path.join(storageDirectory, storedFileName);

  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(absolutePath, buffer, { flag: "wx" });

  return {
    // filePath dùng POSIX separator để lưu DB như một identifier chuẩn hóa,
    // KHÔNG dùng trực tiếp để đọc/ghi file. Dùng absolutePath cho I/O.
    filePath: path.posix.join("storage", "cvs", storedFileName),
    absolutePath,
    storedFileName,
  };
}

export async function deleteCVFile(absolutePath: string): Promise<void> {
  await unlink(absolutePath);
}
