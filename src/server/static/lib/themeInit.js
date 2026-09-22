/* Tema aplicado ANTES de pintar CSS → sin parpadeo (FOUC).
   Externalizado desde index.html: el CSP del servidor (script-src 'self', sin
   'unsafe-inline') bloquea scripts inline — esto tiene que ser un archivo real,
   cargado de forma síncrona en <head> antes del primer paint. */
(function () {
  try {
    var t = localStorage.getItem('fx_theme');
    if (!t) t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
