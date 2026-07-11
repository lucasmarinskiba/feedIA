/**
 * Instagram Connect Button Component
 *
 * Simple button that triggers Instagram OAuth.
 * User clicks → redirected to Instagram login → auto-returns with token saved.
 * Works in React, can be adapted to any framework.
 *
 * Usage:
 * <InstagramConnectButton onConnect={() => console.log('Connected!')} />
 */

import React, { useState } from 'react';

interface InstagramConnectButtonProps {
  onConnect?: () => void;
  onError?: (error: string) => void;
  variant?: 'primary' | 'secondary';
}

export const InstagramConnectButton: React.FC<InstagramConnectButtonProps> = ({
  onConnect,
  onError,
  variant = 'primary',
}) => {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setLoading(true);

    try {
      // Check if already connected
      const statusRes = await fetch('/oauth/instagram/status');
      const statusData = (await statusRes.json()) as { ok: boolean; connected: boolean };

      if (statusData.connected) {
        setConnected(true);
        onConnect?.();
        return;
      }

      // Trigger OAuth flow
      window.location.href = '/oauth/instagram/connect';
    } catch (err) {
      const errorMsg = `Failed to connect Instagram: ${String(err)}`;
      onError?.(errorMsg);
      setLoading(false);
    }
  };

  const buttonStyles: React.CSSProperties = {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: loading ? 0.6 : 1,
    ...(() => {
      if (connected) {
        return {
          backgroundColor: '#31a24c',
          color: 'white',
        };
      }

      return variant === 'primary'
        ? {
            backgroundColor: '#405de6',
            color: 'white',
          }
        : {
            backgroundColor: '#f0f0f0',
            color: '#333',
            border: '1px solid #ddd',
          };
    })(),
  };

  const statusText = connected ? '✓ Connected' : loading ? 'Connecting...' : 'Connect Instagram';

  return (
    <button onClick={handleConnect} disabled={loading || connected} style={buttonStyles} title="Click to connect your Instagram Business Account">
      {statusText}
    </button>
  );
};

/**
 * Standalone HTML version (no React needed)
 */
export const InstagramConnectButtonHTML = (): string => {
  return `
    <button id="instagram-connect-btn" style="
      padding: 10px 20px;
      font-size: 14px;
      font-weight: bold;
      border: none;
      border-radius: 6px;
      background-color: #405de6;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    ">
      Connect Instagram
    </button>

    <script>
      document.getElementById('instagram-connect-btn').addEventListener('click', async () => {
        try {
          const res = await fetch('/oauth/instagram/status');
          const data = await res.json();

          if (data.connected) {
            alert('✓ Already connected to Instagram');
            return;
          }

          window.location.href = '/oauth/instagram/connect';
        } catch (err) {
          alert('Failed to connect: ' + err);
        }
      });
    </script>
  `;
};

/**
 * Integration guide:
 *
 * React app:
 * import { InstagramConnectButton } from '@/components/InstagramConnectButton';
 * <InstagramConnectButton onConnect={() => refetchMetrics()} />
 *
 * HTML/vanilla JS:
 * 1. Add div: <div id="instagram-connect-container"></div>
 * 2. Load: <script src="/components/InstagramConnectButton.js"></script>
 * 3. Render: document.getElementById('instagram-connect-container').innerHTML = InstagramConnectButtonHTML();
 *
 * Dashboard integration:
 * Place in settings → connections → Instagram section
 * Shows status: "Connect Instagram" (not connected) or "✓ Connected" (connected)
 */
