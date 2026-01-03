// File encryption service for sensitive documents
import type { FileInfo } from './types';

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'AES-256-CBC';
  keyDerivation: 'PBKDF2' | 'Argon2';
}

export interface EncryptedFileMetadata {
  fileName: string;
  originalSize: number;
  encryptedSize: number;
  algorithm: string;
  keyDerivation: string;
  salt: string;
  iv: string;
  authTag?: string;
  encryptedAt: Date;
  fingerprint: string;
}

export class FileEncryptionService {
  private config: EncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
  };

  /**
   * Generate encryption key from password using PBKDF2
   */
  async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array,
    iterations: number = 100000
  ): Promise<CryptoKey> {
    // Import password as key
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a random salt
   */
  generateSalt(length: number = 32): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Generate a random IV
   */
  generateIV(length: number = 12): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Encrypt file data with password
   */
  async encryptFile(
    fileData: ArrayBuffer,
    password: string
  ): Promise<{
    encrypted: ArrayBuffer;
    metadata: EncryptedFileMetadata;
    originalFileName: string;
  }> {
    const salt = this.generateSalt();
    const iv = this.generateIV();

    // Derive key from password
    const key = await this.deriveKeyFromPassword(password, salt);

    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      fileData
    );

    // Generate fingerprint of original data
    const fingerprint = await this.generateFingerprint(fileData);

    const metadata: EncryptedFileMetadata = {
      fileName: 'encrypted.bin',
      originalSize: fileData.byteLength,
      encryptedSize: encrypted.byteLength,
      algorithm: this.config.algorithm,
      keyDerivation: this.config.keyDerivation,
      salt: this.arrayBufferToBase64(salt),
      iv: this.arrayBufferToBase64(iv),
      encryptedAt: new Date(),
      fingerprint: fingerprint,
    };

    return {
      encrypted,
      metadata,
      originalFileName: 'encrypted.bin',
    };
  }

  /**
   * Decrypt file data with password
   */
  async decryptFile(
    encryptedData: ArrayBuffer,
    password: string,
    metadata: EncryptedFileMetadata
  ): Promise<ArrayBuffer> {
    const salt = this.base64ToArrayBuffer(metadata.salt);
    const iv = this.base64ToArrayBuffer(metadata.iv);

    // Derive key from password
    const key = await this.deriveKeyFromPassword(password, new Uint8Array(salt));

    try {
      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        encryptedData
      );

      // Verify fingerprint
      const newFingerprint = await this.generateFingerprint(decrypted);
      if (newFingerprint !== metadata.fingerprint) {
        throw new Error('File integrity check failed');
      }

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate SHA-256 fingerprint of data
   */
  private async generateFingerprint(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Check if file should be encrypted automatically
   */
  shouldEncryptFile(fileName: string, isSensitive: boolean): boolean {
    const sensitiveExtensions = [
      '.key', '.pem', '.pfx', '.p12', '.env',
      '.config', '.conf', '.secret', '.credentials',
    ];

    const nameMatch = sensitiveExtensions.some(ext =>
      fileName.toLowerCase().endsWith(ext)
    );

    return isSensitive || nameMatch;
  }

  /**
   * Batch encrypt multiple files
   */
  async batchEncrypt(
    files: Array<{ data: ArrayBuffer; name: string }>,
    password: string
  ): Promise<Array<{
    encrypted: ArrayBuffer;
    metadata: EncryptedFileMetadata;
  }>> {
    const results = [];
    for (const file of files) {
      const result = await this.encryptFile(file.data, password);
      result.metadata.fileName = file.name;
      results.push({
        encrypted: result.encrypted,
        metadata: result.metadata,
      });
    }
    return results;
  }

  /**
   * Validate encryption metadata
   */
  validateMetadata(metadata: EncryptedFileMetadata): boolean {
    return (
      metadata.fileName &&
      metadata.originalSize > 0 &&
      metadata.salt &&
      metadata.iv &&
      metadata.fingerprint &&
      metadata.algorithm === this.config.algorithm
    );
  }
}

export const encryptionService = new FileEncryptionService();
