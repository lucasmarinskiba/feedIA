import { createCarrusel } from '../content/carrusel.js';
import { createReel } from '../content/reel.js';
import { createCaption } from '../content/caption.js';
import { renderCarruselToCanva, renderReelToCanva, type RenderedDesign } from '../content/canvaRender.js';
import { investigarHashtags } from '../hashtags/research.js';
import { buildPostHashtags } from '../hashtags/rotation.js';
import { auditHashtags } from '../hashtags/audit.js';
import { type PublishResult } from '../../integrations/meta.js';
import { publishToSocialPlatforms, type SocialPublishResult } from '../../integrations/socialPublisher.js';
import { sendAlert } from '../../integrations/notifications.js';
import { auditarPrePublicacion, type SafetyReport } from '../safety/index.js';
import { isPausado } from '../crisis/index.js';
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import { type TikTokPublishOutcome } from '../tiktok/publishPipeline.js';
import { adaptContentToTikTok } from '../tiktok/contentAdapter.js';
import { runQualityGate, type QualityGateResult } from '../qualityGate/index.js';
import { buildVisualQAInput } from '../design/index.js';
import { evaluateTaste, generateFeedback, type TasteScore } from '../creativeDirector/index.js';
import { askJson } from '../../agent/tokenRouter.js';
import { produceReel, produceTikTok, type ProducedVideo } from '../videoEngine/index.js';
import { muxAudioVideo } from '../videoEngine/audioVideoMixer.js';
import { generateAudioForVideo } from '../audioEngine/index.js';
import { addJob, getJobStatus } from '../../workers/queue.js';
import { CapCutEngine } from '../../studio/engines/capcutEngine.js';
import { InShotEngine } from '../../studio/engines/inshotEngine.js';
import { randomUUID } from 'node:crypto';
import {
  buildCampaignTheme,
  buildDesignSystem,
  recommendTemplate,
  applyDesignSystemToTemplate,
  validateDesignSystem,
  detectCampaignMood,
  generateMotionGraphic,
  analyzeVisualQuality,
  type DesignSystem,
  type CreativeTemplate,
  type VisualQARealResult,
} from '../creativeSuite/index.js';
import { evaluate as complianceEvaluate, type GuardianContext } from '../../compliance/index.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';
import type { CarruselResult } from '../content/carrusel.js';
import type { ReelScript } from '../content/reel.js';
import type { CaptionVariants } from '../content/caption.js';

export interface BriefRequest {
  idea: string;
  formato: Extract<ContentFormat, 'reel' | 'carrusel'>;
  scheduledAt?: string;
  longitudCarrusel?: 'corto' | 'medio' | 'largo';
  duracionReel?: 15 | 20 | 30 | 45 | 60;
  requiereAprobacionHumana?: boolean;
  userHandle?: string;
  plataformas?: Array<'instagram' | 'tiktok'>;
  modoConfianza?: boolean;
  usarVideoAI?: boolean;
  usarImagenAI?: boolean;
  videoStyle?: 'avatar' | 'broll' | 'mixed' | 'motion';
  maxCostUsd?: number;
  postProduction?: 'capcut' | 'inshot' | 'none';
  capcutRecipe?: import('../../integrations/capcutWebhook.js').CapCutEnhancementInput['recipe'];
  inshotRecipe?: import('../../integrations/inshotWebhook.js').InShotEnhancementInput['recipe'];
  postProductionSync?: boolean;
}

export interface BriefOutcome {
  brief: BriefRequest;
  contenido: { carrusel?: CarruselResult; reel?: ReelScript };
  caption: CaptionVariants;
  hashtagsFinal: string[];
  hashtagsBaneados: string[];
  safety: SafetyReport;
  render?: RenderedDesign;
  video?: ProducedVideo;
  audioUrl?: string;
  designSystem?: DesignSystem;
  template?: CreativeTemplate;
  visualQAReal?: VisualQARealResult;
  motionGraphic?: string;
  publicacion?: PublishResult;
  tikTok?: TikTokPublishOutcome;
  qualityGate?: QualityGateResult;
  postProductionJobId?: string;
  tasteScore?: TasteScore;
  creativeFeedback?: string[];
  pendienteAprobacion: boolean;
  bloqueadoPorCrisis: boolean;
}

const buildPostProductionRequest = (
  brief: BriefRequest,
  video: ProducedVideo,
  audioUrl?: string,
): import('../../workers/videoPostProductionWorker.js').VideoPostProductionPayload => {
  const provider = brief.postProduction ?? 'none';
  const requestId = randomUUID();
  return {
    provider: provider as 'capcut' | 'inshot',
    requestId,
    videoUrl: video.videoUrl!,
    audioUrl,
    recipe: provider === 'capcut' ? brief.capcutRecipe : brief.inshotRecipe,
    brandName: brief.idea,
    title: brief.idea,
    durationSec: video.durationSec,
  };
};

const runPostProductionInline = async (
  brief: BriefRequest,
  video: ProducedVideo,
  audioUrl?: string,
): Promise<{ refinedUrl?: string; error?: string }> => {
  const provider = brief.postProduction;
  if (!provider || provider === 'none' || !video.videoUrl) return {};

  const assets: import('../../studio/types.js').ContentAsset[] = [
    { id: 'video-base', type: 'video', source: 'generated', url: video.videoUrl },
  ];
  if (audioUrl) assets.push({ id: 'audio-base', type: 'audio', source: 'generated', url: audioUrl });

  const request: import('../../studio/types.js').RenderRequest = {
    id: randomUUID(),
    format: 'mp4',
    title: brief.idea,
    brandProfileId: 'default',
    assets,
    fields: {},
    options: { durationSec: video.durationSec },
  };

  const engine =
    provider === 'inshot'
      ? new InShotEngine({ recipe: brief.inshotRecipe, brandName: brief.idea })
      : new CapCutEngine({ recipe: brief.capcutRecipe, brandName: brief.idea });

  const result = await engine.render(request);
  return { refinedUrl: result.artifactUrls?.[0], error: result.error };
};

const evaluateAndImproveTaste = async (
  brief: BriefRequest,
  carrusel: CarruselResult | undefined,
  reel: ReelScript | undefined,
  brand: BrandProfile,
): Promise<{ tasteScore?: TasteScore; creativeFeedback?: string[]; improvedCarrusel?: CarruselResult; improvedReel?: ReelScript }> => {
  const contentType: 'carrusel' | 'reel' = brief.formato === 'carrusel' ? 'carrusel' : 'reel';
  const tasteInput = {
    contentType,
    topic: brief.idea,
    carrusel,
    reel,
    brandName: brand.name,
    visualStyle: brand.visual?.style,
    palette: brand.visual?.palette,
  };

  const taste = await evaluateTaste(tasteInput);
  if (taste.passed || env.dryRun) {
    return { tasteScore: taste };
  }

  const feedback = generateFeedback(taste, contentType, brief.idea);
  if (env.dryRun) {
    return { tasteScore: taste, creativeFeedback: feedback.topIssues };
  }

  try {
    if (contentType === 'carrusel' && carrusel) {
      const improved = await askJson<CarruselResult>(
        `${feedback.improvementPrompt}\n\nContenido actual:\n${JSON.stringify(carrusel, null, 2)}`,
        { taskType: 'creative', maxTokens: 5000, freeOnly: true },
      );
      return { tasteScore: taste, creativeFeedback: feedback.topIssues, improvedCarrusel: improved };
    }
    if (contentType === 'reel' && reel) {
      const improved = await askJson<ReelScript>(
        `${feedback.improvementPrompt}\n\nContenido actual:\n${JSON.stringify(reel, null, 2)}`,
        { taskType: 'creative', maxTokens: 4500, freeOnly: true },
      );
      return { tasteScore: taste, creativeFeedback: feedback.topIssues, improvedReel: improved };
    }
  } catch (err) {
    log.warn(`[briefToPublish] No se pudo mejorar taste: ${(err as Error).message}`);
  }

  return { tasteScore: taste, creativeFeedback: feedback.topIssues };
};

const waitForJobResult = async (jobId: string, timeoutMs = 30000): Promise<{ refinedUrl?: string }> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getJobStatus('videoPostProduction', jobId);
    if (status?.result && typeof status.result === 'object' && 'refinedUrl' in status.result) {
      return { refinedUrl: (status.result as { refinedUrl?: string }).refinedUrl };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return {};
};

export const briefToPublish = async (brand: BrandProfile, brief: BriefRequest): Promise<BriefOutcome> => {
  log.step(`Brief → ${brief.formato}: ${brief.idea}`);

  let carrusel: CarruselResult | undefined;
  let reel: ReelScript | undefined;
  let render: RenderedDesign | undefined;
  let video: ProducedVideo | undefined;
  let audioUrl: string | undefined;
  let visualQAReal: VisualQARealResult | undefined;
  let motionGraphic: string | undefined;
  let postProductionJobId: string | undefined;

  if (brief.formato === 'carrusel') {
    carrusel = await createCarrusel(brand, brief.idea, brief.longitudCarrusel ?? 'medio');
    render = await renderCarruselToCanva(carrusel, `Carrusel — ${brief.idea.slice(0, 40)}`, brief.userHandle, {
      usarImagenAI: brief.usarImagenAI,
    });
  } else {
    reel = await createReel(brand, brief.idea, brief.duracionReel ?? 30);
    render = await renderReelToCanva(reel, `Reel — ${brief.idea.slice(0, 40)}`, brief.userHandle, {
      usarImagenAI: brief.usarImagenAI,
    });

    // Si Canva falla o se pide video AI nativo, producimos video con el motor de IA
    if (brief.usarVideoAI || !render?.ok || !render.exportUrls?.length) {
      const producer = brief.plataformas?.includes('tiktok') ? produceTikTok : produceReel;
      video = await producer(reel, brief.idea, brand.name, {
        dryRun: env.dryRun,
        maxCostUsd: brief.maxCostUsd,
        style: brief.videoStyle,
        preferredProvider: brief.videoStyle === 'avatar' ? 'heygen' : undefined,
      });
      if (video.ok && video.videoUrl) {
        log.info(`Video AI producido (${video.provider}): ${video.videoUrl}`);
      }

      // Generar audio (voiceover + música) para el video
      const audioMix = await generateAudioForVideo({
        scriptText: `${reel.hookVisual}. ${reel.caption}. ${reel.cta}`,
        contentType: brand.voice?.tone?.[0] ?? 'education',
        durationSec: video.durationSec,
      });
      audioUrl = audioMix.audioUrl;

      // Mezclar audio con video
      if (video.ok && video.videoUrl && audioUrl) {
        const mux = await muxAudioVideo({ videoUrl: video.videoUrl, audioUrl });
        if (mux.ok && mux.url) {
          video.videoUrl = mux.url;
          log.info(`Video + audio mezclado (${mux.provider}): ${mux.url}`);
        } else {
          log.warn(`No se pudo mezclar audio: ${mux.error}. Publicando video sin audio mezclado.`);
        }
      }

      // Post-producción opcional con CapCut/InShot (worker async)
      if (video.ok && video.videoUrl && brief.postProduction && brief.postProduction !== 'none') {
        const payload = buildPostProductionRequest(brief, video, audioUrl);
        const queued = await addJob({
          name: 'videoPostProduction',
          payload: payload as unknown as Record<string, unknown>,
          accountId: brand.name,
        });

        if (queued.ok && queued.id) {
          postProductionJobId = queued.id;
          log.info(`Post-producción encolada: ${queued.id} (${brief.postProduction})`);

          if (brief.postProductionSync) {
            const waited = await waitForJobResult(queued.id, 30000);
            if (waited.refinedUrl) {
              video.videoUrl = waited.refinedUrl;
              log.info(`Post-producción sync completada: ${waited.refinedUrl}`);
            } else {
              log.warn('Post-producción sync no completó en 30s; continuando con video base.');
            }
          }
        } else {
          log.warn(`No se pudo encolar post-producción: ${queued.error}. Ejecutando inline.`);
          const inline = await runPostProductionInline(brief, video, audioUrl);
          if (inline.refinedUrl) {
            video.videoUrl = inline.refinedUrl;
            postProductionJobId = 'inline';
            log.info(`Post-producción inline completada: ${inline.refinedUrl}`);
          }
        }
      }
    }
  }

  // Creative Director: evaluar taste y mejorar contenido si es necesario
  let tasteScore: TasteScore | undefined;
  let creativeFeedback: string[] | undefined;
  if (carrusel || reel) {
    const tasteResult = await evaluateAndImproveTaste(brief, carrusel, reel, brand);
    tasteScore = tasteResult.tasteScore;
    creativeFeedback = tasteResult.creativeFeedback;
    if (tasteResult.improvedCarrusel) carrusel = tasteResult.improvedCarrusel;
    if (tasteResult.improvedReel) reel = tasteResult.improvedReel;
    if (tasteScore) {
      log.info(`[CreativeDirector] Taste score: ${tasteScore.overall}/100 (${tasteScore.passed ? 'APROBADO' : 'MEJORABLE'})`);
    }
  }

  // Creative Suite: design system + template coherente para la campaña
  const campaignName = `Campaña — ${brief.idea.slice(0, 60)}`;
  const campaign = buildCampaignTheme(brand, campaignName, detectCampaignMood(brand));
  const designSystem = buildDesignSystem(brand, campaign);
  const template = recommendTemplate(brief.formato);
  applyDesignSystemToTemplate(designSystem, template.slots);
  const dsIssues = validateDesignSystem(designSystem);
  if (dsIssues.length > 0) {
    log.warn(`[Creative Suite] Design system warnings: ${dsIssues.join('; ')}`);
  }
  log.info(`Creative Suite: tema "${designSystem.campaign?.name}" (${designSystem.campaign?.mood}) + template "${template.name}"`);

  // Motion graphic para reels/stories
  if (brief.formato === 'reel' && reel) {
    const mg = generateMotionGraphic({
      type: 'text_reveal',
      text: reel.hookVisual,
      width: 1080,
      height: brief.formato === 'reel' ? 1920 : 1920,
    });
    motionGraphic = mg.json;
    log.info(`Motion graphic generado (${mg.lottie.nm})`);
  }

  const caption = await createCaption(brand, `Idea: ${brief.idea}. Formato: ${brief.formato}.`, brief.formato);

  const research = await investigarHashtags(brand, brief.idea);
  const pools = {
    mega: research.pools.mega.map((h) => h.tag),
    grande: research.pools.grande.map((h) => h.tag),
    medio: research.pools.medio.map((h) => h.tag),
    nicho: research.pools.nicho.map((h) => h.tag),
    marca: research.pools.marca.map((h) => h.tag),
  };
  const candidates = buildPostHashtags(pools, research.recomendacionMezclaPorPost);
  const audit = await auditHashtags(candidates);
  const hashtagsFinal: string[] = [];
  const hashtagsBaneados: string[] = [];
  for (const a of audit) {
    if (a.veredicto === 'sano') hashtagsFinal.push(a.tag);
    else {
      hashtagsBaneados.push(a.tag);
      if (a.reemplazoSugerido) hashtagsFinal.push(a.reemplazoSugerido);
    }
  }

  const safety = await auditarPrePublicacion(brand, {
    caption: `${caption.media}\n\n${hashtagsFinal.join(' ')}`,
    hooks: carrusel ? [carrusel.slides[0]?.titulo ?? ''] : reel ? [reel.hookVisual] : [],
  });
  log.info(`Safety: ${safety.veredicto} (riesgo ${safety.scoreRiesgo})`);

  const captionFinal =
    safety.veredicto === 'cambios-menores' && safety.versionSegura
      ? safety.versionSegura
      : `${caption.media}\n\n${hashtagsFinal.join(' ')}`;

  const bloqueadoPorSafety = safety.veredicto === 'bloqueado' || safety.veredicto === 'requiere-revision';
  const bloqueadoPorCrisis = isPausado();
  const requiereAprobacion =
    brief.requiereAprobacionHumana ??
    (!brief.modoConfianza && (!env.dryRun || bloqueadoPorSafety || bloqueadoPorCrisis));
  let publicacion: PublishResult | undefined;
  let tikTok: TikTokPublishOutcome | undefined;
  let socialPublish: SocialPublishResult | undefined;
  let qualityGate: QualityGateResult | undefined;
  let bloqueadoPorQualityGate = false;
  let bloqueadoPorVisualQAReal = false;

  // Visual QA real con computer vision sobre el asset exportado
  const visualUrl = render?.exportUrls?.[0] ?? video?.videoUrl;
  if (visualUrl) {
    try {
      visualQAReal = await analyzeVisualQuality(brand, {
        imageUrl: visualUrl,
        format: brief.formato,
        platform: brief.plataformas?.includes('tiktok') ? 'tiktok' : 'instagram',
        brandName: brand.name,
      });
      log.info(`Visual QA Real: ${visualQAReal.passed ? 'APROBADO' : 'RECHAZADO'} (${visualQAReal.score}/100)`);
      if (!visualQAReal.passed) {
        bloqueadoPorVisualQAReal = true;
      }
    } catch (err) {
      log.warn(`Visual QA Real error: ${(err as Error).message}`);
    }
  }

  // Quality Gate unificado (contenido + visual + marca + anti-promise)
  if (render) {
    try {
      const campaignColors = designSystem.campaign?.colors
        ? Object.values(designSystem.campaign.colors)
        : [];
      const colorsUsed = [
        ...campaignColors,
        ...(visualQAReal?.dominantColors ?? []),
      ].filter((c): c is string => typeof c === 'string' && c.length > 0);
      const fontsUsed = [designSystem.campaign?.fonts.heading, designSystem.campaign?.fonts.body].filter(
        (f): f is string => typeof f === 'string' && f.length > 0,
      );

      qualityGate = await runQualityGate({
        brand,
        format: brief.formato,
        caption: captionFinal,
        hashtags: hashtagsFinal,
        topic: brief.idea,
        hasCTA: caption.primerComentarioRecomendado.length > 0,
        visualInput: buildVisualQAInput({
          carrusel,
          reel,
          exportUrl: render.exportUrls?.[0],
          platform: brief.plataformas?.includes('tiktok') ? 'tiktok' : 'instagram',
          template,
        }),
        colorsUsed,
        fontsUsed,
        description: brief.idea,
        tasteInput: {
          contentType: brief.formato === 'carrusel' ? 'carrusel' : 'reel',
          topic: brief.idea,
          carrusel,
          reel,
          brandName: brand.name,
          visualStyle: brand.visual?.style,
          palette: brand.visual?.palette,
        },
      });
      log.info(`Quality Gate: ${qualityGate.passed ? 'APROBADO' : 'RECHAZADO'} (${qualityGate.combinedScore}/100)`);
      if (!qualityGate.passed) {
        bloqueadoPorQualityGate = true;
      }
    } catch (err) {
      log.error(`Quality Gate error: ${(err as Error).message}`);
      bloqueadoPorQualityGate = true;
    }
  }

  // Compliance guardian check adicional antes de publicar
  let bloqueadoPorCompliance = false;
  const complianceCtx: GuardianContext = {
    actor: 'pipeline:brief-to-publish',
    contentText: captionFinal,
    humanInitiated: false,
  };
  const complianceDecision = complianceEvaluate('publish', complianceCtx);
  if (!complianceDecision.allowed) {
    bloqueadoPorCompliance = true;
    log.error(`[COMPLIANCE] Publicación bloqueada: ${complianceDecision.reason}`);
  }

  const mediaUrls = render?.exportUrls?.length ? render.exportUrls : video?.videoUrl ? [video.videoUrl] : [];

  const puedeAutoPublicar =
    !requiereAprobacion &&
    !bloqueadoPorSafety &&
    !bloqueadoPorCrisis &&
    !bloqueadoPorCompliance &&
    !bloqueadoPorQualityGate &&
    !bloqueadoPorVisualQAReal &&
    mediaUrls.length > 0;

  if (puedeAutoPublicar && mediaUrls.length > 0) {
    const plataformas = brief.plataformas ?? ['instagram'];
    socialPublish = await publishToSocialPlatforms({
      platforms: plataformas,
      format: brief.formato,
      caption: captionFinal,
      mediaUrls,
      hashtags: hashtagsFinal,
      firstComment: caption.primerComentarioRecomendado,
      scheduledAt: brief.scheduledAt,
      carrusel,
      brandName: brand.name,
      userHandle: brief.userHandle,
      perPlatform: { tiktok: { allowComments: true, allowDuet: true, allowStitch: true } },
    });
    log.info(
      `Social publish: ${socialPublish.ok ? 'OK' : 'FALLIDO'} (${socialPublish.perPlatform
        .map((p) => `${p.platform}:${p.status}`)
        .join(', ')})`,
    );

    const igResult = socialPublish.perPlatform.find((p) => p.platform === 'instagram');
    if (igResult) {
      publicacion = {
        ok: socialPublish.ok && igResult.status !== 'failed',
        postId: igResult.socialPostId,
        url: igResult.socialUrl,
        scheduled: igResult.status === 'scheduled',
        error: igResult.error,
      };
    }

    const ttResult = socialPublish.perPlatform.find((p) => p.platform === 'tiktok');
    if (ttResult && (reel || carrusel)) {
      const plan = await adaptContentToTikTok(brand, { reel, carrusel });
      const ttUpload = socialPublish.uploads.find((u) => u.perPlatformResults.some((r) => r.platform === 'tiktok'));
      tikTok = {
        ok: socialPublish.ok && ttResult.status !== 'failed',
        plan,
        upload: ttUpload,
        socialUrl: ttResult.socialUrl,
        socialPostId: ttResult.socialPostId,
        scheduledFor: ttResult.scheduledFor,
        antiPromiseClean: true,
        dryRun: env.dryRun,
        errors: ttResult.error ? [ttResult.error] : [],
      };
    }
  } else {
    const motivo = bloqueadoPorCrisis
      ? 'CRISIS ACTIVA: publicaciones pausadas.'
      : bloqueadoPorCompliance
        ? `Compliance: ${complianceDecision.reason}`
        : bloqueadoPorVisualQAReal
          ? `Visual QA Real falló (${visualQAReal?.score ?? 0}/100). Revisar asset.`
          : bloqueadoPorQualityGate
            ? `Quality Gate falló (${qualityGate?.combinedScore ?? 0}/100). Revisar checkpoint.`
            : bloqueadoPorSafety
              ? `Safety ${safety.veredicto} (riesgo ${safety.scoreRiesgo}).`
              : socialPublish && !socialPublish.ok
                ? `Publicación cross-platform falló: ${socialPublish.errors.join('; ')}`
                : 'Aprobación humana requerida.';
    await sendAlert({
      severity: bloqueadoPorCrisis ? 'crisis' : bloqueadoPorSafety ? 'warn' : 'info',
      title: `Brief ${bloqueadoPorCrisis ? 'bloqueado' : 'pendiente'}: ${brief.formato}`,
      body: `*${brief.idea}*\n\n${motivo}\n\nDiseño Canva: ${render?.designUrl ?? 'no generado'}\nHashtags: ${hashtagsFinal.length} sanos, ${hashtagsBaneados.length} reemplazados.`,
      ...(render?.designUrl ? { ctaUrl: render.designUrl } : {}),
    });
  }

  return {
    brief,
    contenido: {
      ...(carrusel ? { carrusel } : {}),
      ...(reel ? { reel } : {}),
    },
    caption,
    hashtagsFinal,
    hashtagsBaneados,
    safety,
    ...(render ? { render } : {}),
    ...(video ? { video } : {}),
    ...(audioUrl ? { audioUrl } : {}),
    ...(designSystem ? { designSystem } : {}),
    ...(template ? { template } : {}),
    ...(visualQAReal ? { visualQAReal } : {}),
    ...(motionGraphic ? { motionGraphic } : {}),
    ...(publicacion ? { publicacion } : {}),
    ...(tikTok ? { tikTok } : {}),
    ...(socialPublish ? { socialPublish } : {}),
    ...(qualityGate ? { qualityGate } : {}),
    ...(postProductionJobId ? { postProductionJobId } : {}),
    ...(tasteScore ? { tasteScore } : {}),
    ...(creativeFeedback ? { creativeFeedback } : {}),
    pendienteAprobacion: !puedeAutoPublicar,
    bloqueadoPorCrisis,
  };
};

import type { StrategicBrief } from '../strategy/output/strategicBrief.js';

/**
 * Ejecuta el pipeline briefToPublish a partir de un StrategicBrief generado
 * por el Content Strategy Engine.
 */
export const briefFromStrategy = async (
  brand: BrandProfile,
  strategicBrief: StrategicBrief,
  overrides: Partial<BriefRequest> = {},
): Promise<BriefOutcome> => {
  const format: BriefRequest['formato'] =
    strategicBrief.format === 'reel' || strategicBrief.format === 'carrusel'
      ? strategicBrief.format
      : 'carrusel';

  const brief: BriefRequest = {
    idea: `${strategicBrief.topic}. ${strategicBrief.angle}`,
    formato: format,
    plataformas: strategicBrief.platforms,
    ...overrides,
  };

  log.info(`[briefFromStrategy] Brief #${strategicBrief.id} → ${format}: ${brief.idea}`);
  return briefToPublish(brand, brief);
};
