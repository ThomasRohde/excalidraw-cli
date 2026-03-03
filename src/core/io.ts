import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { ioError, errorMessage } from "./errors.js";

export interface ReadResult {
  content: string;
  source: string;
}

export async function readInput(fileOrDash: string): Promise<ReadResult> {
  if (fileOrDash === "-") {
    return readStdin();
  }
  try {
    const content = await readFile(fileOrDash, "utf-8");
    return { content, source: fileOrDash };
  } catch (err: unknown) {
    const msg = errorMessage(err);
    throw ioError("READ_FAILED", `Failed to read file: ${fileOrDash}: ${msg}`, {
      path: fileOrDash,
    });
  }
}

async function readStdin(): Promise<ReadResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
      resolve({
        content: Buffer.concat(chunks).toString("utf-8"),
        source: "stdin",
      });
    });
    process.stdin.on("error", (err) => {
      reject(ioError("STDIN_FAILED", `Failed to read stdin: ${err.message}`));
    });
  });
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function writeOutput(path: string, data: string | Buffer): Promise<void> {
  try {
    await ensureDir(dirname(path));
    const tmpPath = join(dirname(path), `.tmp_${randomBytes(4).toString("hex")}`);
    await writeFile(tmpPath, data);
    await rename(tmpPath, path);
  } catch (err: unknown) {
    const msg = errorMessage(err);
    throw ioError("WRITE_FAILED", `Failed to write file: ${path}: ${msg}`, {
      path,
    });
  }
}
