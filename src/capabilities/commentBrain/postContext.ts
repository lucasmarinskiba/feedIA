/**
 * Contexto del post y del hilo para el Comment Brain, con cache en memoria.
 *
 * Sin credenciales de Meta (o en dry-run) devuelven null: el brain sigue
 * funcionando pero sin contexto, y baja su propia confianza en consecuencia.
 * Nunca se inventa un caption.
 */

import { fetchCommentThread, fetchMediaContext } from '../../integrations/meta.js';
import type { PostContext, ThreadContext } from './types.js';

const POST_TTL_MS = 10 * 60 * 1000;
const MAX_CACHED_POSTS = 200;

const postCache = new Map<string, { value: PostContext | null; expiresAt: number }>();

export const getPostContext = async (postId: string | undefined, accountId?: string): Promise<PostContext | null> => {
  if (!postId) return null;

  const hit = postCache.get(postId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const media = await fetchMediaContext(postId, accountId);
  const value: PostContext | null = media
    ? { postId, mediaType: media.mediaType, caption: media.caption, permalink: media.permalink }
    : null;

  if (postCache.size >= MAX_CACHED_POSTS) {
    const oldest = postCache.keys().next().value;
    if (oldest) postCache.delete(oldest);
  }
  postCache.set(postId, { value, expiresAt: Date.now() + POST_TTL_MS });
  return value;
};

export const getThreadContext = async (
  commentId: string | undefined,
  accountId?: string,
): Promise<ThreadContext | null> => {
  if (!commentId) return null;
  const thread = await fetchCommentThread(commentId, accountId);
  if (!thread) return null;

  return {
    parent: thread.parent
      ? { handle: thread.parent.username, text: thread.parent.text, isFromBrand: thread.parent.isFromBrand }
      : undefined,
    siblings: thread.siblings.map((s) => ({ handle: s.username, text: s.text, isFromBrand: s.isFromBrand })),
  };
};

/** Solo para tests. */
export const clearPostContextCache = (): void => postCache.clear();
