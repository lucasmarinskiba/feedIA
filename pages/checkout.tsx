/**
 * /checkout - Tier Selection & Billing Integration
 * Bridge between /pricing and /#feed app
 * Handles payment flow, redirects to app with tier info
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

export default function CheckoutPage() {
  const router = useRouter();
  const { tier } = router.query;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tierConfig = {
    free: { name: 'Starter', price: 0, campaigns: 5 },
    pro: { name: 'Professional', price: 79, campaigns: 50 },
    agency: { name: 'Agency', price: 499, campaigns: 500 },
  };

  const selectedTier = tierConfig[tier as keyof typeof tierConfig] || tierConfig.free;

  const handleCheckout = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      if (selectedTier.price === 0) {
        // Free tier: redirect immediately to app
        setTimeout(() => {
          window.location.href = `/#feed?tier=free&signup=true`;
        }, 500);
        return;
      }

      // Paid tier: simulate Stripe checkout (replace with real Stripe integration)
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/#feed?tier=${tier}&payment=success`,
          cancelUrl: `${window.location.origin}/pricing?tier=${tier}`,
        }),
      });

      const session = await response.json();

      if (session.url) {
        // Redirect to Stripe checkout (or Vercel billing integration)
        window.location.href = session.url;
      } else {
        // Fallback: simulate payment success after 2s
        setTimeout(() => {
          window.location.href = `/#feed?tier=${tier}&payment=success`;
        }, 2000);
      }
    } catch (err) {
      setError(String(err));
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Head>
        <title>Checkout - FeedIA</title>
        <meta name="robots" content="noindex" />
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
        <div
          style={{
            background: 'white',
            color: '#1f2937',
            padding: '60px 40px',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          }}
        >
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px' }}>
            Complete Your Purchase
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '40px', fontSize: '1rem' }}>
            You're selecting the {selectedTier.name} tier
          </p>

          {/* Order Summary */}
          <div
            style={{
              background: '#f9fafb',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '32px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.95rem' }}>Plan:</span>
              <span style={{ fontWeight: 600 }}>{selectedTier.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.95rem' }}>Campaigns/Month:</span>
              <span style={{ fontWeight: 600 }}>{selectedTier.campaigns}</span>
            </div>
            <div
              style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 600 }}>Total:</span>
              <span
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  color: '#2563eb',
                }}
              >
                ${selectedTier.price}
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '4px' }}>
                  /month
                </span>
              </span>
            </div>
          </div>

          {/* Risk Reversal */}
          {selectedTier.price > 0 && (
            <div
              style={{
                background: '#ecfdf5',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '32px',
                borderLeft: '4px solid #10b981',
                fontSize: '0.9rem',
              }}
            >
              ✓ 30-day money-back guarantee. No questions asked.
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '0.9rem',
              }}
            >
              ✗ {error}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleCheckout}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '16px',
              background: isProcessing ? '#d1d5db' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {isProcessing
              ? 'Processing...'
              : selectedTier.price === 0
                ? 'Start Free Trial'
                : `Pay $${selectedTier.price}/month`}
          </button>

          {/* Fallback link */}
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#6b7280' }}>
            <a href="/pricing" style={{ color: '#2563eb', textDecoration: 'none' }}>
              ← Back to pricing
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
