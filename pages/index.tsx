/**
 * / - Landing page (Vercel root)
 * Routes users to /pricing or /#feed based on route
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to pricing by default (or app if coming from checkout)
    const fromCheckout = router.query.from === 'checkout';
    if (fromCheckout) {
      window.location.href = '/#feed?tier=free&signup=true';
    } else {
      // Default: show pricing landing page
      window.location.href = '/pricing';
    }
  }, [router.query]);

  return (
    <>
      <Head>
        <title>FeedIA - AI Campaign Generator</title>
        <meta name="description" content="Generate professional campaigns with AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '20px' }}>FeedIA</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '40px' }}>Redirecting to pricing...</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            If you are not redirected, click <a href="/pricing" style={{ color: 'white', textDecoration: 'underline' }}>here</a>
          </p>
        </div>
      </div>
    </>
  );
}
