/**
 * File hashing utilities for hazo_files
 *
 * Uses xxHash for fast, non-cryptographic hashing optimized for change detection.
 * xxHash is significantly faster than SHA-256 while still providing good
 * collision resistance for file change detection purposes.
 *
 * Falls back to a simple checksum if xxhash-wasm is not available.
 */

/** File info containing hash and size */
export interface FileInfo {
  /** xxHash hash of the file content */
  file_hash: string;
  /** File size in bytes */
  file_size: number;
}

/** xxHash API interface */
interface XXHashAPI {
  h64Raw(inputBuffer: Uint8Array, seed?: bigint): bigint;
}

/** Cached xxhash instance */
let xxhashInstance: XXHashAPI | null = null;
let xxhashLoadAttempted = false;

/**
 * Try to load xxhash-wasm module
 * Returns null if not available
 */
async function loadXxhash(): Promise<XXHashAPI | null> {
  if (xxhashLoadAttempted) {
    return xxhashInstance;
  }

  xxhashLoadAttempted = true;

  try {
    // Dynamic import to handle cases where xxhash-wasm is not installed
    const xxhash = await import('xxhash-wasm');
    xxhashInstance = await xxhash.default();
    return xxhashInstance;
  } catch {
    // xxhash-wasm not available, will use fallback
    console.warn(
      '[hazo_files] xxhash-wasm not available, using fallback hash. ' +
        'Install xxhash-wasm for better performance: npm install xxhash-wasm'
    );
    return null;
  }
}

/**
 * Simple fallback hash using FNV-1a algorithm
 * Used when xxhash-wasm is not available
 */
function fnv1aHash(data: Uint8Array): string {
  // FNV-1a 64-bit hash
  let hash = BigInt('14695981039346656037');
  const prime = BigInt('1099511628211');

  for (let i = 0; i < data.length; i++) {
    hash ^= BigInt(data[i]);
    hash = BigInt.asUintN(64, hash * prime);
  }

  return hash.toString(16).padStart(16, '0');
}

/**
 * Compute a hash for a Buffer
 *
 * Uses xxHash (via xxhash-wasm) for fast change detection.
 * Falls back to FNV-1a if xxhash-wasm is not available.
 *
 * @param buffer - File content as a Buffer
 * @returns Hex string hash
 *
 * @example
 * ```typescript
 * const content = Buffer.from('Hello, World!');
 * const hash = await computeFileHash(content);
 * console.log(hash); // "d4a1185b5ca5f99a"
 * ```
 */
export async function computeFileHash(buffer: Buffer): Promise<string> {
  const xxhash = await loadXxhash();

  if (xxhash) {
    // Use xxHash 64-bit with h64Raw for Uint8Array input
    const uint8Array = new Uint8Array(buffer);
    const hash = xxhash.h64Raw(uint8Array);
    return hash.toString(16).padStart(16, '0');
  }

  // Fallback to FNV-1a
  return fnv1aHash(new Uint8Array(buffer));
}

/**
 * Compute hash synchronously (fallback only, no xxHash)
 *
 * Use this when you can't use async operations.
 * Note: This will always use the FNV-1a fallback, not xxHash.
 *
 * @param buffer - File content as a Buffer
 * @returns Hex string hash
 */
export function computeFileHashSync(buffer: Buffer): string {
  return fnv1aHash(new Uint8Array(buffer));
}

/**
 * Compute hash and size for a file
 *
 * @param buffer - File content as a Buffer
 * @returns Object with file_hash and file_size
 *
 * @example
 * ```typescript
 * const content = Buffer.from('Hello, World!');
 * const info = await computeFileInfo(content);
 * console.log(info);
 * // { file_hash: "d4a1185b5ca5f99a", file_size: 13 }
 * ```
 */
export async function computeFileInfo(buffer: Buffer): Promise<FileInfo> {
  const file_hash = await computeFileHash(buffer);
  const file_size = buffer.length;

  return { file_hash, file_size };
}

/**
 * Compute hash from a readable stream
 *
 * Reads the entire stream into memory to compute the hash.
 * For very large files, consider using a different approach.
 *
 * @param stream - ReadableStream of file content
 * @returns Promise resolving to hex string hash
 *
 * @example
 * ```typescript
 * const stream = fs.createReadStream('large-file.bin');
 * const hash = await computeFileHashFromStream(stream);
 * ```
 */
export async function computeFileHashFromStream(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Concatenate chunks into a single buffer
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const buffer = Buffer.alloc(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  return computeFileHash(buffer);
}

/**
 * Check if two hashes are equal
 *
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns True if hashes are equal
 */
export function hashesEqual(
  hash1: string | null | undefined,
  hash2: string | null | undefined
): boolean {
  if (!hash1 || !hash2) return false;
  return hash1.toLowerCase() === hash2.toLowerCase();
}

/**
 * Check if a file's content has changed by comparing hashes
 *
 * @param oldHash - Previously stored hash
 * @param newBuffer - New file content
 * @returns True if the file has changed
 *
 * @example
 * ```typescript
 * const storedHash = metadata.file_hash;
 * const newContent = await fs.readFile(path);
 * const hasChanged = await hasFileContentChanged(storedHash, newContent);
 * if (hasChanged) {
 *   console.log('File has been modified');
 * }
 * ```
 */
export async function hasFileContentChanged(
  oldHash: string | null | undefined,
  newBuffer: Buffer
): Promise<boolean> {
  if (!oldHash) return true; // No previous hash means we treat it as changed
  const newHash = await computeFileHash(newBuffer);
  return !hashesEqual(oldHash, newHash);
}
