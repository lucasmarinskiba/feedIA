import { Carousel, CarouselCreateRequest } from '../db/carousel-schema.js';
import { carouselStorageService } from './carousel-storage-service.js';
import { carouselQualityValidator } from './carousel-quality-validator.js';
import { carouselMetricsService } from './carousel-metrics-service.js';

export interface PipelineResult {
  success: boolean;
  carousel?: Carousel;
  validation?: {
    isValid: boolean;
    score: number;
    errors: Array<{ type: string; message: string }>;
  };
  error?: string;
  warnings?: string[];
  timestamp: string;
}

class CarouselCreationPipeline {
  async createWithValidation(
    request: CarouselCreateRequest,
    options: {
      validateBefore?: boolean;
      rejectOnCritical?: boolean;
      trackCreation?: boolean;
    } = { validateBefore: true, rejectOnCritical: true, trackCreation: true }
  ): Promise<PipelineResult> {
    const timestamp = new Date().toISOString();

    try {
      if (!request.userId || !request.title || !request.format || !request.platform || !request.slides) {
        return {
          success: false,
          error: 'Missing required fields: userId, title, format, platform, slides',
          timestamp,
        };
      }

      const carousel = await carouselStorageService.create(request);

      if (options.validateBefore) {
        const report = await carouselQualityValidator.generateReport(carousel);

        const criticalErrors = report.validation.errors.filter(e => e.severity === 'critical' || e.severity === 'high');

        if (options.rejectOnCritical && criticalErrors.length > 0) {
          await carouselStorageService.delete(carousel.id);

          return {
            success: false,
            error: `Carousel rejected due to ${criticalErrors.length} critical validation error(s)`,
            validation: {
              isValid: false,
              score: report.validation.score,
              errors: criticalErrors,
            },
            warnings: report.validation.warnings.map(w => w.message),
            timestamp,
          };
        }

        if (options.trackCreation) {
          await carouselMetricsService.trackEvent({
            carouselId: carousel.id,
            userId: carousel.userId,
            eventType: 'view',
            source: 'creation_pipeline',
          });
        }

        return {
          success: true,
          carousel,
          validation: {
            isValid: report.validation.isValid,
            score: report.validation.score,
            errors: report.validation.errors.map(e => ({ type: e.type, message: e.message })),
          },
          warnings: report.validation.warnings.length > 0 ? report.validation.warnings.map(w => w.message) : undefined,
          timestamp,
        };
      }

      if (options.trackCreation) {
        await carouselMetricsService.trackEvent({
          carouselId: carousel.id,
          userId: carousel.userId,
          eventType: 'view',
          source: 'creation_pipeline',
        });
      }

      return {
        success: true,
        carousel,
        timestamp,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Pipeline error: ${error}`,
        timestamp,
      };
    }
  }

  async createBatch(
    requests: CarouselCreateRequest[],
    options: {
      validateBefore?: boolean;
      rejectOnCritical?: boolean;
      trackCreation?: boolean;
      continueOnError?: boolean;
    } = { validateBefore: true, rejectOnCritical: true, trackCreation: true, continueOnError: false }
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: PipelineResult[];
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();
    const results: PipelineResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.createWithValidation(request, options);
        results.push(result);

        if (!result.success && !options.continueOnError) {
          break;
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results.push({
          success: false,
          error: `Batch error: ${error}`,
          timestamp: new Date().toISOString(),
        });

        if (!options.continueOnError) {
          break;
        }
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      total: requests.length,
      succeeded,
      failed,
      results,
      timestamp,
    };
  }

  async importWithValidation(
    carousel: Carousel,
    options: {
      validateBefore?: boolean;
      rejectOnCritical?: boolean;
      skipPersistence?: boolean;
    } = { validateBefore: true, rejectOnCritical: true, skipPersistence: false }
  ): Promise<PipelineResult> {
    const timestamp = new Date().toISOString();

    try {
      if (options.validateBefore) {
        const report = await carouselQualityValidator.generateReport(carousel);
        const criticalErrors = report.validation.errors.filter(e => e.severity === 'critical' || e.severity === 'high');

        if (options.rejectOnCritical && criticalErrors.length > 0) {
          return {
            success: false,
            error: `Import rejected due to ${criticalErrors.length} critical validation error(s)`,
            validation: {
              isValid: false,
              score: report.validation.score,
              errors: criticalErrors,
            },
            warnings: report.validation.warnings.map(w => w.message),
            timestamp,
          };
        }
      }

      if (!options.skipPersistence) {
        const existing = await carouselStorageService.getById(carousel.id);
        if (existing) {
          await carouselStorageService.update(carousel.id, {
            title: carousel.title,
            slides: carousel.slides,
            status: carousel.metadata.status,
          });
        } else {
          await carouselStorageService.create({
            userId: carousel.userId,
            title: carousel.title,
            format: carousel.format,
            slides: carousel.slides,
            platform: carousel.metadata.platform,
            sourceCategory: carousel.sourceCategory,
          });
        }
      }

      return {
        success: true,
        carousel,
        timestamp,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Import error: ${error}`,
        timestamp,
      };
    }
  }
}

export const carouselCreationPipeline = new CarouselCreationPipeline();
