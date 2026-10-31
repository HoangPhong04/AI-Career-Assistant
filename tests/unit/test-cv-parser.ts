import fs from "node:fs/promises";
import path from "node:path";
import { CVParserError, extractTextFormFile } from "../../lib/cv/cv-parser";
import { validateCVFile } from "../../lib/cv/validate-cv-file";

async function runTests() {
  console.log("=== BẮT ĐẦU CHẠY TEST VALIDATION & PARSER CV ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. TEST VALIDATE FILE RỖNG
  const emptyFile = new File([new Uint8Array(0)], "empty.pdf", {
    type: "application/pdf",
  });
  const emptyVal = await validateCVFile(emptyFile);
  assert(
    !emptyVal.valid && emptyVal.code === "EMPTY_FILE",
    "Chặn file dung lượng 0 bytes"
  );

  // 2. TEST VALIDATE FILE QUÁ LỚN (> 5MB)
  const bigBuffer = new Uint8Array(5.1 * 1024 * 1024);
  const bigFile = new File([bigBuffer], "big.pdf", { type: "application/pdf" });
  const bigVal = await validateCVFile(bigFile);
  assert(
    !bigVal.valid && bigVal.code === "FILE_TOO_LARGE",
    "Chặn file dung lượng vượt 5 MB"
  );

  // 3. TEST VALIDATE SAI ĐỊNH DẠNG ĐUÔI
  const exeFile = new File([new Uint8Array([1, 2, 3])], "virus.exe", {
    type: "application/x-msdownload",
  });
  const exeVal = await validateCVFile(exeFile);
  assert(
    !exeVal.valid && exeVal.code === "INVALID_EXTENSION",
    "Chặn file không phải PDF/DOCX"
  );

  // 4. TEST VALIDATE MAGIC BYTES (File giả danh PDF)
  const fakePdf = new File(
    [new TextEncoder().encode("Hello World Fake PDF")],
    "fake.pdf",
    { type: "application/pdf" }
  );
  const fakeVal = await validateCVFile(fakePdf);
  assert(
    !fakeVal.valid && fakeVal.code === "INVALID_FILE_SIGNATURE",
    "Chặn file giả mạo định dạng PDF"
  );

  // 5. TEST PARSER VỚI FILE HỎNG
  const tempCorruptedPath = path.join(process.cwd(), "temp_corrupted.pdf");
  await fs.writeFile(
    tempCorruptedPath,
    Buffer.from("%PDF-1.4 Corrupted header content")
  );
  try {
    await extractTextFormFile(tempCorruptedPath);
    assert(false, "Parser phải phát hiện file hỏng");
  } catch (err) {
    assert(
      err instanceof CVParserError,
      "Parser bắt lỗi file hỏng không làm crash server"
    );
  } finally {
    await fs.unlink(tempCorruptedPath).catch(() => null);
  }

  console.log(`\n=== KẾT QUẢ: ${passed} Passed, ${failed} Failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
