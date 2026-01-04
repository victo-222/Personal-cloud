// Drag and Drop File Management Service
// Handles file uploads via drag-and-drop with preview functionality

export interface FilePreview {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  preview?: string; // Data URL for preview
  previewType: 'image' | 'document' | 'video' | 'audio' | 'unknown';
  uploadProgress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
}

export interface FileUploadOptions {
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[]; // MIME types
  autoUpload?: boolean;
  onProgress?: (progress: number) => void;
  onComplete?: (file: FilePreview) => void;
  onError?: (error: string) => void;
}

export interface FilePreviewOptions {
  maxPreviewSize?: number; // in bytes
  previewDimensions?: {
    width: number;
    height: number;
  };
}

export class DragDropFileService {
  private uploadQueue: FilePreview[] = [];
  private activeUploads: Map<string, AbortController> = new Map();
  private filePreviewCache: Map<string, FilePreview> = new Map();

  constructor() {
    // Initialize service
  }

  // ============================================
  // FILE VALIDATION
  // ============================================

  /**
   * Validate file against upload options
   */
  validateFile(file: File, options: FileUploadOptions = {}): { valid: boolean; error?: string } {
    // Check file size
    const maxSize = options.maxFileSize || 100 * 1024 * 1024; // 100MB default
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds maximum (${this.formatFileSize(maxSize)})`,
      };
    }

    // Check file type
    const allowedTypes = options.allowedFileTypes || ['*/*'];
    const isAllowed = allowedTypes.some(
      (type) => type === '*/*' || file.type === type || file.type.match(new RegExp(type.replace('*', '.*')))
    );

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get file MIME type
   */
  getFileMimeType(file: File): string {
    return file.type || 'application/octet-stream';
  }

  /**
   * Check if file is image
   */
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Check if file is document
   */
  isDocumentFile(file: File): boolean {
    const docTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    return docTypes.includes(file.type);
  }

  /**
   * Check if file is video
   */
  isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
  }

  /**
   * Check if file is audio
   */
  isAudioFile(file: File): boolean {
    return file.type.startsWith('audio/');
  }

  // ============================================
  // FILE PREVIEW GENERATION
  // ============================================

  /**
   * Generate file preview
   */
  async generateFilePreview(file: File, previewOptions: FilePreviewOptions = {}): Promise<FilePreview> {
    const id = `preview-${Date.now()}-${Math.random()}`;
    const previewType = this.getPreviewType(file);
    let preview: string | undefined;

    // Generate preview based on file type
    if (previewType === 'image' && this.isImageFile(file)) {
      preview = await this.generateImagePreview(file, previewOptions);
    } else if (previewType === 'video' && this.isVideoFile(file)) {
      preview = await this.generateVideoPreview(file);
    } else if (previewType === 'audio' && this.isAudioFile(file)) {
      preview = await this.generateAudioPreview();
    } else if (previewType === 'document') {
      preview = await this.generateDocumentPreview(file);
    }

    const filePreview: FilePreview = {
      id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      preview,
      previewType,
      uploadProgress: 0,
      status: 'pending',
      createdAt: new Date(),
    };

    this.filePreviewCache.set(id, filePreview);
    return filePreview;
  }

  /**
   * Get preview type
   */
  private getPreviewType(file: File): 'image' | 'document' | 'video' | 'audio' | 'unknown' {
    if (this.isImageFile(file)) return 'image';
    if (this.isVideoFile(file)) return 'video';
    if (this.isAudioFile(file)) return 'audio';
    if (this.isDocumentFile(file)) return 'document';
    return 'unknown';
  }

  /**
   * Generate image preview
   */
  private generateImagePreview(file: File, options: FilePreviewOptions = {}): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const width = options.previewDimensions?.width || 200;
          const height = options.previewDimensions?.height || 200;

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            const aspectRatio = img.width / img.height;
            let drawWidth = width;
            let drawHeight = height;

            if (aspectRatio > 1) {
              drawHeight = width / aspectRatio;
            } else {
              drawWidth = height * aspectRatio;
            }

            const x = (width - drawWidth) / 2;
            const y = (height - drawHeight) / 2;

            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
          }

          resolve(canvas.toDataURL());
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate video preview
   */
  private generateVideoPreview(file: File): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');

      const reader = new FileReader();
      reader.onload = (e) => {
        video.src = e.target?.result as string;
        video.onloadedmetadata = () => {
          video.currentTime = Math.min(1, video.duration / 2);
        };
        video.oncanplay = () => {
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, 200, 200);
          }
          resolve(canvas.toDataURL());
        };
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate audio preview (returns audio icon)
   */
  private async generateAudioPreview(): Promise<string> {
    // Return a data URL for an audio icon
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a6 6 0 0 1 0 8.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Generate document preview
   */
  private async generateDocumentPreview(file: File): Promise<string> {
    // Return a data URL for a document icon
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
      <polyline points="13 2 13 9 20 9"></polyline>
      <line x1="9" y1="13" x2="15" y2="13"></line>
      <line x1="9" y1="17" x2="15" y2="17"></line>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Get cached preview
   */
  getFilePreview(previewId: string): FilePreview | null {
    return this.filePreviewCache.get(previewId) || null;
  }

  // ============================================
  // FILE UPLOAD MANAGEMENT
  // ============================================

  /**
   * Add file to upload queue
   */
  async addFileToQueue(file: File, options: FileUploadOptions = {}): Promise<FilePreview | null> {
    // Validate file
    const validation = this.validateFile(file, options);
    if (!validation.valid) {
      options.onError?.(validation.error || 'Validation failed');
      return null;
    }

    // Generate preview
    const filePreview = await this.generateFilePreview(file);

    if (validation.valid) {
      filePreview.status = 'pending';
      this.uploadQueue.push(filePreview);

      if (options.autoUpload) {
        await this.uploadFile(filePreview.id, file, options);
      }

      return filePreview;
    }

    return null;
  }

  /**
   * Upload single file
   */
  async uploadFile(previewId: string, file: File, options: FileUploadOptions = {}): Promise<boolean> {
    const preview = this.filePreviewCache.get(previewId);
    if (!preview) {
      options.onError?.('Preview not found');
      return false;
    }

    preview.status = 'uploading';
    const controller = new AbortController();
    this.activeUploads.set(previewId, controller);

    try {
      // Simulate upload with progress tracking
      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        if (controller.signal.aborted) {
          preview.status = 'failed';
          preview.error = 'Upload cancelled';
          return false;
        }

        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        preview.uploadProgress = progress;
        options.onProgress?.(progress);
      }

      preview.status = 'completed';
      preview.uploadProgress = 100;
      options.onComplete?.(preview);

      this.activeUploads.delete(previewId);
      return true;
    } catch (error) {
      preview.status = 'failed';
      preview.error = error instanceof Error ? error.message : 'Upload failed';
      options.onError?.(preview.error);

      this.activeUploads.delete(previewId);
      return false;
    }
  }

  /**
   * Upload all queued files
   */
  async uploadAllFiles(options: FileUploadOptions = {}): Promise<FilePreview[]> {
    const uploadedFiles: FilePreview[] = [];

    for (const preview of this.uploadQueue) {
      if (preview.status === 'pending') {
        // Re-acquire file from queue (in real app, would have actual file object)
        // For now, simulate successful upload
        preview.status = 'completed';
        uploadedFiles.push(preview);
      }
    }

    return uploadedFiles;
  }

  /**
   * Cancel file upload
   */
  cancelUpload(previewId: string): boolean {
    const controller = this.activeUploads.get(previewId);
    if (controller) {
      controller.abort();
      const preview = this.filePreviewCache.get(previewId);
      if (preview) {
        preview.status = 'failed';
        preview.error = 'Upload cancelled by user';
      }
      return true;
    }
    return false;
  }

  /**
   * Clear upload queue
   */
  clearQueue(): void {
    this.uploadQueue = [];
  }

  /**
   * Get upload queue
   */
  getUploadQueue(): FilePreview[] {
    return this.uploadQueue;
  }

  // ============================================
  // DRAG AND DROP UTILITIES
  // ============================================

  /**
   * Process dropped files
   */
  async processDroppedFiles(files: FileList, options: FileUploadOptions = {}): Promise<FilePreview[]> {
    const previews: FilePreview[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const preview = await this.addFileToQueue(file, options);
      if (preview) {
        previews.push(preview);
      }
    }

    return previews;
  }

  /**
   * Check if drag event contains files
   */
  hasFiles(dataTransfer: DataTransfer): boolean {
    return dataTransfer.types && (dataTransfer.types.includes('Files') || dataTransfer.types.includes('application/x-moz-file'));
  }

  /**
   * Get files from drag event
   */
  getFilesFromDragEvent(dataTransfer: DataTransfer): FileList | null {
    return dataTransfer.files;
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file extension
   */
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop() || '';
  }

  /**
   * Get file name without extension
   */
  getFileNameWithoutExtension(fileName: string): string {
    return fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  }

  /**
   * Generate unique file name
   */
  generateUniqueFileName(fileName: string): string {
    const timestamp = Date.now();
    const extension = this.getFileExtension(fileName);
    const nameWithoutExt = this.getFileNameWithoutExtension(fileName);

    return `${nameWithoutExt}_${timestamp}.${extension}`;
  }

  /**
   * Clear file preview cache
   */
  clearPreviewCache(): void {
    this.filePreviewCache.clear();
  }

  /**
   * Get preview cache size
   */
  getPreviewCacheSize(): number {
    return this.filePreviewCache.size;
  }
}

// Singleton instance
export const dragDropFileService = new DragDropFileService();
