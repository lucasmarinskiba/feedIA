import React, { useState, useRef } from 'react';

interface AudioCapture {
  isRecording: boolean;
  audioBlob: Blob | null;
  transcription: string;
  audioUrl: string;
}

interface MatchResult {
  audioId: string;
  matchScore: number;
  estimatedEngagement: number;
}

export default function AudioCapturePage() {
  const [capture, setCapture] = useState<AudioCapture>({
    isRecording: false,
    audioBlob: null,
    transcription: '',
    audioUrl: '',
  });

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState('skincare');
  const [format, setFormat] = useState<'carousel' | 'reel' | 'story'>('reel');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        setCapture((prev) => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
        }));

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setCapture((prev) => ({ ...prev, isRecording: true }));
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('No microphone access. Enable audio permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const matchAudio = async () => {
    if (!capture.audioBlob) {
      alert('Record audio first');
      return;
    }

    setLoading(true);

    try {
      // Send to audio matching endpoint
      const response = await fetch('/api/systems/audio/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          niche,
          contentLength: 60,
        }),
      });

      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error matching audio:', error);
      alert('Failed to match audio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🎵 FeedIA Audio Capture</h1>
        <p style={styles.subtitle}>Record audio and match to trending TikTok/Instagram sounds</p>
      </div>

      {/* Microphone Section */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Record Audio</h2>

        <div style={styles.microphoneContainer}>
          <button
            onClick={capture.isRecording ? stopRecording : startRecording}
            style={{
              ...styles.micButton,
              backgroundColor: capture.isRecording ? '#ff4444' : '#ff0000',
            }}
          >
            <span style={styles.micIcon}>🎤</span>
            {capture.isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>

          {capture.isRecording && <div style={styles.recordingIndicator}>● Recording...</div>}
        </div>

        {/* Audio Playback */}
        {capture.audioUrl && (
          <div style={styles.playbackContainer}>
            <p style={styles.label}>Recorded Audio:</p>
            <audio controls style={styles.audioPlayer}>
              <source src={capture.audioUrl} type="audio/wav" />
            </audio>
          </div>
        )}
      </div>

      {/* Configuration Section */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Configure Match</h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Niche:</label>
          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            style={styles.select}
          >
            <option>skincare</option>
            <option>fitness</option>
            <option>food</option>
            <option>business</option>
            <option>lifestyle</option>
            <option>fashion</option>
            <option>travel</option>
            <option>education</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Format:</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
            style={styles.select}
          >
            <option value="carousel">Carousel</option>
            <option value="reel">Reel</option>
            <option value="story">Story</option>
          </select>
        </div>

        <button
          onClick={matchAudio}
          disabled={!capture.audioBlob || loading}
          style={{
            ...styles.matchButton,
            opacity: !capture.audioBlob || loading ? 0.5 : 1,
          }}
        >
          {loading ? '⏳ Matching...' : '🎯 Match to Trending Sounds'}
        </button>
      </div>

      {/* Results Section */}
      {matches.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📊 Top Matches</h2>

          <div style={styles.resultsList}>
            {matches.slice(0, 5).map((match, idx) => (
              <div key={idx} style={styles.resultItem}>
                <div style={styles.resultHeader}>
                  <span style={styles.resultTitle}>Match #{idx + 1}</span>
                  <span style={styles.resultScore}>
                    {(match.matchScore * 100 | 0)}% match
                  </span>
                </div>
                <div style={styles.resultDetails}>
                  <p>Audio ID: {match.audioId}</p>
                  <p>Estimated Engagement: {(match.estimatedEngagement * 100 | 0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div style={styles.status}>
        {capture.isRecording && '🔴 Recording in progress...'}
        {!capture.isRecording && capture.audioBlob && '✅ Audio ready for matching'}
        {!capture.audioBlob && !capture.isRecording && '👂 Click microphone to start'}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#fafafa',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    color: '#000',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginTop: '0',
    marginBottom: '20px',
    color: '#000',
  },
  microphoneContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
    padding: '40px 20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
  },
  micButton: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: 'none',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column' as const,
    gap: '10px',
    boxShadow: '0 4px 12px rgba(255,0,0,0.3)',
  },
  micIcon: {
    fontSize: '48px',
  },
  recordingIndicator: {
    fontSize: '14px',
    color: '#ff0000',
    fontWeight: 'bold',
    animation: 'blink 1s infinite',
  },
  playbackContainer: {
    marginTop: '20px',
  },
  audioPlayer: {
    width: '100%',
    height: '40px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#000',
  },
  formGroup: {
    marginBottom: '20px',
  },
  select: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  matchButton: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#ff0000',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  resultItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    padding: '16px',
    borderLeft: '4px solid #ff0000',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  resultTitle: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#000',
  },
  resultScore: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ff0000',
  },
  resultDetails: {
    fontSize: '13px',
    color: '#666',
    margin: '0',
  },
  status: {
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#666',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    fontWeight: '500',
  },
};

const globalStyles = `
  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0.5; }
  }
`;
