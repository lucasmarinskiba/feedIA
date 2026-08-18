import React, { useState, useRef } from 'react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
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
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>

      <div style={styles.header}>
        <h1 style={styles.title}>🎵 FeedIA Audio Capture</h1>
        <p style={styles.subtitle}>Hola FeedIA - Record and Match Audio</p>
      </div>

      <div style={styles.card}>
        <div style={styles.microphoneContainer}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              ...styles.micButton,
              background: isRecording
                ? 'linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%)'
                : 'linear-gradient(135deg, #ff0000 0%, #d32f2f 100%)',
            }}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            <span style={styles.micIcon}>🎤</span>
          </button>

          {isRecording && <div style={styles.recordingIndicator}>● Recording...</div>}
        </div>

        {audioUrl && (
          <div style={styles.playbackContainer}>
            <p style={styles.label}>✅ Audio Recorded:</p>
            <audio controls style={styles.audioPlayer}>
              <source src={audioUrl} type="audio/wav" />
            </audio>
          </div>
        )}

        <p style={styles.instruction}>
          {isRecording ? '🔴 Recording... Say "Hola FeedIA"' : '👂 Click to record audio'}
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '60px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    background: 'linear-gradient(135deg, #ff0000 0%, #d32f2f 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '18px',
    color: '#666',
    margin: '0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '50px 40px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    textAlign: 'center' as const,
  },
  microphoneContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
    marginBottom: '30px',
  },
  micButton: {
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(255,0,0,0.4)',
    fontSize: '0',
  },
  micIcon: {
    fontSize: '72px',
  },
  recordingIndicator: {
    fontSize: '16px',
    color: '#ff0000',
    fontWeight: 'bold',
    animation: 'blink 1s infinite',
  },
  playbackContainer: {
    marginTop: '30px',
    marginBottom: '20px',
  },
  audioPlayer: {
    width: '100%',
    height: '50px',
    marginTop: '10px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#000',
    margin: '0 0 10px 0',
  },
  instruction: {
    fontSize: '16px',
    color: '#ff0000',
    fontWeight: '600',
    margin: '0',
  },
};

const globalStyles = `
  body { margin: 0; padding: 0; }
  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0.5; }
  }
`;
