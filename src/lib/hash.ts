const encoder = new TextEncoder()

export async function sha256Hex(payload: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available in this environment.')
  }

  const buffer = encoder.encode(payload)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(digest))

  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
