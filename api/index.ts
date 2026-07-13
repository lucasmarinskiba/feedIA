/**
 * Vercel Serverless Handler — Exports Express app for Vercel
 * Re-exports app from src/server.ts
 */

// Direct CommonJS require to work reliably on Vercel
const app = require('../src/server.ts');

export default app;
