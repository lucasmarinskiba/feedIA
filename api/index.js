/**
 * Vercel Serverless Handler
 * Minimal wrapper for Express app
 */

module.exports = async (req, res) => {
  try {
    // Dynamically require compiled Express app
    const { default: app } = await import('../dist/server.js');

    // Call Express app as middleware
    return new Promise((resolve, reject) => {
      app(req, res);
      res.on('finish', resolve);
      res.on('error', reject);
      setTimeout(() => reject(new Error('Handler timeout')), 30000);
    });
  } catch (error) {
    console.error('[Handler Error]', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      ok: false,
    });
  }
};
