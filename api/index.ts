/**
 * Vercel Serverless Handler — Exports Express app for Vercel
 * Re-exports compiled app from dist/server.js
 */

// Import compiled server from dist (built via `npm run build`)
const app = require('../dist/server.js');

export default app;
