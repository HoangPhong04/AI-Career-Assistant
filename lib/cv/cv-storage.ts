
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type CVExtension = ".pdf" | ".docx";

export interface SavedCVFile {
  filePath: string;
  absolutePath: string;
  storedFileName: string;
}

export async function saveCVFile(
  file: File,
  extension: CVExtension,
): Promise<SavedCVFile> {
  const storageDirectory = path.join(
    process.cwd(),
    "storage",
    "cvs",
  );

  await mkdir(storageDirectory, { recursive: true });

  const storedFileName = `${randomUUID()}${extension}`;
  const absolutePath = path.join(
    storageDirectory,
    storedFileName,
  );

  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(absolutePath, buffer, { flag: "wx" });

  return {
    filePath: path.posix.join("storage", "cvs", storedFileName),
    absolutePath,
    storedFileName,
  };
}

export async function deleteCVFile(
  absolutePath: string,
): Promise<void> {
  await unlink(absolutePath);
}
