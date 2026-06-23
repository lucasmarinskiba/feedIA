/**
 * Cloudinary Adapter — Store carousel files (PNG, CSS, ZIP).
 * Free tier: 10GB storage, 7-day auto-cleanup.
 */

import { log } from '../agent/logger.js';

const CLOUDINARY_URL = process.env['CLOUDINARY_URL'];
const CLOUDINARY_CLOUD_NAME = process.env['CLOUDINARY_CLOUD_NAME'];
const CLOUDINARY_API_KEY = process.env['CLOUDINARY_API_KEY'];

/**
 * Upload file (PNG, CSS, JSON, etc) to Cloudinary.
 * Returns public URL.
 */
export const uploadFileToCloudinary = async (
  fileBuffer: Buffer,
  filename: string,
  folder: string = 'carousel-exports',
): Promise<string | null> => {
  if (!CLOUDINARY_URL && !CLOUDINARY_CLOUD_NAME) {
    log.warn('[Cloudinary] Not configured. Falling back to local /tmp storage.');
    return null;
  }

  try {
    // In production: use cloudinary SDK to upload
    // For now: return mock URL (would be real Cloudinary URL)
    // const formData = new FormData();
    // formData.append('file', new Blob([fileBuffer]));
    // formData.append('upload_preset', 'unsigned_preset');
    // formData.append('folder', folder);
    // const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
    // const json = await response.json();
    // return json.secure_url;

    const mockUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/carousel-exports/${filename}`;
    log.info(`[Cloudinary] Mock upload: ${filename} → ${mockUrl}`);
    return mockUrl;
  } catch (err) {
    log.error(`[Cloudinary] Upload failed: ${(err as Error).message}`);
    return null;
  }
};

/**
 * Delete file from Cloudinary.
 */
export const deleteFileFromCloudinary = async (publicId: string): Promise<boolean> => {
  if (!CLOUDINARY_CLOUD_NAME) {
    return false;
  }

  try {
    // In production: use cloudinary SDK
    // const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image/upload`, {
    //   method: 'DELETE',
    //   headers: { 'Authorization': `Basic ${btoa(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`)}` }
    // });
    // return response.ok;

    log.info(`[Cloudinary] Mock delete: ${publicId}`);
    return true;
  } catch (err) {
    log.error(`[Cloudinary] Delete failed: ${(err as Error).message}`);
    return false;
  }
};

/**
 * Get Cloudinary storage usage (free tier: 10GB).
 */
export const getCloudinaryUsage = async (): Promise<{ used: number; total: number } | null> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY) {
    return null;
  }

  try {
    // In production: call Cloudinary API for usage stats
    // const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/usage`, {
    //   headers: { 'Authorization': `Basic ${btoa(`api_key:${CLOUDINARY_API_KEY}`)}` }
    // });
    // const json = await response.json();
    // return { used: json.usage.bytes, total: 10 * 1024 * 1024 * 1024 };

    return {
      used: 0, // Mock
      total: 10 * 1024 * 1024 * 1024, // 10GB
    };
  } catch (err) {
    log.error(`[Cloudinary] Usage check failed: ${(err as Error).message}`);
    return null;
  }
};

export const cloudinaryAdapter = {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
  getCloudinaryUsage,
};
