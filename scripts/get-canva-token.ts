#!/usr/bin/env node
/**
 * Script interactivo para obtener tokens de Canva Connect API vía OAuth 2.0 + PKCE.
 *
 * Flujo:
 * 1. Pedí Client ID y Client Secret
 * 2. Generá code_verifier + code_challenge (PKCE SHA-256)
 * 3. Iniciá servidor HTTP local para recibir el callback
 * 4. Construí la URL de autorización y abrí el navegador
 * 5. Intercambiá el authorization code por access_token + refresh_token
 * 6. Guardá todo en un archivo y mostrá cómo configurar .env
 *
 * Requisitos previos:
 * - Crear integración en https://www.canva.com/developers/connect/
 * - Configurar redirect URI: http://localhost:7322/oauth/callback
 * - Seleccionar scopes: asset:read asset:write design:meta:read design:content:read
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { exec } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = 7322;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;
const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

// Scopes necesarios para el Content Studio
const SCOPES = [
  'asset:read',
  'asset:write',
  'design:meta:read',
  'design:content:read',
  'design:content:write',
  'folder:read',
  'profile:read',
].join(' ');

// ─── Helpers ───
const generatePKCE = (): { verifier: string; challenge: string } => {
  const verifier = randomBytes(96).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
};

const generateState = (): string => randomBytes(48).toString('base64url');

const openBrowser = (url: string): void => {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? `open "${url}"` : platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log('No se pudo abrir el navegador automáticamente. Abrí esta URL manualmente:');
  });
};

const readLine = (prompt: string): Promise<string> => {
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => resolve(data.toString().trim()));
  });
};

// ─── Token exchange ───
const exchangeCode = async (
  code: string,
  verifier: string,
  clientId: string,
  clientSecret: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}> => {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Canva respondió ${res.status}: ${error}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }>;
};

// ─── Main ───
const main = async (): Promise<void> => {
  console.log('\n🎨 Canva Connect API — Generador de Tokens OAuth 2.0 + PKCE\n');
  console.log('Requisitos previos:');
  console.log('  1. Andá a https://www.canva.com/developers/connect/');
  console.log('  2. Creá una integración (o usá una existente)');
  console.log('  3. En Authentication → Redirect URLs, agregá:');
  console.log(`     ${REDIRECT_URI}`);
  console.log('  4. Seleccioná los scopes: asset:read, asset:write, design:meta:read, etc.\n');

  const clientId = await readLine('Client ID: ');
  const clientSecret = await readLine('Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('❌ Client ID y Client Secret son obligatorios');
    process.exit(1);
  }

  const { verifier, challenge } = generatePKCE();
  const state = generateState();

  const authUrl =
    `${CANVA_AUTH_URL}?` +
    `code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&state=${encodeURIComponent(state)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  console.log('\n✅ PKCE generado');
  console.log('   code_verifier:', verifier.slice(0, 20) + '...');
  console.log('   code_challenge:', challenge.slice(0, 20) + '...');
  console.log('   state:', state.slice(0, 20) + '...\n');

  // Start HTTP server to receive callback
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

    if (url.pathname !== '/oauth/callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const returnedState = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Error de autorización</h1><p>${error}: ${url.searchParams.get('error_description')}</p>`);
      console.error('\n❌ Canva devolvió error:', error, url.searchParams.get('error_description'));
      server.close();
      process.exit(1);
    }

    if (returnedState !== state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>❌ Error de seguridad</h1><p>El parametro state no coincide. Posible ataque CSRF.</p>');
      console.error('\n❌ Error de seguridad: state no coincide');
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>❌ Sin authorization code</h1>');
      console.error('\n❌ No se recibió authorization code');
      server.close();
      process.exit(1);
    }

    console.log('\n📥 Authorization code recibido. Intercambiando por tokens...\n');

    try {
      const tokens = await exchangeCode(code, verifier, clientId, clientSecret);

      // Save to file
      const outputPath = resolve('data/runtime/canva-tokens.json');
      writeFileSync(
        outputPath,
        JSON.stringify(
          {
            clientId,
            clientSecret,
            refreshToken: tokens.refresh_token,
            accessToken: tokens.access_token,
            expiresIn: tokens.expires_in,
            scope: tokens.scope,
            createdAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf-8',
      );

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>✅ Canva Autorizado</title></head>
          <body style="font-family:sans-serif;max-width:600px;margin:40px auto;text-align:center;">
            <h1>🎉 ¡Autorización exitosa!</h1>
            <p>Los tokens se guardaron en <code>data/runtime/canva-tokens.json</code></p>
            <p>Copiá el refresh_token en tu <code>.env</code> como <code>CANVA_REFRESH_TOKEN</code></p>
            <p>Podés cerrar esta pestaña.</p>
          </body>
        </html>
      `);

      console.log('✅ Tokens obtenidos correctamente\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  access_token :', tokens.access_token.slice(0, 40) + '...');
      console.log('  refresh_token:', tokens.refresh_token.slice(0, 40) + '...');
      console.log('  expires_in   :', tokens.expires_in, 'segundos (~4 horas)');
      console.log('  scope        :', tokens.scope);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('💾 Guardado en:', outputPath, '\n');
      console.log('👉 Agregá esto a tu .env:');
      console.log(`   CANVA_CLIENT_ID=${clientId}`);
      console.log(`   CANVA_CLIENT_SECRET=${clientSecret}`);
      console.log(`   CANVA_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n📝 Nota: El código ya maneja refresh automático del access_token.');
      console.log('   Solo necesitás el REFRESH_TOKEN en el .env.\n');

      server.close();
      process.exit(0);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Error</h1><p>${(err as Error).message}</p>`);
      console.error('\n❌ Error intercambiando tokens:', (err as Error).message);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`🌐 Servidor local escuchando en http://localhost:${PORT}`);
    console.log('   Esperando callback de Canva...\n');
    console.log('🔗 URL de autorización:');
    console.log(authUrl, '\n');
    console.log('🚀 Abriendo navegador...\n');
    openBrowser(authUrl);
    console.log('   (Si no se abre, copiá la URL manualmente)\n');
  });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
