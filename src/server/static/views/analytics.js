import { loadingScreen } from '../lib/ui.js';
import { crearPanelAnalytics } from './analyticsPanel.js';

export const renderAnalytics = async (root) => {
  const panel = crearPanelAnalytics();
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">📊 Analytics</h1>
        <p class="view-subtitle page-subtitle">Métricas de cuenta, posts, audiencia y crecimiento histórico.</p>
      </div>
    </header>
    <div id="analytics-content" class="page-body">${loadingScreen()}</div>`;
  const contenido = root.querySelector('#analytics-content');
  await panel.cargar();
  contenido.innerHTML = panel.html();
  panel.wire(contenido);
};
