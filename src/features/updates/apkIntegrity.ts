/**
 * features/updates/apkIntegrity — corruption checks for downloaded APK installers.
 *
 * A truncated or bit-corrupted APK fails at install time with a generic
 * "parsing the package" error. Verify BEFORE launching the installer:
 *  1. exact byte size vs the GitHub release asset size
 *  2. ZIP structure (APK is a ZIP): local-file-header magic + End Of
 *     Central Directory record pointing inside the file
 *  3. SHA-256 digest vs the GitHub asset `digest` field ("sha256:<hex>"),
 *     hashed incrementally in 4MB chunks so a ~130MB APK never sits
 *     fully in memory.
 *
 * All reads use positioned `FileHandle` reads — no full-file buffering.
 */

import { isWeb } from '@platform'
import { File } from '@disk'
import { log } from '@log'

export interface ApkIntegrityOptions {
	/** Exact expected byte size from the release asset (0/undefined = unknown). */
	expectedSize?: number
	/** Expected digest from the release asset, e.g. "sha256:4ead...". Null = skip. */
	digest?: string | null
}

export interface ApkIntegrityResult {
	ok: boolean
	reason?: string
}

export interface ApkVerifyProgress {
	phase: 'size' | 'zip' | 'digest'
	bytesHashed?: number
	totalBytes?: number
}

const MIN_APK_BYTES = 1024 * 1024
// 2MB chunks: each chunk blocks the JS thread briefly for read+hash,
// then yields so the UI stays responsive during verification.
const HASH_CHUNK_BYTES = 2 * 1024 * 1024
// EOCD record is 22 bytes; it can be preceded by a comment of up to 65535 bytes.
const EOCD_SCAN_BYTES = 22 + 65535 + 16

// ── Positioned chunk reads ───────────────────────────────────────────────────

/** Read `length` bytes at `offset` without loading the whole file. */
export const readFileChunk = async (fileUri: string, offset: number, length: number): Promise<Uint8Array> => {
	if (isWeb) throw new Error('file chunk reads are not supported on web')
	let FileMode: any = null
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		FileMode = require('expo-file-system').FileMode
	} catch {}
	const file = new File(fileUri)
	const handle = file.open(FileMode?.ReadOnly ?? ('r' as any))
	try {
		handle.offset = offset
		return handle.readBytes(length) as unknown as Uint8Array
	} finally {
		try {
			handle.close()
		} catch {}
	}
}

// ── 1. Size check ────────────────────────────────────────────────────────────

export const verifyApkSize = async (fileUri: string, expectedSize?: number): Promise<ApkIntegrityResult> => {
	try {
		const file = new File(fileUri)
		if (!file.exists) return { ok: false, reason: 'file not found' }
		const size = file.size ?? 0
		if (size < MIN_APK_BYTES) return { ok: false, reason: `size ${size} bytes < 1MB (truncated)` }
		if (expectedSize && expectedSize > 0 && size !== expectedSize) {
			return { ok: false, reason: `size ${size}/${expectedSize} mismatch (incomplete)` }
		}
		return { ok: true }
	} catch (err) {
		log({ level: 'warn', label: 'apkIntegrity', message: 'Size verification failed', error: err })
		return { ok: false, reason: 'size check error' }
	}
}

// ── 2. ZIP structure check ───────────────────────────────────────────────────

const EOCD_SIG = 0x06054b50
const LFH_SIG = 0x04034b50

const readU32LE = (b: Uint8Array, o: number): number => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0
const readU16LE = (b: Uint8Array, o: number): number => b[o] | (b[o + 1] << 8)

/**
 * Locate and validate the End Of Central Directory record inside `tail`
 * (the last bytes of the file). Pure — unit-testable without a device.
 */
export const findAndValidateEocd = (tail: Uint8Array, fileSize: number): { ok: boolean; reason?: string } => {
	// Scan backwards: EOCD signature may sit up to 65535 (comment) + 22 bytes from EOF.
	for (let i = tail.length - 22; i >= 0; i--) {
		if (readU32LE(tail, i) !== EOCD_SIG) continue
		const cdSize = readU32LE(tail, i + 12)
		const cdOffset = readU32LE(tail, i + 16)
		const commentLen = readU16LE(tail, i + 20)
		// The record must end exactly at EOF: i + 22 + commentLen === tail.length
		if (i + 22 + commentLen !== tail.length) continue
		if (cdOffset + cdSize > fileSize) return { ok: false, reason: 'central directory extends past EOF (truncated)' }
		if (cdSize === 0 || cdOffset === 0) return { ok: false, reason: 'empty central directory' }
		return { ok: true }
	}
	return { ok: false, reason: 'end-of-central-directory not found (truncated)' }
}

export const verifyApkZipStructure = async (fileUri: string): Promise<ApkIntegrityResult> => {
	try {
		const file = new File(fileUri)
		if (!file.exists) return { ok: false, reason: 'file not found' }
		const size = file.size ?? 0
		if (size < 22) return { ok: false, reason: 'file too small for ZIP structure' }
		const head = await readFileChunk(fileUri, 0, 4)
		if (readU32LE(head, 0) !== LFH_SIG) return { ok: false, reason: 'missing APK/ZIP header (corrupted head)' }
		const tailLen = Math.min(size, EOCD_SCAN_BYTES)
		const tail = await readFileChunk(fileUri, size - tailLen, tailLen)
		return findAndValidateEocd(tail, size)
	} catch (err) {
		log({ level: 'warn', label: 'apkIntegrity', message: 'ZIP structure verification failed', error: err })
		return { ok: false, reason: 'ZIP check error' }
	}
}

// ── 3. Incremental SHA-256 ───────────────────────────────────────────────────

const SHA256_K = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n))

// Reused message-schedule buffer: avoids ~2M allocations when hashing a ~130MB APK.
const SHA_W = new Int32Array(64)

/** Minimal incremental SHA-256 (FIPS 180-4) to hash large files in chunks. */
export class IncrementalSha256 {
	private h0 = 0x6a09e667
	private h1 = 0xbb67ae85
	private h2 = 0x3c6ef372
	private h3 = 0xa54ff53a
	private h4 = 0x510e527f
	private h5 = 0x9b05688c
	private h6 = 0x1f83d9ab
	private h7 = 0x5be0cd19
	private readonly block = new Uint8Array(64)
	private blockLen = 0
	private lo = 0 // total bit length, low 32 bits
	private hi = 0 // total bit length, high 32 bits

	update(data: Uint8Array): void {
		let off = 0
		// Track total bit length (APKs are far below 2^32 bits, but stay correct).
		const bits = data.length * 8
		const newLo = this.lo + bits
		if (newLo > 0xffffffff) this.hi = (this.hi + 1) >>> 0
		this.lo = newLo >>> 0
		while (off < data.length) {
			const take = Math.min(64 - this.blockLen, data.length - off)
			this.block.set(data.subarray(off, off + take), this.blockLen)
			this.blockLen += take
			off += take
			if (this.blockLen === 64) {
				this.compress()
				this.blockLen = 0
			}
		}
	}

	private compress(): void {
		const w = SHA_W
		const blk = this.block
		w[0] = (blk[0] << 24) | (blk[1] << 16) | (blk[2] << 8) | blk[3]
		w[1] = (blk[4] << 24) | (blk[5] << 16) | (blk[6] << 8) | blk[7]
		w[2] = (blk[8] << 24) | (blk[9] << 16) | (blk[10] << 8) | blk[11]
		w[3] = (blk[12] << 24) | (blk[13] << 16) | (blk[14] << 8) | blk[15]
		w[4] = (blk[16] << 24) | (blk[17] << 16) | (blk[18] << 8) | blk[19]
		w[5] = (blk[20] << 24) | (blk[21] << 16) | (blk[22] << 8) | blk[23]
		w[6] = (blk[24] << 24) | (blk[25] << 16) | (blk[26] << 8) | blk[27]
		w[7] = (blk[28] << 24) | (blk[29] << 16) | (blk[30] << 8) | blk[31]
		w[8] = (blk[32] << 24) | (blk[33] << 16) | (blk[34] << 8) | blk[35]
		w[9] = (blk[36] << 24) | (blk[37] << 16) | (blk[38] << 8) | blk[39]
		w[10] = (blk[40] << 24) | (blk[41] << 16) | (blk[42] << 8) | blk[43]
		w[11] = (blk[44] << 24) | (blk[45] << 16) | (blk[46] << 8) | blk[47]
		w[12] = (blk[48] << 24) | (blk[49] << 16) | (blk[50] << 8) | blk[51]
		w[13] = (blk[52] << 24) | (blk[53] << 16) | (blk[54] << 8) | blk[55]
		w[14] = (blk[56] << 24) | (blk[57] << 16) | (blk[58] << 8) | blk[59]
		w[15] = (blk[60] << 24) | (blk[61] << 16) | (blk[62] << 8) | blk[63]
		for (let i = 16; i < 64; i++) {
			const x15 = w[i - 15]
			const x2 = w[i - 2]
			const s0 = (rotr(x15, 7) ^ rotr(x15, 18) ^ (x15 >>> 3)) | 0
			const s1 = (rotr(x2, 17) ^ rotr(x2, 19) ^ (x2 >>> 10)) | 0
			w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
		}
		let a = this.h0
		let b = this.h1
		let c = this.h2
		let d = this.h3
		let e = this.h4
		let f = this.h5
		let g = this.h6
		let h = this.h7
		for (let i = 0; i < 64; i++) {
			const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) | 0
			const ch = ((e & f) ^ (~e & g)) | 0
			const t1 = (h + S1 + ch + SHA256_K[i] + w[i]) | 0
			const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) | 0
			const maj = ((a & b) ^ (a & c) ^ (b & c)) | 0
			const t2 = (S0 + maj) | 0
			h = g
			g = f
			f = e
			e = (d + t1) | 0
			d = c
			c = b
			b = a
			a = (t1 + t2) | 0
		}
		this.h0 = (this.h0 + a) | 0
		this.h1 = (this.h1 + b) | 0
		this.h2 = (this.h2 + c) | 0
		this.h3 = (this.h3 + d) | 0
		this.h4 = (this.h4 + e) | 0
		this.h5 = (this.h5 + f) | 0
		this.h6 = (this.h6 + g) | 0
		this.h7 = (this.h7 + h) | 0
	}

	digestHex(): string {
		// Padding: 0x80, zeros, then 64-bit big-endian bit length.
		const padLen = this.blockLen < 56 ? 56 - this.blockLen : 120 - this.blockLen
		const pad = new Uint8Array(padLen + 8)
		pad[0] = 0x80
		const view = new DataView(pad.buffer)
		view.setUint32(padLen, this.hi)
		view.setUint32(padLen + 4, this.lo)
		this.update(pad)
		const out = [this.h0, this.h1, this.h2, this.h3, this.h4, this.h5, this.h6, this.h7]
		return out.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('')
	}
}

const yieldToLoop = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

export const hashFileSha256 = async (fileUri: string, onProgress?: (bytesHashed: number, totalBytes: number) => void): Promise<string> => {
	const file = new File(fileUri)
	const size = file.size ?? 0
	if (size <= 0) throw new Error('cannot hash empty/missing file')
	const hasher = new IncrementalSha256()
	let hashed = 0
	while (hashed < size) {
		const chunk = await readFileChunk(fileUri, hashed, Math.min(HASH_CHUNK_BYTES, size - hashed))
		if (chunk.length === 0) throw new Error(`short read at offset ${hashed}`)
		hasher.update(chunk)
		hashed += chunk.length
		onProgress?.(hashed, size)
		await yieldToLoop()
	}
	return hasher.digestHex()
}

export const verifyApkDigest = async (fileUri: string, digest?: string | null, onProgress?: (bytesHashed: number, totalBytes: number) => void): Promise<ApkIntegrityResult> => {
	try {
		if (!digest) return { ok: true }
		const match = digest.match(/^sha256:([0-9a-fA-F]{64})$/)
		if (!match) {
			log({ level: 'warn', label: 'apkIntegrity', message: `Unsupported digest format, skipping: ${digest.slice(0, 20)}…` })
			return { ok: true }
		}
		const actual = await hashFileSha256(fileUri, onProgress)
		if (actual.toLowerCase() !== match[1].toLowerCase()) {
			return { ok: false, reason: 'SHA-256 mismatch (corrupted)' }
		}
		return { ok: true }
	} catch (err) {
		log({ level: 'warn', label: 'apkIntegrity', message: 'Digest verification failed', error: err })
		return { ok: false, reason: 'digest check error' }
	}
}

// ── Combined gate ────────────────────────────────────────────────────────────

export const verifyApkFile = async (fileUri: string, options: ApkIntegrityOptions, onProgress?: (p: ApkVerifyProgress) => void): Promise<ApkIntegrityResult> => {
	onProgress?.({ phase: 'size' })
	const sizeCheck = await verifyApkSize(fileUri, options.expectedSize)
	if (!sizeCheck.ok) return sizeCheck
	onProgress?.({ phase: 'zip' })
	const zipCheck = await verifyApkZipStructure(fileUri)
	if (!zipCheck.ok) return zipCheck
	onProgress?.({ phase: 'digest' })
	const digestCheck = await verifyApkDigest(fileUri, options.digest, (bytesHashed, totalBytes) => onProgress?.({ phase: 'digest', bytesHashed, totalBytes }))
	if (!digestCheck.ok) return digestCheck
	return { ok: true }
}
