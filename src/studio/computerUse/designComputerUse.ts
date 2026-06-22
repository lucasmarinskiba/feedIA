import { log } from '../../agent/logger.js';
import { executeWithRecovery } from './reliableSession.js';
import type { BrandProfile } from '../../config/types.js';
import type { DesignCommand } from '../controllers/designController.js';

export interface DesignComputerUseResult {
  ok: boolean;
  designUrl?: string;
  exportPath?: string;
  artifactUrls?: string[];
  durationMs: number;
  error?: string;
}

export const executeDesignWithComputerUse = async (
  brand: BrandProfile,
  cmd: DesignCommand,
): Promise<DesignComputerUseResult> => {
  const startMs = Date.now();

  try {
    const goal = buildDesignGoal(brand, cmd);
    log.info(`[DesignComputerUse] Executing: ${goal.substring(0, 100)}...`);

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 14,
      operationName: `Design with ${cmd.tool}`,
      maxRetries: 3,
      onRetry: (attempt, error) => {
        log.warn(`[DesignComputerUse] Retry ${attempt}: ${error.substring(0, 80)}...`);
      },
    });

    if (!result.ok) {
      return {
        ok: false,
        durationMs: Date.now() - startMs,
        error: result.summary || 'Design creation failed',
      };
    }

    // Parse result summary to extract artifact URLs/paths
    const exportPath = parseExportPath(result.summary);
    const designUrl = parseDesignUrl(result.summary, cmd.tool);

    return {
      ok: true,
      designUrl,
      exportPath,
      artifactUrls: exportPath ? [exportPath] : undefined,
      durationMs: Date.now() - startMs,
    };
  } catch (error) {
    log.error(`[DesignComputerUse] Failed: ${error}`);
    return {
      ok: false,
      durationMs: Date.now() - startMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

function buildDesignGoal(brand: BrandProfile, cmd: DesignCommand): string {
  const toolName = cmd.tool.charAt(0).toUpperCase() + cmd.tool.slice(1);
  const brandContext = `Brand: @${brand.name}
Voice: ${brand.voice.tone}
Colors: ${brand.visual.palette.join(', ')}
Mood: ${brand.visual.mood || 'professional'}`;

  switch (cmd.tool) {
    case 'canva':
      return buildCanvaGoal(brandContext, cmd);
    case 'figma':
      return buildFigmaGoal(brandContext, cmd);
    case 'adobe-express':
      return buildAdobeGoal(brandContext, cmd);
    case 'photoshop':
      return buildPhotoshopGoal(brandContext, cmd);
    default:
      return `Design using ${toolName}`;
  }
}

function buildCanvaGoal(brandContext: string, cmd: DesignCommand): string {
  const format = (cmd.params.format as string) || 'instagram-post';
  const customizations = cmd.params.customizations as Record<string, unknown>;

  return `Use Computer Use to create design in Canva:

${brandContext}

DESIGN SPECIFICATIONS:
- Template type: ${format}
- Title: ${cmd.params.title || 'Brand Design'}
${customizations?.textEdits ? `- Text edits: ${JSON.stringify(customizations.textEdits).substring(0, 100)}...` : ''}
${customizations?.imageReplacements ? `- Image replacements: ${customizations.imageReplacements}` : ''}

WORKFLOW:
1. Open canva.com in browser
2. Search for or create ${format} template
3. Apply brand colors and fonts
4. Add/replace text and images as specified
5. Export as PNG/JPG
6. Save to Downloads folder
7. Report download location

Keep design consistent with brand voice and visual identity.`;
}

function buildFigmaGoal(brandContext: string, cmd: DesignCommand): string {
  return `Use Computer Use to create/edit design in Figma:

${brandContext}

DESIGN SPECS:
- File name: ${cmd.params.fileName || 'Brand Design'}
- Dimensions: ${JSON.stringify(cmd.params.dimensions || { width: 1080, height: 1080 })}
- Purpose: ${cmd.params.purpose || 'Instagram Post'}

WORKFLOW:
1. Open figma.com in browser
2. Create new file or open existing
3. Set canvas dimensions
4. Apply brand color palette
5. Add text with brand typography
6. Insert design elements
7. Export frames as PNG
8. Report file URL and export paths`;
}

function buildAdobeGoal(brandContext: string, cmd: DesignCommand): string {
  return `Use Computer Use to create design in Adobe Express:

${brandContext}

DESIGN REQUEST:
- Template: ${cmd.params.template || 'Blank Canvas'}
- Size: ${cmd.params.size || '1080x1080'}
- Text: ${cmd.params.text || '(from brief)'}

WORKFLOW:
1. Open express.adobe.com
2. Start new design with specified template
3. Apply brand visual style
4. Add copy and media
5. Arrange for visual hierarchy
6. Export high-quality PNG
7. Save to local drive or cloud
8. Return download/cloud URL`;
}

function buildPhotoshopGoal(brandContext: string, cmd: DesignCommand): string {
  return `Use Computer Use to create design in Photoshop:

${brandContext}

PROJECT SPECS:
- Document size: ${JSON.stringify(cmd.params.dimensions || { width: 1920, height: 1080 })}
- Color mode: RGB
- Resolution: 72 DPI

WORKFLOW:
1. Launch Photoshop
2. Create new document with specs
3. Set up brand colors in swatches
4. Create design composition
5. Add text layers with brand fonts
6. Merge visible and export as PNG
7. Save PSD to project folder
8. Report file locations`;
}

function parseExportPath(summary: string): string | undefined {
  const downloadMatch = summary.match(/Downloads[\\/]([^\s]+\.(png|jpg|pdf))/i);
  if (downloadMatch) {
    return downloadMatch[0];
  }

  const pathMatch = summary.match(/([A-Za-z]:[\\/][^\s]+\.(png|jpg|pdf))/i);
  return pathMatch ? pathMatch[0] : undefined;
}

function parseDesignUrl(summary: string, tool: string): string | undefined {
  if (tool === 'canva') {
    const canvaMatch = summary.match(/canva\.com\/design\/([^\s]+)/i);
    return canvaMatch ? `https://canva.com/design/${canvaMatch[1]}` : undefined;
  }

  if (tool === 'figma') {
    const figmaMatch = summary.match(/figma\.com\/file\/([^\s]+)/i);
    return figmaMatch ? `https://figma.com/file/${figmaMatch[1]}` : undefined;
  }

  if (tool === 'adobe-express') {
    return 'https://express.adobe.com/';
  }

  return undefined;
}
