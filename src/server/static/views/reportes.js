import { loadingScreen } from '../lib/ui.js';
import { crearPanelReportes } from './reportesPanel.js';

export const renderReportes = async (root) => {
  const panel = crearPanelReportes();
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">📄 Reportes</h1>
        <p class="view-subtitle page-subtitle">Resumen ejecutivo con datos reales. Imprimí o guardá como PDF.</p>
      </div>
    </header>
    <div id="reportes-content" class="page-body">${loadingScreen()}</div>`;
  const contenido = root.querySelector('#reportes-content');
  await panel.cargar();
  contenido.innerHTML = panel.html();
  panel.wire(contenido);
};
