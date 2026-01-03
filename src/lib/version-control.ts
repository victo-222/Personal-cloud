// Git-like version control service for files
import type { FileInfo } from './types';

export interface FileVersion {
  versionId: string;
  fileId: string;
  fileName: string;
  size: number;
  hash: string;
  author: string;
  message: string;
  createdAt: Date;
  previousVersionId?: string;
  changeType: 'created' | 'modified' | 'restored';
  metadata?: Record<string, unknown>;
}

export interface VersionHistory {
  fileId: string;
  fileName: string;
  versions: FileVersion[];
  currentVersionId: string;
  totalVersions: number;
}

export interface VersionDiff {
  versionIdA: string;
  versionIdB: string;
  filePath: string;
  sizeChangeBytes: number;
  sizeChangePercent: number;
  addedLines?: number;
  removedLines?: number;
  modifiedLines?: number;
}

export class VersionControlService {
  private versions = new Map<string, FileVersion[]>();
  private currentVersions = new Map<string, string>();

  /**
   * Create initial version of a file
   */
  createVersion(
    fileId: string,
    file: FileInfo,
    author: string,
    message: string = 'Initial version'
  ): FileVersion {
    const version: FileVersion = {
      versionId: this.generateVersionId(),
      fileId,
      fileName: file.name,
      size: file.size || 0,
      hash: this.generateFileHash(file),
      author,
      message,
      createdAt: new Date(),
      changeType: 'created',
    };

    const versions = this.versions.get(fileId) || [];
    versions.push(version);
    this.versions.set(fileId, versions);
    this.currentVersions.set(fileId, version.versionId);

    return version;
  }

  /**
   * Create new version after file modification
   */
  commitVersion(
    fileId: string,
    file: FileInfo,
    author: string,
    message: string
  ): FileVersion {
    const versions = this.versions.get(fileId) || [];
    const previousVersion = versions.length > 0 ? versions[versions.length - 1] : undefined;

    const newVersion: FileVersion = {
      versionId: this.generateVersionId(),
      fileId,
      fileName: file.name,
      size: file.size || 0,
      hash: this.generateFileHash(file),
      author,
      message,
      createdAt: new Date(),
      previousVersionId: previousVersion?.versionId,
      changeType: 'modified',
    };

    versions.push(newVersion);
    this.versions.set(fileId, versions);
    this.currentVersions.set(fileId, newVersion.versionId);

    return newVersion;
  }

  /**
   * Get version history for a file
   */
  getVersionHistory(fileId: string): VersionHistory | null {
    const versions = this.versions.get(fileId);
    if (!versions || versions.length === 0) return null;

    const currentVersionId = this.currentVersions.get(fileId);
    const fileName = versions[0].fileName;

    return {
      fileId,
      fileName,
      versions,
      currentVersionId: currentVersionId || versions[versions.length - 1].versionId,
      totalVersions: versions.length,
    };
  }

  /**
   * Get specific version
   */
  getVersion(fileId: string, versionId: string): FileVersion | undefined {
    const versions = this.versions.get(fileId);
    return versions?.find(v => v.versionId === versionId);
  }

  /**
   * Restore file to specific version
   */
  restoreVersion(
    fileId: string,
    versionId: string,
    author: string
  ): FileVersion | null {
    const targetVersion = this.getVersion(fileId, versionId);
    if (!targetVersion) return null;

    const versions = this.versions.get(fileId) || [];

    // Create restoration version
    const restoredVersion: FileVersion = {
      versionId: this.generateVersionId(),
      fileId,
      fileName: targetVersion.fileName,
      size: targetVersion.size,
      hash: targetVersion.hash,
      author,
      message: `Restored from version ${versionId.substring(0, 7)}`,
      createdAt: new Date(),
      previousVersionId: versions[versions.length - 1]?.versionId,
      changeType: 'restored',
    };

    versions.push(restoredVersion);
    this.versions.set(fileId, versions);
    this.currentVersions.set(fileId, restoredVersion.versionId);

    return restoredVersion;
  }

  /**
   * Get diff between two versions
   */
  getDiff(fileId: string, versionIdA: string, versionIdB: string): VersionDiff {
    const versionA = this.getVersion(fileId, versionIdA);
    const versionB = this.getVersion(fileId, versionIdB);

    if (!versionA || !versionB) {
      throw new Error('One or both versions not found');
    }

    const sizeChangeBytes = versionB.size - versionA.size;
    const sizeChangePercent =
      versionA.size > 0 ? (sizeChangeBytes / versionA.size) * 100 : 0;

    return {
      versionIdA,
      versionIdB,
      filePath: versionB.fileName,
      sizeChangeBytes,
      sizeChangePercent,
    };
  }

  /**
   * Get all changes for a file
   */
  getChangelog(fileId: string): Array<{
    version: FileVersion;
    changesSummary: string;
  }> {
    const versions = this.versions.get(fileId) || [];
    return versions.map((version, index) => {
      let changesSummary = version.message;

      if (index > 0) {
        const prevVersion = versions[index - 1];
        const sizeDiff = version.size - prevVersion.size;
        changesSummary += ` (${sizeDiff > 0 ? '+' : ''}${sizeDiff} bytes)`;
      }

      return { version, changesSummary };
    });
  }

  /**
   * Compare two versions and show unified diff
   */
  getUnifiedDiff(
    fileId: string,
    versionIdA: string,
    versionIdB: string
  ): VersionDiff {
    return this.getDiff(fileId, versionIdA, versionIdB);
  }

  /**
   * Prune old versions (keep only last N versions)
   */
  pruneVersions(fileId: string, keepCount: number = 10): number {
    const versions = this.versions.get(fileId);
    if (!versions || versions.length <= keepCount) return 0;

    const removed = versions.length - keepCount;
    const kept = versions.slice(-keepCount);
    this.versions.set(fileId, kept);

    return removed;
  }

  /**
   * Export version as JSON
   */
  exportVersion(fileId: string, versionId: string): string {
    const version = this.getVersion(fileId, versionId);
    if (!version) throw new Error('Version not found');

    return JSON.stringify(version, null, 2);
  }

  /**
   * Get version statistics
   */
  getVersionStats(fileId: string): {
    totalVersions: number;
    totalSize: number;
    oldestVersion: Date | null;
    newestVersion: Date | null;
    authorCount: number;
    authors: string[];
  } {
    const versions = this.versions.get(fileId) || [];
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        totalSize: 0,
        oldestVersion: null,
        newestVersion: null,
        authorCount: 0,
        authors: [],
      };
    }

    const authors = [...new Set(versions.map(v => v.author))];
    const totalSize = versions.reduce((sum, v) => sum + v.size, 0);

    return {
      totalVersions: versions.length,
      totalSize,
      oldestVersion: versions[0]?.createdAt || null,
      newestVersion: versions[versions.length - 1]?.createdAt || null,
      authorCount: authors.length,
      authors,
    };
  }

  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `v${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate hash for file (simple simulation)
   */
  private generateFileHash(file: FileInfo): string {
    const data = `${file.name}${file.size}${file.uploadedAt}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Clear all versions for testing
   */
  clearAll(): void {
    this.versions.clear();
    this.currentVersions.clear();
  }
}

export const versionControlService = new VersionControlService();
