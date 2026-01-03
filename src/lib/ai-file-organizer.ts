// AI-based file categorization and tagging service
import type { FileInfo } from './types';

export type FileCategory = 
  | 'images' 
  | 'documents' 
  | 'code' 
  | 'media' 
  | 'archive' 
  | 'data' 
  | 'other';

export interface FileAnalysis {
  category: FileCategory;
  tags: string[];
  confidence: number;
  isSensitive: boolean;
}

export class AIFileOrganizer {
  // MIME type to category mapping
  private mimeMap = {
    'image/': 'images',
    'video/': 'media',
    'audio/': 'media',
    'application/pdf': 'documents',
    'application/msword': 'documents',
    'application/vnd.openxmlformats-officedocument': 'documents',
    'text/plain': 'documents',
    'application/zip': 'archive',
    'application/x-rar': 'archive',
    'application/x-7z-compressed': 'archive',
    'application/json': 'data',
    'text/csv': 'data',
    'application/xml': 'data',
  };

  // Code file extensions
  private codeExtensions = [
    '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c',
    '.cs', '.rb', '.go', '.rs', '.php', '.swift', '.kt', '.scala',
    '.html', '.css', '.scss', '.less', '.vue', '.json', '.yaml',
  ];

  // Sensitive file patterns
  private sensitivePatterns = [
    /password|secret|key|token|credential|auth|private/i,
    /config|setting|env|\.env/i,
    /backup|archive|sensitive/i,
    /financial|bank|ssn|tax/i,
    /health|medical|personal/i,
  ];

  /**
   * Analyze a file and return categorization & tags
   */
  analyzeFile(file: FileInfo): FileAnalysis {
    const category = this.categorizeFile(file);
    const tags = this.generateTags(file, category);
    const isSensitive = this.detectSensitive(file);
    const confidence = this.calculateConfidence(file, category);

    return { category, tags, confidence, isSensitive };
  }

  /**
   * Categorize file based on MIME type and name
   */
  private categorizeFile(file: FileInfo): FileCategory {
    const mime = file.mimeType || '';
    const name = file.name.toLowerCase();

    // Check MIME type mappings
    for (const [mimePattern, category] of Object.entries(this.mimeMap)) {
      if (mime.startsWith(mimePattern)) {
        return category as FileCategory;
      }
    }

    // Check code extensions
    if (this.codeExtensions.some(ext => name.endsWith(ext))) {
      return 'code';
    }

    return 'other';
  }

  /**
   * Generate intelligent tags based on file analysis
   */
  private generateTags(file: FileInfo, category: FileCategory): string[] {
    const tags: string[] = [category];
    const name = file.name.toLowerCase();

    // Add category-specific tags
    switch (category) {
      case 'images':
        tags.push('media', 'visual');
        if (file.size && file.size > 5 * 1024 * 1024) tags.push('large');
        break;
      case 'documents':
        tags.push('content');
        if (name.includes('report')) tags.push('report');
        if (name.includes('contract')) tags.push('contract');
        if (name.includes('proposal')) tags.push('proposal');
        break;
      case 'code':
        tags.push('development', 'source');
        const ext = name.split('.').pop();
        if (ext) tags.push(ext);
        break;
      case 'media':
        tags.push('playable');
        if (name.includes('video')) tags.push('video');
        if (name.includes('audio')) tags.push('audio');
        break;
      case 'archive':
        tags.push('compressed', 'packaged');
        break;
      case 'data':
        tags.push('structured', 'dataset');
        break;
    }

    // Add date-based tags
    if (file.uploadedAt) {
      const date = new Date(file.uploadedAt);
      tags.push(`year:${date.getFullYear()}`);
      tags.push(`month:${date.getMonth() + 1}`);
    }

    // Add size-based tags
    if (file.size) {
      if (file.size < 1024 * 1024) tags.push('small');
      if (file.size > 100 * 1024 * 1024) tags.push('large');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Detect if file is sensitive/private
   */
  private detectSensitive(file: FileInfo): boolean {
    const name = file.name.toLowerCase();
    return this.sensitivePatterns.some(pattern => pattern.test(name));
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(file: FileInfo, category: FileCategory): number {
    let confidence = 85;

    if (file.mimeType) confidence += 10;
    if (category !== 'other') confidence += 5;

    return Math.min(100, confidence);
  }

  /**
   * Batch analyze multiple files
   */
  async batchAnalyze(files: FileInfo[]): Promise<Map<string, FileAnalysis>> {
    const results = new Map<string, FileAnalysis>();
    for (const file of files) {
      results.set(file.name, this.analyzeFile(file));
    }
    return results;
  }

  /**
   * Get files by category
   */
  filterByCategory(files: FileInfo[], category: FileCategory): FileInfo[] {
    return files.filter(file => {
      const analysis = this.analyzeFile(file);
      return analysis.category === category;
    });
  }

  /**
   * Get files by tag
   */
  filterByTag(files: FileInfo[], tag: string): FileInfo[] {
    return files.filter(file => {
      const analysis = this.analyzeFile(file);
      return analysis.tags.includes(tag);
    });
  }
}

export const fileOrganizer = new AIFileOrganizer();
