import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import {
  evaluate,
  recordSuccess,
  recordFailure,
  checkEmergencyBeforeAction,
  type GuardianContext,
} from '../compliance/index.js';
import { actionGate } from '../glassbox/index.js';
import type { ActionCategory } from '../compliance/index.js';
import { resolveMetaCredentials, type MetaAccountCredentials } from './metaAccountResolver.js';
import { metaFetch } from './metaApiClient.js';

export interface PublishRequest {
  format: 'reel' | 'carrusel' | 'imagen' | 'historia';
  caption?: string;
  mediaUrls: string[];
  scheduledAt?: string;
  firstComment?: string;
  accountId?: string;
}

export interface PublishResult {
  ok: boolean;
  postId?: string;
  url?: string;
  scheduled: boolean;
  error?: string;
}

export interface MetaInbound {
  type: 'dm' | 'comentario' | 'mencion';
  id: string;
  remitente: string;
  texto: string;
  postId?: string;
  recibidoEn: string;
}

const guard = (creds?: MetaAccountCredentials | null): boolean => {
  const accessToken = creds?.accessToken ?? env.meta.accessToken;
  const igBusinessId = creds?.igBusinessId ?? env.meta.igBusinessId;
  if (!accessToken || !igBusinessId) {
    log.warn(
      'Meta API no configurada para esta cuenta. Operando en modo simulado. Conectá la cuenta vía OAuth o configurá META_ACCESS_TOKEN y META_IG_BUSINESS_ID en .env',
    );
    return false;
  }
  return true;
};

/**
 * Verifica que los términos de compliance hayan sido aceptados.
 */
const complianceAccepted = (): boolean => {
  if (!env.compliance.acceptedTerms) {
    log.error(
      'COMPLIANCE: Los términos de servicio no han sido aceptados. Leé TERMS_OF_SERVICE.md y seteá COMPLIANCE_ACCEPTED_TERMS=true en .env antes de operar.',
    );
    return false;
  }
  return true;
};

/* ── GlassBox helper ───────────────────────────────────────────────────── */

const wrapWithGate = async <T>(
  actionType: string,
  description: string,
  fn: () => Promise<T>,
  opts: {
    actionCategory: ActionCategory;
    guardianContext?: Partial<GuardianContext>;
    correlationId?: string;
  },
): Promise<(T & { ok?: boolean; error?: string }) | { ok: false; error: string }> => {
  const result = await actionGate(actionType, description, fn, {
    actionCategory: opts.actionCategory,
    guardianContext: opts.guardianContext,
    source: 'meta',
    correlationId: opts.correlationId ?? `meta-${Date.now()}`,
  });
  if (!result.ok) {
    return { ok: false, error: result.reason ?? 'Bloqueado por GlassBox' };
  }
  return result.result as T & { ok?: boolean; error?: string };
};

export const publishToInstagram = async (req: PublishRequest): Promise<PublishResult> => {
  if (!checkEmergencyBeforeAction('publishToInstagram')) {
    return { ok: false, scheduled: false, error: 'Sistema en estado de emergencia. No se permiten publicaciones.' };
  }
  if (!complianceAccepted()) {
    return {
      ok: false,
      scheduled: false,
      error: 'Términos de compliance no aceptados. Ver TERMS_OF_SERVICE.md',
    };
  }

  const ctx: GuardianContext = {
    actor: 'integration:meta:publish',
    contentText: req.caption,
    humanInitiated: false,
  };

  const decision = evaluate('publish', ctx);
  if (!decision.allowed) {
    log.error(`[COMPLIANCE] Publicación bloqueada: ${decision.reason}`);
    return { ok: false, scheduled: false, error: `Compliance: ${decision.reason}` };
  }

  const creds = await resolveMetaCredentials(req.accountId ?? 'default');

  return wrapWithGate(
    'publish',
    `Publicar ${req.format} en Instagram${req.caption ? `: "${req.caption.slice(0, 60)}..."` : ''}`,
    async () => {
      if (env.dryRun || !guard(creds)) {
        log.info(
          `[DRY RUN] Publicaría ${req.format} con ${req.mediaUrls.length} medios. Caption: "${req.caption?.slice(0, 80) ?? ''}..."`,
        );
        recordSuccess('publish', ctx, `simulated-${Date.now()}`);
        return { ok: true, scheduled: !!req.scheduledAt, postId: `simulated-${Date.now()}` } as PublishResult;
      }

      try {
        const igId = creds!.igBusinessId;
        const token = creds!.accessToken;
        const BASE = 'https://graph.facebook.com/v18.0';

        let containerId: string;

        if (req.format === 'carrusel') {
          const children: string[] = [];
          for (const url of req.mediaUrls) {
            const childRes = await metaFetch(
              `${BASE}/${igId}/media?image_url=${encodeURIComponent(url)}&is_carousel_item=true&access_token=${token}`,
              { method: 'POST' },
              { description: 'Meta carousel child upload' },
            );
            if (!childRes.ok) throw new Error(`Child upload failed: ${await childRes.text()}`);
            const childData = (await childRes.json()) as { id?: string };
            if (!childData.id) throw new Error('Child upload returned no id');
            children.push(childData.id);
          }
          const carouselRes = await metaFetch(
            `${BASE}/${igId}/media?media_type=CAROUSEL&children=${children.join(',')}&caption=${encodeURIComponent(req.caption ?? '')}&access_token=${token}`,
            { method: 'POST' },
            { description: 'Meta carousel container creation' },
          );
          if (!carouselRes.ok) throw new Error(`Carousel creation failed: ${await carouselRes.text()}`);
          containerId = ((await carouselRes.json()) as { id?: string }).id ?? '';
        } else if (req.format === 'reel') {
          const reelRes = await metaFetch(
            `${BASE}/${igId}/media?media_type=REELS&video_url=${encodeURIComponent(req.mediaUrls[0] ?? '')}&caption=${encodeURIComponent(req.caption ?? '')}&access_token=${token}`,
            { method: 'POST' },
            { description: 'Meta reel upload' },
          );
          if (!reelRes.ok) throw new Error(`Reel upload failed: ${await reelRes.text()}`);
          containerId = ((await reelRes.json()) as { id?: string }).id ?? '';
        } else if (req.format === 'historia') {
          const storyRes = await metaFetch(
            `${BASE}/${igId}/media?media_type=STORIES&image_url=${encodeURIComponent(req.mediaUrls[0] ?? '')}&access_token=${token}`,
            { method: 'POST' },
            { description: 'Meta story upload' },
          );
          if (!storyRes.ok) throw new Error(`Story upload failed: ${await storyRes.text()}`);
          containerId = ((await storyRes.json()) as { id?: string }).id ?? '';
        } else {
          const imgRes = await metaFetch(
            `${BASE}/${igId}/media?image_url=${encodeURIComponent(req.mediaUrls[0] ?? '')}&caption=${encodeURIComponent(req.caption ?? '')}&access_token=${token}`,
            { method: 'POST' },
            { description: 'Meta image upload' },
          );
          if (!imgRes.ok) throw new Error(`Image upload failed: ${await imgRes.text()}`);
          containerId = ((await imgRes.json()) as { id?: string }).id ?? '';
        }

        if (!containerId) throw new Error('No container ID received from Meta');

        if (req.format === 'reel') {
          let status = 'IN_PROGRESS';
          let attempts = 0;
          while (status === 'IN_PROGRESS' && attempts < 30) {
            await new Promise((r) => setTimeout(r, 2000));
            const statusRes = await metaFetch(
              `${BASE}/${containerId}?fields=status_code&access_token=${token}`,
              {},
              { description: 'Meta reel status poll' },
            );
            const statusData = (await statusRes.json()) as { status_code?: string };
            status = statusData.status_code ?? 'FINISHED';
            attempts++;
          }
          if (status !== 'FINISHED') throw new Error(`Reel processing failed with status: ${status}`);
        }

        const pubRes = await metaFetch(
          `${BASE}/${igId}/media_publish?creation_id=${containerId}&access_token=${token}`,
          { method: 'POST' },
          { description: 'Meta media publish' },
        );
        if (!pubRes.ok) throw new Error(`Publish failed: ${await pubRes.text()}`);
        const pubData = (await pubRes.json()) as { id?: string };

        if (req.firstComment && pubData.id) {
          await metaFetch(
            `${BASE}/${pubData.id}/comments?message=${encodeURIComponent(req.firstComment)}&access_token=${token}`,
            { method: 'POST' },
            { description: 'Meta first comment' },
          );
        }

        recordSuccess('publish', ctx, pubData.id ?? containerId);
        return { ok: true, scheduled: false, postId: pubData.id } as PublishResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        recordFailure('publish', ctx, msg);
        return { ok: false, scheduled: false, error: msg } as PublishResult;
      }
    },
    { actionCategory: 'publish', guardianContext: ctx, correlationId: `meta-pub-${Date.now()}` },
  ) as Promise<PublishResult>;
};

export const fetchInbound = async (sinceIso: string): Promise<MetaInbound[]> => {
  if (env.dryRun || !guard()) {
    log.debug(`[DRY RUN] Pediría DMs/comentarios desde ${sinceIso}`);
    return [];
  }

  try {
    const igId = env.meta.igBusinessId;
    const token = env.meta.accessToken;
    const BASE = 'https://graph.facebook.com/v18.0';
    const sinceUnix = Math.floor(new Date(sinceIso).getTime() / 1000);

    const mediaRes = await metaFetch(
      `${BASE}/${igId}/media?fields=id,timestamp&since=${sinceUnix}&limit=50&access_token=${token}`,
      {},
      { description: 'Meta inbound media list' },
    );
    const mediaData = (await mediaRes.json()) as { data?: Array<{ id: string; timestamp: string }> };
    const mediaItems = mediaData.data ?? [];

    const inbounds: MetaInbound[] = [];

    for (const media of mediaItems) {
      let commentsRes: Response;
      try {
        commentsRes = await metaFetch(
          `${BASE}/${media.id}/comments?fields=id,username,text,timestamp&limit=100&access_token=${token}`,
          {},
          { description: 'Meta comments list' },
        );
      } catch {
        continue;
      }
      if (!commentsRes.ok) continue;
      const commentsData = (await commentsRes.json()) as {
        data?: Array<{ id: string; username?: string; text?: string; timestamp?: string }>;
      };
      for (const c of commentsData.data ?? []) {
        inbounds.push({
          type: 'comentario',
          id: c.id,
          remitente: c.username ?? 'unknown',
          texto: c.text ?? '',
          postId: media.id,
          recibidoEn: c.timestamp ?? new Date().toISOString(),
        });
      }

      let mentionsRes: Response;
      try {
        mentionsRes = await metaFetch(
          `${BASE}/${media.id}?fields=mentions&access_token=${token}`,
          {},
          { description: 'Meta mentions' },
        );
      } catch {
        continue;
      }
      if (mentionsRes.ok) {
        const mentionsData = (await mentionsRes.json()) as {
          mentions?: Array<{ username?: string }>;
        };
        for (const m of mentionsData.mentions ?? []) {
          if (m.username) {
            inbounds.push({
              type: 'mencion',
              id: `${media.id}-mention-${m.username}`,
              remitente: m.username,
              texto: `@${m.username} te mencionó`,
              postId: media.id,
              recibidoEn: media.timestamp,
            });
          }
        }
      }
    }

    const dmWebhook = process.env.META_DM_WEBHOOK_URL;
    if (dmWebhook) {
      try {
        const dmRes = await fetch(`${dmWebhook}?since=${sinceIso}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (dmRes.ok) {
          const dmData = (await dmRes.json()) as Array<{
            id: string;
            sender_id: string;
            text: string;
            timestamp: string;
          }>;
          for (const dm of dmData ?? []) {
            inbounds.push({
              type: 'dm',
              id: dm.id,
              remitente: dm.sender_id,
              texto: dm.text,
              recibidoEn: dm.timestamp,
            });
          }
        }
      } catch (e) {
        log.warn(`DM webhook fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    log.info(`fetchInbound: ${inbounds.length} items (comments + mentions + DMs via webhook)`);
    return inbounds;
  } catch (err) {
    log.error(`fetchInbound error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
};

export const replyToComment = async (commentId: string, text: string): Promise<{ ok: boolean; error?: string }> => {
  if (!checkEmergencyBeforeAction('replyToComment')) {
    return { ok: false, error: 'Sistema en estado de emergencia. No se permiten respuestas.' };
  }
  if (!complianceAccepted()) {
    return { ok: false, error: 'Términos de compliance no aceptados. Ver TERMS_OF_SERVICE.md' };
  }

  const ctx: GuardianContext = {
    actor: 'integration:meta:replyToComment',
    targetContentId: commentId,
    contentText: text,
    humanInitiated: false,
  };

  const decision = evaluate('comment_reply', ctx);
  if (!decision.allowed) {
    log.error(`[COMPLIANCE] Respuesta a comentario bloqueada: ${decision.reason}`);
    return { ok: false, error: `Compliance: ${decision.reason}` };
  }

  return wrapWithGate(
    'reply_comment',
    `Responder comentario ${commentId}: "${text.slice(0, 60)}..."`,
    async () => {
      if (env.dryRun || !guard()) {
        log.info(`[DRY RUN] Respondería comentario ${commentId}: "${text.slice(0, 60)}..."`);
        recordSuccess('comment_reply', ctx, commentId);
        return { ok: true };
      }

      try {
        const token = env.meta.accessToken;
        const BASE = 'https://graph.facebook.com/v18.0';
        const res = await metaFetch(
          `${BASE}/${commentId}/replies?message=${encodeURIComponent(text)}&access_token=${token}`,
          { method: 'POST' },
          { description: 'Meta reply to comment' },
        );
        if (!res.ok) {
          const errText = await res.text();
          recordFailure('comment_reply', ctx, errText);
          return { ok: false, error: errText };
        }
        recordSuccess('comment_reply', ctx, commentId);
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        recordFailure('comment_reply', ctx, msg);
        return { ok: false, error: msg };
      }
    },
    { actionCategory: 'comment_reply', guardianContext: ctx, correlationId: `meta-reply-${Date.now()}` },
  ) as Promise<{ ok: boolean; error?: string }>;
};

export const sendDm = async (igUserId: string, text: string): Promise<{ ok: boolean; error?: string }> => {
  if (!checkEmergencyBeforeAction('sendDm')) {
    return { ok: false, error: 'Sistema en estado de emergencia. No se permiten DMs.' };
  }
  if (!complianceAccepted()) {
    return { ok: false, error: 'Términos de compliance no aceptados. Ver TERMS_OF_SERVICE.md' };
  }

  const ctx: GuardianContext = {
    actor: 'integration:meta:sendDm',
    targetIgUserId: igUserId,
    contentText: text,
    humanInitiated: false,
  };

  const decision = evaluate('dm', ctx);
  if (!decision.allowed) {
    log.error(`[COMPLIANCE] DM bloqueado: ${decision.reason}`);
    return { ok: false, error: `Compliance: ${decision.reason}` };
  }

  return wrapWithGate(
    'send_dm',
    `Enviar DM a ${igUserId}: "${text.slice(0, 60)}..."`,
    async () => {
      if (env.dryRun || !guard()) {
        log.info(`[DRY RUN] Enviaría DM a ${igUserId}: "${text.slice(0, 60)}..."`);
        recordSuccess('dm', ctx);
        return { ok: true };
      }

      try {
        const dmWebhook = process.env.META_DM_WEBHOOK_URL;
        if (dmWebhook) {
          const res = await fetch(dmWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_ig_user_id: igUserId, message: text }),
          });
          if (!res.ok) throw new Error(`DM webhook failed: ${await res.text()}`);
          recordSuccess('dm', ctx);
          return { ok: true };
        }
        const msg =
          'Instagram Graph API no permite enviar DMs. Configurá META_DM_WEBHOOK_URL apuntando a un servicio con Messenger API, o usá Make/n8n.';
        recordFailure('dm', ctx, msg);
        return { ok: false, error: msg };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        recordFailure('dm', ctx, msg);
        return { ok: false, error: msg };
      }
    },
    { actionCategory: 'dm', guardianContext: ctx, correlationId: `meta-dm-${Date.now()}` },
  ) as Promise<{ ok: boolean; error?: string }>;
};

export const commentOnPost = async (
  mediaId: string,
  text: string,
): Promise<{ ok: boolean; commentId?: string; error?: string }> => {
  if (!complianceAccepted()) {
    return { ok: false, error: 'Términos de compliance no aceptados. Ver TERMS_OF_SERVICE.md' };
  }

  const ctx: GuardianContext = {
    actor: 'integration:meta:commentOnPost',
    targetContentId: mediaId,
    contentText: text,
    humanInitiated: false,
  };

  const decision = evaluate('comment_external', ctx);
  if (!decision.allowed) {
    log.error(`[COMPLIANCE] Comentario en post bloqueado: ${decision.reason}`);
    return { ok: false, error: `Compliance: ${decision.reason}` };
  }

  return wrapWithGate(
    'comment_external',
    `Comentar en post ${mediaId}: "${text.slice(0, 60)}..."`,
    async () => {
      if (env.dryRun || !guard()) {
        log.info(`[DRY RUN] Comentaría en post ${mediaId}: "${text.slice(0, 60)}..."`);
        recordSuccess('comment_external', ctx, mediaId);
        return { ok: true, commentId: `dry-run-comment-${Date.now()}` };
      }

      try {
        const url = `https://graph.facebook.com/v18.0/${mediaId}/comments`;
        const res = await metaFetch(
          `${url}?message=${encodeURIComponent(text)}&access_token=${env.meta.accessToken}`,
          { method: 'POST' },
          { description: 'Meta comment on post' },
        );
        if (!res.ok) {
          const err = await res.text();
          recordFailure('comment_external', ctx, err);
          return { ok: false, error: err };
        }
        const data = (await res.json()) as { id?: string };
        recordSuccess('comment_external', ctx, mediaId);
        return { ok: true, commentId: data.id };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        recordFailure('comment_external', ctx, msg);
        return { ok: false, error: msg };
      }
    },
    { actionCategory: 'comment_external', guardianContext: ctx, correlationId: `meta-comment-${Date.now()}` },
  ) as Promise<{ ok: boolean; commentId?: string; error?: string }>;
};

export const deleteComment = async (commentId: string): Promise<{ ok: boolean; error?: string }> =>
  wrapWithGate(
    'delete_comment',
    `Eliminar comentario ${commentId}`,
    async () => {
      if (env.dryRun || !guard()) {
        log.warn(`[DRY RUN] Eliminaría comentario ${commentId}`);
        return { ok: true };
      }

      try {
        const token = env.meta.accessToken;
        const BASE = 'https://graph.facebook.com/v18.0';
        const res = await metaFetch(
          `${BASE}/${commentId}?access_token=${token}`,
          { method: 'DELETE' },
          { description: 'Meta delete comment' },
        );
        if (!res.ok) {
          const errText = await res.text();
          return { ok: false, error: errText };
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
    { actionCategory: 'api_request', correlationId: `meta-del-${Date.now()}` },
  ) as Promise<{ ok: boolean; error?: string }>;
