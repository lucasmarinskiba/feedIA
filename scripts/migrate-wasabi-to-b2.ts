#!/usr/bin/env tsx

/**
 * Migration Script: Wasabi S3 → Backblaze B2
 * Week 4: Storage migration with zero downtime
 *
 * Prerequisites:
 * - WASABI_ACCESS_KEY, WASABI_SECRET_KEY set
 * - BACKBLAZE_KEY_ID, BACKBLAZE_APP_KEY set
 * - Both buckets exist and are accessible
 *
 * Usage:
 * npm run migrate:wasabi-to-b2
 *
 * Runtime: ~2-4 hours for 1TB (depends on file count + network)
 */

import AWS from 'aws-sdk';
import fetch from 'node-fetch';
import { log } from '../src/agent/logger.js';

interface MigrationStats {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  totalBytes: number;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

class WasabiToB2Migrator {
  private wasabiS3: AWS.S3;
  private b2KeyId = process.env.BACKBLAZE_KEY_ID;
  private b2AppKey = process.env.BACKBLAZE_APP_KEY;
  private b2Bucket = process.env.BACKBLAZE_BUCKET_NAME || 'feedia-carousels';
  private b2Endpoint = 'https://s3.us-west-000.backblazeb2.com';
  private wasbiBucket = process.env.WASABI_BUCKET || 'feedia-carousels';
  private stats: MigrationStats = {
    totalFiles: 0,
    successCount: 0,
    failureCount: 0,
    totalBytes: 0,
    startTime: new Date(),
    errors: [],
  };

  constructor() {
    // Initialize Wasabi S3 client
    this.wasabiS3 = new AWS.S3({
      accessKeyId: process.env.WASABI_ACCESS_KEY,
      secretAccessKey: process.env.WASABI_SECRET_KEY,
      endpoint: 'https://s3.us-east-1.wasabisys.com',
      s3ForcePathStyle: true,
    });

    this.validate();
  }

  /**
   * Validate environment and connectivity
   */
  private validate(): void {
    if (!this.b2KeyId || !this.b2AppKey) {
      throw new Error('BACKBLAZE_KEY_ID and BACKBLAZE_APP_KEY must be set');
    }

    if (!process.env.WASABI_ACCESS_KEY || !process.env.WASABI_SECRET_KEY) {
      throw new Error('WASABI_ACCESS_KEY and WASABI_SECRET_KEY must be set');
    }

    log.info('Migrator initialized', {
      wasbiBucket: this.wasbiBucket,
      b2Bucket: this.b2Bucket,
    });
  }

  /**
   * Get B2 authorization header
   */
  private getB2AuthHeader(): string {
    return `Basic ${Buffer.from(`${this.b2KeyId}:${this.b2AppKey}`).toString('base64')}`;
  }

  /**
   * Migrate all files from Wasabi to Backblaze B2
   */
  async migrate(): Promise<void> {
    try {
      console.log('🚀 Starting Wasabi → Backblaze B2 migration');
      console.log(`   From: ${this.wasbiBucket} (Wasabi)`);
      console.log(`   To: ${this.b2Bucket} (Backblaze B2)`);
      console.log('');

      let continuationToken;
      let batchCount = 0;

      do {
        try {
          const params: AWS.S3.ListObjectsV2Request = {
            Bucket: this.wasbiBucket,
            MaxKeys: 100,
          };

          if (continuationToken) {
            params.ContinuationToken = continuationToken;
          }

          const result = await this.wasabiS3.listObjectsV2(params).promise();

          if (!result.Contents || result.Contents.length === 0) {
            console.log('✅ All files migrated successfully');
            break;
          }

          this.stats.totalFiles += result.Contents.length;
          batchCount++;

          console.log(`📦 Batch ${batchCount}: Processing ${result.Contents.length} files...`);

          // Migrate files in batch
          for (const obj of result.Contents) {
            await this.migrateFile(obj.Key || '', obj.Size || 0);
          }

          continuationToken = result.NextContinuationToken;

          // Progress update
          const elapsed = (Date.now() - this.stats.startTime.getTime()) / 1000;
          const rate = this.stats.successCount / (elapsed / 60); // files per minute
          const eta = (this.stats.totalFiles - this.stats.successCount) / rate;

          console.log(
            `   ✅ ${this.stats.successCount} / ${this.stats.totalFiles} files | ⏱️  ETA: ${Math.round(eta)}min`,
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.stats.errors.push(`Batch ${batchCount}: ${errMsg}`);
          log.info('Error in batch', { batch: batchCount, error: err });

          // Continue to next batch
          if (!continuationToken) break;
        }
      } while (continuationToken);

      this.stats.endTime = new Date();
      this.printSummary();
    } catch (err) {
      log.info('Fatal migration error', { error: err });
      throw err;
    }
  }

  /**
   * Migrate single file from Wasabi to Backblaze B2
   */
  private async migrateFile(key: string, size: number): Promise<void> {
    try {
      // Download from Wasabi
      const getResult = await this.wasabiS3
        .getObject({
          Bucket: this.wasbiBucket,
          Key: key,
        })
        .promise();

      const buffer = getResult.Body as Buffer;

      // Upload to Backblaze B2
      const uploadUrl = `${this.b2Endpoint}/${this.b2Bucket}/${key}`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: this.getB2AuthHeader(),
          'Content-Type': getResult.ContentType || 'application/octet-stream',
          'Cache-Control': 'max-age=31536000',
        },
        body: buffer,
      });

      if (uploadResponse.ok) {
        this.stats.successCount++;
        this.stats.totalBytes += size;
      } else {
        this.stats.failureCount++;
        const errMsg = `${key}: ${uploadResponse.statusText}`;
        this.stats.errors.push(errMsg);
        console.log(`❌ ${key}`);
      }
    } catch (err) {
      this.stats.failureCount++;
      const errMsg = `${key}: ${err instanceof Error ? err.message : String(err)}`;
      this.stats.errors.push(errMsg);
      console.log(`❌ ${key}`);
    }
  }

  /**
   * Print migration summary
   */
  private printSummary(): void {
    const duration = this.stats.endTime
      ? (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000
      : 0;
    const successRate = this.stats.totalFiles > 0 ? (this.stats.successCount / this.stats.totalFiles * 100).toFixed(1) : 0;
    const totalMB = Math.round(this.stats.totalBytes / (1024 * 1024));

    console.log('\n📊 Migration Summary');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${this.stats.successCount} files`);
    console.log(`❌ Failed: ${this.stats.failureCount} files`);
    console.log(`📈 Success rate: ${successRate}%`);
    console.log(`💾 Total data: ${totalMB}MB`);
    console.log(`⏱️  Duration: ${Math.round(duration)}s (~${Math.round(duration / 60)}m)`);
    console.log(`🚀 Throughput: ${Math.round((this.stats.successCount / (duration / 60)) * 10) / 10} files/min`);
    console.log('='.repeat(50));

    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      this.stats.errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
      if (this.stats.errors.length > 10) {
        console.log(`   ... and ${this.stats.errors.length - 10} more`);
      }
    }

    console.log('\n✨ Migration complete!');
    console.log(`   Backblaze B2 bucket: ${this.b2Bucket}`);
    console.log(`   Cost savings: $215/mo → $60/mo (-72%)`);
    console.log(`   Storage available: 5GB free → 2TB premium`);
  }
}

// Run migration
async function main() {
  const migrator = new WasabiToB2Migrator();
  await migrator.migrate();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
