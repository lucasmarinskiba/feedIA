import { log } from '../../agent/logger.js';
import { homedir } from 'os';
import { join, resolve } from 'path';

export interface DownloadLocation {
  name: string;
  path: string;
  priority: number;
}

export class FileMonitor {
  private downloadLocations: DownloadLocation[];
  private watchedFiles: Map<string, Date> = new Map();

  constructor() {
    this.downloadLocations = [
      { name: 'Downloads', path: join(homedir(), 'Downloads'), priority: 1 },
      { name: 'Documents', path: join(homedir(), 'Documents'), priority: 2 },
      { name: 'Desktop', path: join(homedir(), 'Desktop'), priority: 3 },
      { name: 'Temp', path: resolve('/tmp'), priority: 4 },
    ];
  }

  /**
   * Get default download folder for the current system
   */
  getDefaultDownloadPath(): string {
    return this.downloadLocations[0]?.path || join(homedir(), 'Downloads');
  }

  /**
   * Construct expected file path based on app and format
   */
  getExpectedPath(
    filename: string,
    location: 'downloads' | 'temp' | 'custom' = 'downloads',
    customPath?: string,
  ): string {
    const downloadPath = this.downloadLocations[0]?.path || join(homedir(), 'Downloads');
    const tempPath = this.downloadLocations[3]?.path || '/tmp';

    switch (location) {
      case 'downloads':
        return join(downloadPath, filename);
      case 'temp':
        return join(tempPath, filename);
      case 'custom':
        return customPath ? join(customPath, filename) : join(downloadPath, filename);
      default:
        return join(downloadPath, filename);
    }
  }

  /**
   * Get file extensions for common formats
   */
  getFileExtensions(format: string): string[] {
    const extensions: Record<string, string[]> = {
      image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
      video: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
      document: ['pdf', 'docx', 'xlsx', 'pptx', 'txt'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz'],
    };

    return extensions[format] || [format];
  }

  /**
   * Build glob pattern for file monitoring
   */
  buildGlobPattern(basePath: string, filename: string, format?: string): string {
    if (filename.includes('*')) {
      return filename; // Already a glob
    }

    const extensions = format ? this.getFileExtensions(format) : ['*'];
    const patterns = extensions.map((ext) => (filename.endsWith(`.${ext}`) ? filename : `${filename}*.${ext}`));

    return patterns.length === 1 ? patterns[0]! : `{${patterns.join(',')}}`;
  }

  /**
   * Track file for monitoring (download in progress)
   */
  watchFile(filePath: string): void {
    this.watchedFiles.set(filePath, new Date());
    log.debug(`[FileMonitor] Watching: ${filePath}`);
  }

  /**
   * Check if file exists and was recently modified
   */
  async isFileReady(filePath: string, minAgeMs: number = 1000): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const stat = await fs.stat(filePath);

      if (!stat.isFile()) return false;

      const age = Date.now() - stat.mtimeMs;
      return age >= minAgeMs; // File hasn't been modified recently (download complete)
    } catch {
      return false;
    }
  }

  /**
   * Wait for file to appear and stabilize (download complete)
   */
  async waitForFile(filePath: string, timeoutMs: number = 30000, checkIntervalMs: number = 1000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isFileReady(filePath)) {
        log.debug(`[FileMonitor] File ready: ${filePath}`);
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
    }

    log.warn(`[FileMonitor] Timeout waiting for: ${filePath}`);
    return false;
  }

  /**
   * Find recently downloaded file by pattern
   */
  async findRecentDownload(pattern: string, folderPath?: string, ageMinutes: number = 5): Promise<string | undefined> {
    const folder = folderPath || this.getDefaultDownloadPath();
    const cutoffTime = Date.now() - ageMinutes * 60 * 1000;

    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(folder);

      // Simple pattern matching (no glob library dependency)
      const matchingFiles = files.filter((f) => this.matchesPattern(f, pattern)).sort();

      if (matchingFiles.length === 0) return undefined;

      // Check most recent file
      const mostRecent = matchingFiles[matchingFiles.length - 1];
      if (!mostRecent) return undefined;

      const filePath = join(folder, mostRecent);
      const stat = await fs.stat(filePath);

      if (stat.mtimeMs > cutoffTime) {
        log.debug(`[FileMonitor] Found recent: ${filePath}`);
        return filePath;
      }

      return undefined;
    } catch (error) {
      log.error(`[FileMonitor] Error searching: ${error}`);
      return undefined;
    }
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      return filename.startsWith(pattern.slice(0, -1));
    }
    if (pattern.startsWith('*.')) {
      return filename.endsWith(pattern.slice(1));
    }
    return filename === pattern;
  }

  clearWatch(): void {
    this.watchedFiles.clear();
    log.debug('[FileMonitor] Cleared watch list');
  }
}

export const fileMonitor = new FileMonitor();
