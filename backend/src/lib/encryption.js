import crypto from 'crypto'

let derivedKey = null

function getDerivedKey() {
  if (!derivedKey) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required')
    }
    derivedKey = crypto.scryptSync(ENCRYPTION_KEY, 'live-pro-key-derivation', 32)
  }
  return derivedKey
}

/**
 * Encrypt a string using AES-256-GCM (authenticated encryption).
 * Returns format: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getDerivedKey(), iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

/**
 * Decrypt a string encrypted with AES-256-GCM.
 * Expects format: iv:authTag:ciphertext (all hex-encoded)
 */
export function decrypt(ciphertext) {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }
  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', getDerivedKey(), iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
