import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { BrandProfile } from '../config/types.js';

export type ContentFormat = 'reel' | 'carrusel' | 'stories' | 'post-imagen';
export type ContentStatus = 'draft' | 'auditing' | 'approved' | 'rejected';

export interface ContentPiece {
  id: string;
  agentId: string;
  format: ContentFormat;
  status: ContentStatus;
  aestheticScore: number;
  brandConsistencyScore: number;
  voiceScore: number;
  safetyScore: number;
  payload: unknown;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditTrailEntry {
  agentId: string;
  action: string;
  timestamp: string;
  result: string;
  correlationId: string;
}

export interface SharedProductionContext {
  correlationId: string;
  campaignName: string;
  brief: {
    objective: string;
    targetAudience: string;
    keyMessage: string;
    mandatoryElements: string[];
    forbiddenElements: string[];
    toneOverride?: string;
    visualDirection?: string;
  };
  assets: {
    logos: string[];
    avatars: string[];
    highlightCovers: string[];
    watermarks: string[];
    photos: string[];
    moodboards: string[];
  };
  contentPieces: ContentPiece[];
  auditTrail: AuditTrailEntry[];
  checkpoints: string[];
  brandId: string;
  createdAt: string;
  updatedAt: string;
}

const CAMPAIGNS_DIR = 'data/runtime/campaigns';

function ctxPath(correlationId: string): string {
  return join(CAMPAIGNS_DIR, `${correlationId}.json`);
}

function ensureDir(): void {
  if (!existsSync(CAMPAIGNS_DIR)) mkdirSync(CAMPAIGNS_DIR, { recursive: true });
}

export const createSharedContext = (
  campaignName: string,
  brief: SharedProductionContext['brief'],
  brand: BrandProfile,
): SharedProductionContext => {
  const ctx: SharedProductionContext = {
    correlationId: `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    campaignName,
    brief,
    assets: { logos: [], avatars: [], highlightCovers: [], watermarks: [], photos: [], moodboards: [] },
    contentPieces: [],
    auditTrail: [],
    checkpoints: [],
    brandId: brand.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  persistContext(ctx);
  return ctx;
};

export const persistContext = (ctx: SharedProductionContext): void => {
  ensureDir();
  ctx.updatedAt = new Date().toISOString();
  writeFileSync(ctxPath(ctx.correlationId), JSON.stringify(ctx, null, 2), 'utf-8');
};

export const loadContext = (correlationId: string): SharedProductionContext | null => {
  ensureDir();
  const path = ctxPath(correlationId);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as SharedProductionContext;
  } catch {
    return null;
  }
};

export const addContentPiece = (
  ctx: SharedProductionContext,
  piece: Omit<ContentPiece, 'id' | 'createdAt' | 'updatedAt'>,
): ContentPiece => {
  const fullPiece: ContentPiece = {
    ...piece,
    id: `piece-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  ctx.contentPieces.push(fullPiece);
  persistContext(ctx);
  return fullPiece;
};

export const updateContentPiece = (
  ctx: SharedProductionContext,
  pieceId: string,
  updates: Partial<Omit<ContentPiece, 'id' | 'createdAt'>>,
): ContentPiece | null => {
  const piece = ctx.contentPieces.find((p) => p.id === pieceId);
  if (!piece) return null;
  Object.assign(piece, updates, { updatedAt: new Date().toISOString() });
  persistContext(ctx);
  return piece;
};

export const getApprovedPieces = (ctx: SharedProductionContext): ContentPiece[] =>
  ctx.contentPieces.filter((p) => p.status === 'approved');

export const getPendingAudits = (ctx: SharedProductionContext): ContentPiece[] =>
  ctx.contentPieces.filter((p) => p.status === 'draft' || p.status === 'auditing');

export const addAuditEntry = (
  ctx: SharedProductionContext,
  entry: Omit<AuditTrailEntry, 'timestamp' | 'correlationId'>,
): void => {
  ctx.auditTrail.push({
    ...entry,
    timestamp: new Date().toISOString(),
    correlationId: ctx.correlationId,
  });
  persistContext(ctx);
};

export const formatContextForAgent = (ctx: SharedProductionContext): string => {
  const pieces = ctx.contentPieces
    .map(
      (p) =>
        `- ${p.id} (${p.format}) | Score: C${p.brandConsistencyScore}/A${p.aestheticScore}/V${p.voiceScore}/S${p.safetyScore} | Status: ${p.status} | Agent: ${p.agentId}`,
    )
    .join('\n');

  const assets = Object.entries(ctx.assets)
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `- ${k}: ${v.length} assets`)
    .join('\n');

  return `
📋 SHARED PRODUCTION CONTEXT
Campaña: ${ctx.campaignName}
Objetivo: ${ctx.brief.objective}
Mensaje clave: ${ctx.brief.keyMessage}
Audiencia: ${ctx.brief.targetAudience}
Elementos obligatorios: ${ctx.brief.mandatoryElements.join(', ') || 'ninguno'}
Elementos prohibidos: ${ctx.brief.forbiddenElements.join(', ') || 'ninguno'}
${ctx.brief.toneOverride ? `Tono override: ${ctx.brief.toneOverride}` : ''}
${ctx.brief.visualDirection ? `Dirección visual: ${ctx.brief.visualDirection}` : ''}

🎨 ASSETS DISPONIBLES:
${assets || 'Ninguno aún'}

📝 PIEZAS DE CONTENIDO:
${pieces || 'Ninguna aún'}

⏱️ Última actualización: ${ctx.updatedAt}
`;
};
