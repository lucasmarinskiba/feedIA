import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('api/[...path].js', 'utf8');

const igStart = src.indexOf('      const enrichPrompt = isIG');
const ttStart = src.indexOf('        : `CONTEXTO:\n- Topic: "${topic}"\n- Platform: TikTok');

if (igStart === -1 || ttStart === -1) {
  console.error('markers not found', { igStart, ttStart });
  process.exit(1);
}

const newPrompt = `      const enrichPrompt = isIG
        ? \`CONTEXTO: Topic="\${topic}" | Goal=\${goal} | Audiencia=\${plan.input.audience} | Score=\${plan.strategicScore}/100

Sos especialista en contenido viral de Instagram. Para el topic dado, genera los 3 formatos completos con contenido REAL y ESPECIFICO (no placeholders). Responde SOLO JSON valido sin texto extra:

{"igPlans":{"carousel":{"captionHook":"hook caption IG para el scroll max 12 palabras","captionCTA":"que hacer 1 oracion","slideCount":5,"slides":[{"n":1,"role":"hook","title":"TITULO GANCHO 3-5 PALABRAS","subtitle":"1 frase amplia la promesa","bodyText":"2 frases concretas que generan curiosidad","imageText":"texto breve sobre imagen si aplica","visual":"color/fondo/estilo Canva"},{"n":2,"role":"content","title":"Punto 1 corto","subtitle":"1 linea dato o tip","bodyText":"2-3 frases del contenido real punto 1","imageText":"","visual":"descripcion visual slide 2"},{"n":3,"role":"content","title":"Punto 2 corto","subtitle":"1 linea punto 2","bodyText":"2-3 frases del contenido punto 2","imageText":"","visual":"descripcion visual slide 3"},{"n":4,"role":"content","title":"Insight sorpresa","subtitle":"angulo que nadie dice","bodyText":"2 frases del insight mas valioso","imageText":"","visual":"slide contrastante"},{"n":5,"role":"cta","title":"CTA 3-4 palabras","subtitle":"que hacer ahora","bodyText":"1-2 frases cierre y motivacion","imageText":"Guardalo Compartilo Seguime","visual":"frame final impactante"}]},"reel":{"hooks":[{"text":"Hook A verbal max 8 palabras para el scroll","style":"pregunta/dato/shock"},{"text":"Hook B distinto angulo emocional","style":"identificacion/curiosidad"},{"text":"Hook C tercer angulo completamente distinto","style":"contraintuitivo/humor"}],"hookLayer":{"videoText":"TEXTO PANTALLA 3-4 PALABRAS","openingFrame":"descripcion primer frame plano fondo props","poseExpression":"pose y expresion del creador"},"script":{"apertura":"0-3s que decis para retener","beats":[{"n":1,"text":"Beat 1 mismo eje emocional hook","onScreen":"texto pantalla beat 1","visual":"que mostras"},{"n":2,"text":"Beat 2 desarrollo dato demo","onScreen":"","visual":"que mostras beat 2"},{"n":3,"text":"Beat 3 giro o prueba","onScreen":"","visual":"que mostras beat 3"},{"n":4,"text":"Beat 4 cierre hacia CTA","onScreen":"texto pantalla final","visual":"que mostras beat 4"}],"cierre":"CTA verbal exacto"},"cta":"llamado a la accion"},"stories":{"frames":[{"n":1,"role":"hook","mediaType":"video","mediaDescription":"descripcion concreta del video especifico al topic","onScreenText":"TEXTO GRANDE max 6 palabras","supportText":"texto apoyo si aplica","sticker":"Encuesta/ninguno","duration":"5s"},{"n":2,"role":"content","mediaType":"foto","mediaDescription":"descripcion media frame 2","onScreenText":"texto frame 2 claro directo","supportText":"","sticker":"ninguno","duration":"5s"},{"n":3,"role":"content","mediaType":"foto","mediaDescription":"descripcion media frame 3","onScreenText":"punto mas valioso frame 3","supportText":"","sticker":"ninguno","duration":"5s"},{"n":4,"role":"cta","mediaType":"video","mediaDescription":"frame final llamativo","onScreenText":"CTA en pantalla","supportText":"texto apoyo CTA","sticker":"Link/ninguno","duration":"7s"}]}},"guion":{"apertura":"apertura hook","desarrollo":["beat1","beat2","beat3","beat4"],"cierre":"cta"},"ctaOptions":["CTA1","CTA2"],"captionDraft":"caption completo max 280 chars","hashtags":{"core":["#tag1","#tag2","#tag3"],"niche":["#tag4","#tag5"],"trending":["#tag6"]},"platformTip":"tip algoritmo IG 1 oracion","quickWin":"accion mayor impacto 1 oracion"}}\``;

const before = src.slice(0, igStart);
const after = src.slice(ttStart);
const result = before + newPrompt + '\n        ' + after;
writeFileSync('api/[...path].js', result, 'utf8');
console.log('OK — replaced igStart=' + igStart + ' ttStart=' + ttStart);
