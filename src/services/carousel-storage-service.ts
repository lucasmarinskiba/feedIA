import { feedIADatabase } from '../db/database.js';
import { Carousel, CarouselCreateRequest, CarouselUpdateRequest } from '../db/carousel-schema.js';

export const carouselStorageService = {
  async create(req: CarouselCreateRequest): Promise<Carousel> {
    const now = new Date().toISOString();
    const carousel: Carousel = {
      id: `carousel-${Date.now()}`,
      userId: req.userId,
      title: req.title,
      format: req.format,
      slides: req.slides,
      sourceCategory: req.sourceCategory,
      metadata: {
        createdAt: now,
        updatedAt: now,
        status: 'draft',
        platform: req.platform,
        engagementMetrics: { views: 0, likes: 0, comments: 0, saves: 0, shares: 0 },
      },
    };

    const db = feedIADatabase.getConnection();
    const stmt = db.prepare(
      `INSERT INTO carousels (id, user_id, title, format, slides, source_category, metadata, platform, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      carousel.id,
      carousel.userId,
      carousel.title,
      carousel.format,
      JSON.stringify(carousel.slides),
      carousel.sourceCategory || null,
      JSON.stringify(carousel.metadata),
      carousel.metadata.platform,
      carousel.metadata.createdAt,
      carousel.metadata.updatedAt,
    );

    return carousel;
  },

  async getById(carouselId: string): Promise<Carousel | null> {
    const db = feedIADatabase.getConnection();
    const stmt = db.prepare('SELECT * FROM carousels WHERE id = ?');
    const row = stmt.get(carouselId) as any;

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      format: row.format,
      slides: JSON.parse(row.slides),
      sourceCategory: row.source_category,
      metadata: JSON.parse(row.metadata),
    };
  },

  async listByUser(userId: string, limit = 50): Promise<Carousel[]> {
    const db = feedIADatabase.getConnection();
    const stmt = db.prepare('SELECT * FROM carousels WHERE user_id = ? ORDER BY created_at DESC LIMIT ?');
    const rows = stmt.all(userId, limit) as any[];

    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      format: row.format,
      slides: JSON.parse(row.slides),
      sourceCategory: row.source_category,
      metadata: JSON.parse(row.metadata),
    }));
  },

  async update(carouselId: string, updates: CarouselUpdateRequest): Promise<Carousel | null> {
    const carousel = await this.getById(carouselId);
    if (!carousel) return null;

    const updated: Carousel = {
      ...carousel,
      title: updates.title ?? carousel.title,
      slides: updates.slides ?? carousel.slides,
      metadata: {
        ...carousel.metadata,
        updatedAt: new Date().toISOString(),
        status: updates.status ?? carousel.metadata.status,
      },
    };

    const db = feedIADatabase.getConnection();
    const stmt = db.prepare(
      `UPDATE carousels SET title = ?, slides = ?, metadata = ?, updated_at = ? WHERE id = ?`
    );
    stmt.run(
      updated.title,
      JSON.stringify(updated.slides),
      JSON.stringify(updated.metadata),
      updated.metadata.updatedAt,
      carouselId,
    );

    return updated;
  },

  async delete(carouselId: string): Promise<boolean> {
    const db = feedIADatabase.getConnection();
    const stmt = db.prepare('DELETE FROM carousels WHERE id = ?');
    const result = stmt.run(carouselId);
    return (result.changes ?? 0) > 0;
  },

  async publish(carouselId: string, platform: 'instagram' | 'tiktok' | 'linkedin'): Promise<Carousel | null> {
    const carousel = await this.getById(carouselId);
    if (!carousel) return null;

    return this.update(carouselId, {
      status: 'published',
    });
  },

  async updateMetrics(carouselId: string, metrics: Partial<Carousel['metadata']['engagementMetrics']>): Promise<void> {
    const carousel = await this.getById(carouselId);
    if (!carousel) return;

    const updated: Carousel = {
      ...carousel,
      metadata: {
        ...carousel.metadata,
        engagementMetrics: { ...carousel.metadata.engagementMetrics, ...metrics },
        updatedAt: new Date().toISOString(),
      },
    };

    const db = feedIADatabase.getConnection();
    const stmt = db.prepare(`UPDATE carousels SET metadata = ?, updated_at = ? WHERE id = ?`);
    stmt.run(
      JSON.stringify(updated.metadata),
      updated.metadata.updatedAt,
      carouselId,
    );
  },
};
