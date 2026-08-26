/**
 * S3 Storage - Video/Image Uploads
 * Signed URLs + CDN delivery via CloudFront
 */

import crypto from 'crypto';

class S3Manager {
  constructor() {
    this.bucket = process.env.S3_BUCKET || 'feedia-media-dev';
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.accessKey = process.env.AWS_ACCESS_KEY_ID || 'mock-key';
    this.secretKey = process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret';
    this.cdnUrl = process.env.CLOUDFRONT_URL || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    this.uploads = new Map(); // Mock storage
  }

  /**
   * Generate signed URL for upload
   */
  getSignedUploadUrl(userId, fileName, fileSize, contentType = 'video/mp4') {
    const key = `${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}/${fileName}`;

    // Mock signed URL (real: AWS SigV4 signature)
    const signedUrl = `${this.cdnUrl}/${key}?AWSAccessKeyId=${this.accessKey}&Signature=mock-sig&Expires=${Date.now() + 15 * 60 * 1000}`;

    const uploadRecord = {
      key,
      userId,
      fileName,
      fileSize,
      contentType,
      signed_url: signedUrl,
      cdn_url: `${this.cdnUrl}/${key}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    this.uploads.set(key, uploadRecord);

    return uploadRecord;
  }

  /**
   * Get CDN URL
   */
  getCdnUrl(key) {
    const upload = this.uploads.get(key);
    if (!upload) {
      throw new Error('Upload not found');
    }

    return {
      cdn_url: upload.cdn_url,
      key,
      expires_at: upload.expires_at,
    };
  }

  /**
   * Mark upload as complete
   */
  completeUpload(key, fileSize) {
    const upload = this.uploads.get(key);
    if (!upload) {
      throw new Error('Upload not found');
    }

    upload.status = 'completed';
    upload.file_size = fileSize;
    upload.completed_at = new Date().toISOString();

    return upload;
  }

  /**
   * Delete object
   */
  deleteObject(key) {
    if (!this.uploads.has(key)) {
      throw new Error('Object not found');
    }

    this.uploads.delete(key);

    return { deleted: true, key };
  }

  /**
   * Get usage stats
   */
  getUsageStats(userId) {
    const userUploads = Array.from(this.uploads.values()).filter((u) => u.userId === userId);

    const stats = {
      total_uploads: userUploads.length,
      completed: userUploads.filter((u) => u.status === 'completed').length,
      pending: userUploads.filter((u) => u.status === 'pending').length,
      total_size_bytes: userUploads.reduce((sum, u) => sum + (u.file_size || 0), 0),
      total_size_gb: userUploads.reduce((sum, u) => sum + (u.file_size || 0), 0) / (1024 * 1024 * 1024),
      quota_bytes: 100 * 1024 * 1024 * 1024, // 100GB
      quota_gb: 100,
      usage_percent: (userUploads.reduce((sum, u) => sum + (u.file_size || 0), 0) / (100 * 1024 * 1024 * 1024)) * 100,
    };

    return stats;
  }

  /**
   * Get upload history
   */
  getHistory(userId, limit = 50) {
    const userUploads = Array.from(this.uploads.values())
      .filter((u) => u.userId === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    return userUploads;
  }
}

const s3Manager = new S3Manager();

/**
 * Storage HTTP handler
 */
export const handleStorage = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return json(401, { error: 'x-user-id header required' });
  }

  try {
    // POST /api/storage/upload (get signed URL)
    if (path === '/api/storage/upload' && m === 'POST') {
      const { file_name, file_size, content_type = 'video/mp4' } = body || {};

      if (!file_name || !file_size) {
        return json(400, { error: 'file_name, file_size required' });
      }

      if (file_size > 5 * 1024 * 1024 * 1024) {
        // 5GB limit
        return json(413, { error: 'File size exceeds 5GB limit' });
      }

      const result = s3Manager.getSignedUploadUrl(userId, file_name, file_size, content_type);
      return json(200, result);
    }

    // GET /api/storage/url/:key
    if (path.startsWith('/api/storage/url/') && m === 'GET') {
      const key = path.split('/')[4];

      if (!key) {
        return json(400, { error: 'key required' });
      }

      try {
        const result = s3Manager.getCdnUrl(key);
        return json(200, result);
      } catch (err) {
        return json(404, { error: 'Upload not found' });
      }
    }

    // DELETE /api/storage/delete
    if (path === '/api/storage/delete' && m === 'DELETE') {
      const { key } = body || {};

      if (!key) {
        return json(400, { error: 'key required' });
      }

      try {
        const result = s3Manager.deleteObject(key);
        return json(200, result);
      } catch (err) {
        return json(404, { error: 'Upload not found' });
      }
    }

    // GET /api/storage/usage
    if (path === '/api/storage/usage' && m === 'GET') {
      const stats = s3Manager.getUsageStats(userId);
      return json(200, stats);
    }

    // GET /api/storage/history
    if (path === '/api/storage/history' && m === 'GET') {
      const limit = parseInt(req.headers['x-limit'] || '50');
      const history = s3Manager.getHistory(userId, limit);

      return json(200, { uploads: history, total: history.length });
    }

    // POST /api/storage/complete (webhook from S3)
    if (path === '/api/storage/complete' && m === 'POST') {
      const { key, file_size } = body || {};

      if (!key) {
        return json(400, { error: 'key required' });
      }

      try {
        const result = s3Manager.completeUpload(key, file_size);
        return json(200, result);
      } catch (err) {
        return json(404, { error: 'Upload not found' });
      }
    }

    return false;
  } catch (err) {
    return json(500, { error: String(err).replace('Error: ', '') });
  }
};

export { s3Manager };
