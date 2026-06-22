/**
 * Investor One-Pager — modo "presentación a inversores"
 * ─────────────────────────────────────────────────────────────────────────
 * Convierte la operación del sistema en un one-pager imprimible y autónomo
 * (HTML self-contained, sin assets externos) con el lenguaje que un inversor
 * espera: apalancamiento operativo, costo evitado, equipo reemplazado,
 * eficiencia. Determinista — los números salen de computeLeverage.
 *
 * Es a la vez utilidad (fundraising) y estatus (el dueño se ve como CEO con
 * board deck listo en un click).
 */

import type { BrandProfile } from '../../config/types.js';
import { computeLeverage } from './executiveBrief.js';

export interface OnePagerData {
  marca: string;
  fecha: string;
  apalancamiento: string;
  acciones: number;
  indicaciones: number;
  equipoReemplazado: number;
  costoEvitadoMesUsd: number;
  costoEvitadoAnioUsd: number;
  horasAhorradas: number;
  highlights: string[];
}

export const buildOnePagerData = (brand: BrandProfile): OnePagerData => {
  const l = computeLeverage(brand.name);
  return {
    marca: brand.name,
    fecha: new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }),
    apalancamiento: l.ratioLabel,
    acciones: l.accionesEjecutadas,
    indicaciones: l.indicacionesDadas,
    equipoReemplazado: l.equipoReemplazado,
    costoEvitadoMesUsd: l.costoEquipoUsdMes,
    costoEvitadoAnioUsd: l.ahorroAnualUsd,
    horasAhorradas: l.horasHumanasAhorradas,
    highlights: [
      `Cada indicación humana se convierte en ~${l.ratio} acciones ejecutadas (apalancamiento operativo ${l.ratioLabel}).`,
      `Reemplaza un equipo senior de ${l.equipoReemplazado} roles especializados sin nómina, cargas ni rotación.`,
      `Costo de equipo evitado: US$${l.costoEquipoUsdMes.toLocaleString('en-US')}/mes (US$${l.ahorroAnualUsd.toLocaleString('en-US')}/año).`,
      `Opera 24/7 de forma autónoma con gobierno de costos y trazabilidad de cada decisión.`,
      `Estructura escalable: el costo marginal por acción adicional tiende a cero.`,
    ],
  };
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const usd = (n: number): string => 'US$' + n.toLocaleString('en-US');

/** HTML autónomo, imprimible (botón Imprimir → PDF del navegador). */
export const investorOnePagerHtml = (brand: BrandProfile): string => {
  const d = buildOnePagerData(brand);
  const metric = (big: string, lbl: string): string =>
    `<div class="m"><div class="mb">${esc(big)}</div><div class="ml">${esc(lbl)}</div></div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<title>${esc(d.marca)} — One-Pager</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b0f;color:#f5f5f7;padding:48px;max-width:880px;margin:0 auto}
  .tag{display:inline-block;font-size:12px;letter-spacing:.16em;color:#a855f7;font-weight:700}
  h1{font-size:34px;margin:6px 0 4px}
  .sub{color:#9aa;font-size:14px;margin-bottom:28px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
  .m{background:#15151b;border:1px solid #2a2a33;border-radius:14px;padding:20px}
  .mb{font-size:30px;font-weight:800;background:linear-gradient(90deg,#e1306c,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .ml{font-size:12px;color:#9aa;margin-top:8px;line-height:1.4}
  h2{font-size:16px;margin:28px 0 12px;color:#cfcfe0}
  ul{list-style:none}
  li{padding:10px 0;border-bottom:1px solid #20202a;font-size:15px;line-height:1.5}
  li::before{content:"▸ ";color:#e1306c;font-weight:800}
  .ft{margin-top:34px;color:#7a7a88;font-size:12px;display:flex;justify-content:space-between}
  .pbtn{position:fixed;top:20px;right:20px;background:linear-gradient(90deg,#e1306c,#a855f7);color:#fff;border:0;border-radius:999px;padding:10px 18px;font-weight:700;cursor:pointer}
  @media print{body{background:#fff;color:#111}.pbtn{display:none}.m{background:#f4f4f7;border-color:#ddd}.mb{-webkit-text-fill-color:#111}.ml,.sub,.ft{color:#555}li{border-color:#eee}}
</style></head><body>
  <button class="pbtn" onclick="window.print()">Imprimir / PDF</button>
  <div class="tag">CONFIDENCIAL · ONE-PAGER OPERATIVO</div>
  <h1>${esc(d.marca)}</h1>
  <div class="sub">Sistema autónomo de operación de marca en Instagram · ${esc(d.fecha)}</div>
  <div class="grid">
    ${metric(d.apalancamiento, 'Apalancamiento operativo (indicaciones → acciones)')}
    ${metric(d.acciones.toLocaleString('es-AR'), 'Acciones autónomas ejecutadas')}
    ${metric(String(d.equipoReemplazado) + ' roles', 'Equipo senior reemplazado')}
    ${metric(usd(d.costoEvitadoMesUsd) + '/mes', 'Costo de nómina evitado')}
    ${metric(usd(d.costoEvitadoAnioUsd), 'Ahorro anualizado')}
    ${metric(d.horasAhorradas.toLocaleString('es-AR') + ' h', 'Horas humanas no invertidas')}
  </div>
  <h2>Tesis operativa</h2>
  <ul>${d.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
  <div class="ft"><span>Powered by FeedIA</span><span>Generado automáticamente · datos verificables en panel</span></div>
</body></html>`;
};
