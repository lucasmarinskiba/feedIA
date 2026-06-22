import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { getUserAccessToken } from './canvaAuth.js';

const CANVA_API = 'https://api.canva.com/rest/v1';

export type CanvaFieldType = 'text' | 'image';

export interface CanvaTextField {
  type: 'text';
  text: string;
}

export interface CanvaImageField {
  type: 'image';
  asset_id: string;
}

export type CanvaField = CanvaTextField | CanvaImageField;

export interface AutofillRequest {
  brandTemplateId: string;
  title: string;
  data: Record<string, CanvaField>;
  userHandle?: string;
}

export interface AutofillResult {
  ok: boolean;
  designId?: string;
  designUrl?: string;
  error?: string;
}

export interface ExportRequest {
  designId: string;
  format: 'png' | 'jpg' | 'pdf' | 'mp4' | 'gif';
  quality?: 'low' | 'medium' | 'high';
  userHandle?: string;
}

export interface ExportResult {
  ok: boolean;
  urls?: string[];
  error?: string;
}

interface CanvaTokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: CanvaTokenCache | null = null;

const refreshGlobalAccessToken = async (): Promise<string | null> => {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }
  if (env.canva.staticToken) {
    tokenCache = { accessToken: env.canva.staticToken, expiresAt: Date.now() + 3600_000 };
    return env.canva.staticToken;
  }
  if (!env.canva.clientId || !env.canva.clientSecret || !env.canva.refreshToken) {
    return null;
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.canva.refreshToken,
  });
  const auth = Buffer.from(`${env.canva.clientId}:${env.canva.clientSecret}`).toString('base64');
  const res = await fetch(`${CANVA_API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    log.error(`Canva OAuth respondió ${res.status}: ${await res.text()}`);
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
};

export const getCanvaAccessToken = async (userHandle?: string): Promise<string | null> => {
  if (userHandle) {
    const token = await getUserAccessToken(userHandle);
    if (!token) {
      log.warn(
        `Usuario ${userHandle} no tiene cuenta de Canva conectada. Ejecutá: npm run dev canva-connect --handle=${userHandle}`,
      );
      return null;
    }
    return token;
  }
  const token = await refreshGlobalAccessToken();
  if (!token) {
    log.warn(
      'Canva no configurado. Definí CANVA_API_TOKEN o (CANVA_CLIENT_ID + CANVA_CLIENT_SECRET + CANVA_REFRESH_TOKEN) en .env',
    );
    return null;
  }
  return token;
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface PollOptions {
  maxAttempts?: number;
  intervalMs?: number;
}

const pollJob = async <T>(
  url: string,
  token: string,
  isDone: (data: T) => boolean,
  opts: PollOptions = {},
): Promise<T | null> => {
  const max = opts.maxAttempts ?? 30;
  const interval = opts.intervalMs ?? 2000;
  for (let i = 0; i < max; i += 1) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      log.error(`Polling Canva falló (${res.status})`);
      return null;
    }
    const data = (await res.json()) as T;
    if (isDone(data)) return data;
    await sleep(interval);
  }
  log.error(`Canva polling timeout en ${url}`);
  return null;
};

interface AutofillJobResponse {
  job: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
    result?: { type: 'create_design'; design: { id: string; url: string } };
    error?: { code: string; message: string };
  };
}

export const autofillTemplate = async (req: AutofillRequest): Promise<AutofillResult> => {
  if (env.dryRun) {
    log.info(`[DRY RUN] Canva autofill template ${req.brandTemplateId} → "${req.title}"`);
    return {
      ok: true,
      designId: `simulated-${Date.now()}`,
      designUrl: 'https://canva.com/design/simulated',
    };
  }
  const token = await getCanvaAccessToken(req.userHandle);
  if (!token)
    return { ok: false, error: req.userHandle ? `Canva no conectado para ${req.userHandle}` : 'Canva no configurado' };

  const startRes = await fetch(`${CANVA_API}/autofills`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      brand_template_id: req.brandTemplateId,
      title: req.title,
      data: req.data,
    }),
  });
  if (!startRes.ok) {
    return { ok: false, error: `Canva autofill start ${startRes.status}: ${await startRes.text()}` };
  }
  const startJson = (await startRes.json()) as AutofillJobResponse;
  const jobId = startJson.job.id;

  const finalJob = await pollJob<AutofillJobResponse>(
    `${CANVA_API}/autofills/${jobId}`,
    token,
    (j) => j.job.status !== 'in_progress',
  );
  if (!finalJob) return { ok: false, error: 'Timeout esperando autofill' };
  if (finalJob.job.status !== 'success' || !finalJob.job.result) {
    return { ok: false, error: finalJob.job.error?.message ?? 'autofill falló' };
  }
  return {
    ok: true,
    designId: finalJob.job.result.design.id,
    designUrl: finalJob.job.result.design.url,
  };
};

interface ExportJobResponse {
  job: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
    urls?: string[];
    error?: { code: string; message: string };
  };
}

export const exportDesign = async (req: ExportRequest): Promise<ExportResult> => {
  if (env.dryRun) {
    log.info(`[DRY RUN] Canva export ${req.designId} → ${req.format}`);
    return { ok: true, urls: [`https://canva.com/export/simulated.${req.format}`] };
  }
  const token = await getCanvaAccessToken(req.userHandle);
  if (!token)
    return { ok: false, error: req.userHandle ? `Canva no conectado para ${req.userHandle}` : 'Canva no configurado' };

  const startRes = await fetch(`${CANVA_API}/exports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_id: req.designId,
      format: { type: req.format, quality: req.quality ?? 'high' },
    }),
  });
  if (!startRes.ok) {
    return { ok: false, error: `Canva export start ${startRes.status}: ${await startRes.text()}` };
  }
  const startJson = (await startRes.json()) as ExportJobResponse;
  const jobId = startJson.job.id;

  const finalJob = await pollJob<ExportJobResponse>(
    `${CANVA_API}/exports/${jobId}`,
    token,
    (j) => j.job.status !== 'in_progress',
  );
  if (!finalJob) return { ok: false, error: 'Timeout esperando export' };
  if (finalJob.job.status !== 'success' || !finalJob.job.urls) {
    return { ok: false, error: finalJob.job.error?.message ?? 'export falló' };
  }
  return { ok: true, urls: finalJob.job.urls };
};

export interface UploadAssetRequest {
  fileBytes: Buffer | Uint8Array;
  filename: string;
  mimeType: string;
  userHandle?: string;
}

interface AssetUploadResponse {
  job: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
    asset?: { id: string; thumbnail?: { url: string } };
    error?: { code: string; message: string };
  };
}

// ── Extended REST API ────────────────────────────────────────────────────────

export interface DesignCreateRequest {
  title: string;
  designType: string;
  userHandle?: string;
}

interface DesignCreateResponse {
  design: { id: string; url: string; thumbnail?: { url: string } };
}

export const createDesign = async (
  req: DesignCreateRequest,
): Promise<{ ok: boolean; designId?: string; designUrl?: string; error?: string }> => {
  if (env.dryRun) {
    log.info(`[DRY RUN] Canva createDesign "${req.title}"`);
    return { ok: true, designId: `sim-${Date.now()}`, designUrl: 'https://canva.com/design/sim' };
  }
  const token = await getCanvaAccessToken(req.userHandle);
  if (!token) return { ok: false, error: 'Canva no configurado' };

  const res = await fetch(`${CANVA_API}/designs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: req.title, design_type: { type: req.designType } }),
  });
  if (!res.ok) return { ok: false, error: `createDesign ${res.status}: ${await res.text()}` };
  const json = (await res.json()) as DesignCreateResponse;
  return { ok: true, designId: json.design.id, designUrl: json.design.url };
};

export interface GetDesignRequest {
  designId: string;
  userHandle?: string;
}

interface DesignResponse {
  design: {
    id: string;
    title: string;
    url: string;
    thumbnail?: { url: string };
    page_count?: number;
  };
}

export const getDesign = async (
  req: GetDesignRequest,
): Promise<{ ok: boolean; design?: DesignResponse['design']; error?: string }> => {
  if (env.dryRun) {
    return { ok: true, design: { id: req.designId, title: 'Sim', url: 'https://canva.com/design/sim', page_count: 1 } };
  }
  const token = await getCanvaAccessToken(req.userHandle);
  if (!token) return { ok: false, error: 'Canva no configurado' };

  const res = await fetch(`${CANVA_API}/designs/${req.designId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, error: `getDesign ${res.status}` };
  const json = (await res.json()) as DesignResponse;
  return { ok: true, design: json.design };
};

export interface BrandTemplateSearchRequest {
  query?: string;
  userHandle?: string;
  limit?: number;
}

interface BrandTemplate {
  id: string;
  title: string;
  thumbnail?: { url: string };
}

interface BrandTemplatesResponse {
  items: BrandTemplate[];
  continuation?: string;
}

export const searchBrandTemplates = async (
  req: BrandTemplateSearchRequest,
): Promise<{ ok: boolean; templates?: BrandTemplate[]; error?: string }> => {
  if (env.dryRun) {
    return { ok: true, templates: [{ id: 'BTM-sim', title: req.query ?? 'Template' }] };
  }
  const token = await getCanvaAccessToken(req.userHandle);
  if (!token) return { ok: false, error: 'Canva no configurado' };

  const params = new URLSearchParams();
  if (req.query) params.set('query', req.query);
  if (req.limit) params.set('limit', String(req.limit));

  const res = await fetch(`${CANVA_API}/brand-templates?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, error: `searchBrandTemplates ${res.status}` };
  const json = (await res.json()) as BrandTemplatesResponse;
  return { ok: true, templates: json.items };
};

export interface ResizeDesignRequest {
  designId: string;
  width: number;
  height: number;
  userHandle?: string;
}

interface ResizeJobResponse {
  job: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
    result?: { design: { id: string; url: string } };
    error?: { code: string; message: string };
  };
}

export const resizeDesign = async (
  req: ResizeDesignRequest,
): Promise<{ ok: boolean; designId?: string; designUrl?: string; error?: string }> => {
  if (env.dryRun) {
    return { ok: true, designId: `resized-${req.designId}`, designUrl: 'https://canva.com/design/sim' };
  }
  const token = await getCanvaAccessToken(req.userHandle);
  if (!token) return { ok: false, error: 'Canva no configurado' };

  const startRes = await fetch(`${CANVA_API}/designs/${req.designId}/resize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ design_type: { type: 'custom', width: req.width, height: req.height } }),
  });
  if (!startRes.ok) return { ok: false, error: `resizeDesign ${startRes.status}: ${await startRes.text()}` };
  const startJson = (await startRes.json()) as ResizeJobResponse;
  const jobId = startJson.job.id;

  const finalJob = await pollJob<ResizeJobResponse>(
    `${CANVA_API}/design-resizes/${jobId}`,
    token,
    (j) => j.job.status !== 'in_progress',
  );
  if (!finalJob || finalJob.job.status !== 'success' || !finalJob.job.result) {
    return { ok: false, error: finalJob?.job.error?.message ?? 'resize falló' };
  }
  return { ok: true, designId: finalJob.job.result.design.id, designUrl: finalJob.job.result.design.url };
};

export const uploadAsset = async (
  req: UploadAssetRequest,
): Promise<{ ok: boolean; assetId?: string; error?: string }> => {
  if (env.dryRun) {
    log.info(`[DRY RUN] Canva upload "${req.filename}"`);
    return { ok: true, assetId: `simulated-asset-${Date.now()}` };
  }
  const token = await getCanvaAccessToken(req.userHandle);
  if (!token)
    return { ok: false, error: req.userHandle ? `Canva no conectado para ${req.userHandle}` : 'Canva no configurado' };

  const metadata = JSON.stringify({ name_base64: Buffer.from(req.filename).toString('base64') });
  const startRes = await fetch(`${CANVA_API}/asset-uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Asset-Upload-Metadata': metadata,
    },
    body: req.fileBytes as unknown as ReadableStream,
  });
  if (!startRes.ok) {
    return { ok: false, error: `Canva upload start ${startRes.status}: ${await startRes.text()}` };
  }
  const startJson = (await startRes.json()) as AssetUploadResponse;
  const jobId = startJson.job.id;
  const finalJob = await pollJob<AssetUploadResponse>(
    `${CANVA_API}/asset-uploads/${jobId}`,
    token,
    (j) => j.job.status !== 'in_progress',
  );
  if (!finalJob || finalJob.job.status !== 'success' || !finalJob.job.asset) {
    return { ok: false, error: finalJob?.job.error?.message ?? 'upload falló' };
  }
  return { ok: true, assetId: finalJob.job.asset.id };
};
