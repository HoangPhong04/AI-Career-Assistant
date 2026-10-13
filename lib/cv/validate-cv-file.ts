const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export type CVFileType = keyof typeof ALLOWED_TYPES;

export type CVFileValidationResult =
  | {
      valid: true;
      extension: CVFileType;
      mimeType: string;
    }
  | {
      valid: false;
      code:
        | "EMPTY_FILE"
        | "FILE_TOO_LARGE"
        | "INVALID_EXTENSION"
        | "INVALID_MIME_TYPE"
        | "INVALID_FILE_SIGNATURE";
      message: string;
    };

export async function validateCVFile(
  file: File
): Promise<CVFileValidationResult> {
  if (file.size === 0) {
    return {
      valid: false,
      code: "EMPTY_FILE",
      message: "File must not be empty.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      code: "FILE_TOO_LARGE",
      message: "File size must not exceed 5 MB.",
    };
  }
  const fileName = file.name.toLowerCase();
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return {
      valid: false,
      code: "INVALID_EXTENSION",
      message: "Only PDF and DOCX files are allowed.",
    };
  }
  const extension = fileName.slice(dotIndex);
  if (!(extension in ALLOWED_TYPES)) {
    return {
      valid: false,
      code: "INVALID_EXTENSION",
      message: "Only PDF and DOCX files are allowed.",
    };
  }

  const cvExtension = extension as CVFileType;
  const expectedMime = ALLOWED_TYPES[cvExtension];
  const GENERIC_BINARY_MIME = "application/octet-stream";
  if (file.type !== expectedMime && file.type !== GENERIC_BINARY_MIME) {
    return {
      valid: false,
      code: "INVALID_MIME_TYPE",
      message: "File MIME type does not match its extension.",
    };
  }

  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());

  let signatureValid = false;

  if (cvExtension === ".pdf") {
    signatureValid =
      header[0] === 0x25 && // %
      header[1] === 0x50 && // P
      header[2] === 0x44 && // D
      header[3] === 0x46; // F
  } else if (cvExtension === ".docx") {
    signatureValid =
      header[0] === 0x50 && // P
      header[1] === 0x4b; // K (ZIP)
  }

  if (!signatureValid) {
    return {
      valid: false,
      code: "INVALID_FILE_SIGNATURE",
      message: "File content does not match the declared format.",
    };
  }

  return {
    valid: true,
    extension: cvExtension,
    mimeType: expectedMime,
  };
}
