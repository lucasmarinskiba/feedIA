import type { BrandProfile } from '../config/types.js';
import { buildExtendedRoutes } from './extendedRoutes.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';

/**
 * Task board + approvals routes from extendedRoutes.ts. Never mounted on
 * Express; taskboard.js needs /api/tasks* and workspace.js needs
 * /api/kanban and /api/approvals*.
 */
const createTasksApprovalsRoutes = (brand: BrandProfile) =>
  adaptRoutesToExpress(
    buildExtendedRoutes(brand).filter(
      (r) =>
        r.pattern.startsWith('/api/tasks') || r.pattern === '/api/kanban' || r.pattern.startsWith('/api/approvals'),
    ),
  );

export default createTasksApprovalsRoutes;
