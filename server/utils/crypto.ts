import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
// 32 bytes, générée une fois et stockée en env (jamais en dur dans le code)
const config = useRuntimeConfig()
const KEY = Buffer.from(config.encryptionKey, 'hex')

export function encrypt(text: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv(ALGORITHM, KEY, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    // on concatène iv + authTag + données chiffrées pour tout stocker en une seule string
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decrypt(encryptedText: string): string {
    const data = Buffer.from(encryptedText, 'base64')
    const iv = data.subarray(0, 12)
    const authTag = data.subarray(12, 28)
    const encrypted = data.subarray(28)

    const decipher = createDecipheriv(ALGORITHM, KEY, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}