/**
 * /checkout - Tier Selection & Billing Integration
 * Bridge between /pricing and /#feed app
 * Handles payment flow, redirects to app with tier info
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

export default function CheckoutPage() {
  const router = useRouter();
  const { tier } = router.query;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');

  const tierConfig = {
    free: { name: 'Starter', price: 0, campaigns: 5 },
    pro: { name: 'Professional', price: 79, campaigns: 50 },
    agency: { name: 'Agency', price: 499, campaigns: 500 },
  };

  const selectedTier = tierConfig[tier as keyof typeof tierConfig] || tierConfig.free;

  // Initialize user from localStorage (or prompt for email)
  useEffect(() => {
    const stored = localStorage.getItem('user_id');
    const storedEmail = localStorage.getItem('user_email');

    if (stored) setUserId(stored);
    if (storedEmail) setEmail(storedEmail);
  }, []);

  const handleCheckout = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Validate email for paid tiers
      if (selectedTier.price > 0 && !email) {
        setError('Email required for paid subscriptions');
        setIsProcessing(false);
        return;
      }

      // Free tier: record in DB + redirect
      if (selectedTier.price === 0) {
        const userId = `free_${Date.now()}`;
        localStorage.setItem('user_id', userId);
        localStorage.setItem('user_email', email || `guest_${userId}@feedia.app`);

        // Call backend to save free tier
        await fetch('/api/billing/save-tier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: email || `guest_${userId}@feedia.app`,
            tier: 'free',
          }),
        }).catch(() => null); // Ignore errors, proceed anyway

        setTimeout(() => {
          window.location.href = `/#feed?tier=free&userId=${userId}&signup=true`;
        }, 300);
        return;
      }

      // Paid tier: create Stripe session (real)
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          email,
          userId: userId || `guest_${Date.now()}`,
          successUrl: `${window.location.origin}/#feed?tier=${tier}&payment=success&email=${encodeURIComponent(email)}`,
          cancelUrl: `${window.location.origin}/pricing?tier=${tier}`,
        }),
      });

      const session = await response.json();

      if (session.url) {
        // Redirect to real Stripe checkout
        window.location.href = session.url;
      } else if (session.sessionId) {
        // Fallback: redirect to app with session ID (webhook will process async)
        localStorage.setItem('user_id', userId);
        localStorage.setItem('user_email', email);
        window.location.href = `/#feed?tier=${tier}&payment=pending&sessionId=${session.sessionId}`;
      } else {
        setError('Failed to create checkout session');
        setIsProcessing(false);
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
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px' }}>Complete Your Purchase</h1>
          <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '1rem' }}>
            You're selecting the {selectedTier.name} tier
          </p>

          {/* Email Input (for paid tiers) */}
          {selectedTier.price > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

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
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '4px' }}>/month</span>
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
