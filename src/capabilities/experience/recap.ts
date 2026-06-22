/**
 * Recap "Wrapped" — el momento compartible (prueba social → estatus → necesidad)
 * ─────────────────────────────────────────────────────────────────────────
 * Genera un resumen visual del imperio del fundador, listo para postear:
 *   • SVG ANIMADO (archivo standalone, premium, se mueve solo)
 *   • PNG estático (para plataformas que exigen ráster)
 *
 * Todo determinista (reusa computeLeverage). Sin dependencias.
 */

import type { BrandProfile } from '../../config/types.js';
import { computeLeverage } from './executiveBrief.js';
import { renderCarruselSlidePng } from '../render/index.js';
import type { CarruselSlide } from '../content/carrusel.js';

const TIERS: Array<{ t: string; min: number }> = [
  { t: 'Bronce', min: 0 },
  { t: 'Plata', min: 50 },
  { t: 'Oro', min: 200 },
  { t: 'Platino', min: 600 },
  { t: 'Visionario', min: 1500 },
];
const tierOf = (acc: number): string => {
  let cur = 'Bronce';
  for (const x of TIERS) if (acc >= x.min) cur = x.t;
  return cur;
};

export interface RecapData {
  marca: string;
  anio: number;
  apalancamiento: string;
  acciones: number;
  indicaciones: number;
  equipo: number;
  ahorroAnualUsd: number;
  horas: number;
  tier: string;
}

export const buildRecapData = (brand: BrandProfile): RecapData => {
  const l = computeLeverage(brand.name);
  return {
    marca: brand.name,
    anio: new Date().getFullYear(),
    apalancamiento: l.ratioLabel,
    acciones: l.accionesEjecutadas,
    indicaciones: l.indicacionesDadas,
    equipo: l.equipoReemplazado,
    ahorroAnualUsd: l.ahorroAnualUsd,
    horas: l.horasHumanasAhorradas,
    tier: tierOf(l.accionesEjecutadas),
  };
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const usd = (n: number): string => '$' + n.toLocaleString('en-US');

/** SVG 1080×1080 animado (Instagram-ready), archivo autónomo. */
export const recapSvg = (brand: BrandProfile): string => {
  const d = buildRecapData(brand);
  const pal = brand.visual.palette;
  const bg = pal[0] ?? '#0b0b0f';
  const fg = pal[1] ?? '#ffffff';
  const ac = pal[2] ?? '#e1306c';
  const row = (delay: number, y: number, big: string, lbl: string): string => `
    <g opacity="0" transform="translate(0,18)">
      <animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur="0.6s" fill="freeze"/>
      <animateTransform attributeName="transform" type="translate" from="0 18" to="0 0" begin="${delay}s" dur="0.6s" fill="freeze"/>
      <text x="540" y="${y}" text-anchor="middle" font-size="92" font-weight="800" fill="${fg}" font-family="Inter,system-ui,sans-serif">${esc(big)}</text>
      <text x="540" y="${y + 46}" text-anchor="middle" font-size="30" fill="${fg}" opacity="0.65" font-family="Inter,system-ui,sans-serif">${esc(lbl)}</text>
    </g>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bgv" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="acv" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${ac}"/><stop offset="1" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bgv)"/>
  <circle cx="540" cy="540" r="520" fill="none" stroke="${ac}" stroke-opacity="0.08" stroke-width="2"/>
  <text x="540" y="120" text-anchor="middle" font-size="34" font-weight="700" fill="${fg}" opacity="0.7" font-family="Inter,system-ui,sans-serif">
    ${esc(d.marca)} · ${d.anio}
    <animate attributeName="opacity" from="0" to="0.7" dur="0.6s" fill="freeze"/>
  </text>
  <text x="540" y="200" text-anchor="middle" font-size="46" font-weight="800" fill="url(#acv)" font-family="Inter,system-ui,sans-serif">MI AÑO CON FEEDIA</text>
  ${row(0.5, 330, d.apalancamiento, 'apalancamiento · mis órdenes → acciones del sistema')}
  ${row(1.1, 470, d.acciones.toLocaleString('es-AR'), 'acciones ejecutadas para mí')}
  ${row(1.7, 610, String(d.equipo) + ' roles', 'equipo senior reemplazado sin nómina')}
  ${row(2.3, 750, usd(d.ahorroAnualUsd), 'ahorrados este año en sueldos')}
  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="2.9s" dur="0.7s" fill="freeze"/>
    <rect x="380" y="840" width="320" height="74" rx="37" fill="url(#acv)"/>
    <text x="540" y="888" text-anchor="middle" font-size="38" font-weight="800" fill="#fff" font-family="Inter,system-ui,sans-serif">NIVEL ${esc(d.tier.toUpperCase())}</text>
  </g>
  <text x="540" y="1010" text-anchor="middle" font-size="26" fill="${fg}" opacity="0.5" font-family="Inter,system-ui,sans-serif">Comando un equipo de IA · Powered by FeedIA</text>
</svg>`;
};

/** PNG estático ráster (reusa el rasterizer puro). */
export const recapPng = (brand: BrandProfile): { buffer: Uint8Array; dataUri: string } => {
  const d = buildRecapData(brand);
  const slide: CarruselSlide = {
    numero: 1,
    titulo: `MI AÑO CON FEEDIA · ${d.anio}`,
    cuerpo:
      `Apalancamiento ${d.apalancamiento}  |  ${d.acciones} acciones ejecutadas  |  ` +
      `${d.equipo} roles senior reemplazados  |  ${usd(d.ahorroAnualUsd)} ahorrados  |  ` +
      `${d.horas} h que no invertí  |  Nivel ${d.tier}`,
    rolEnNarrativa: 'climax',
    direccionVisual: '',
  };
  return renderCarruselSlidePng(slide, brand, 1);
};
