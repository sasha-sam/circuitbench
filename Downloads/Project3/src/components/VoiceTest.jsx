import { useEffect, useRef, useState, useCallback } from 'react';
import { analyzeVoice, demoPDVoiceFeatures } from '../utils/audioAnalyzer.js';

const RECORD_SECONDS = 8;

/** Draw a circular oscilloscope waveform on a canvas */
function drawCircularWaveform(ctx, analyser, t, isRecording) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const cx = w / 2, cy = h / 2;
  const baseRadius = Math.min(w, h) * 0.28;

  ctx.fillStyle = '#0A0A0F';
  ctx.fillRect(0, 0, w, h);

  const bufLen = analyser.frequencyBinCount;
  const tdata = new Uint8Array(bufLen);
  analyser.getByteTimeDomainData(tdata);

  const sliceAngle = (2 * Math.PI) / bufLen;
  const accentColor = isRecording ? '#FF4D6D' : '#6C63FF';

  // Outer glow ring
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = `${accentColor}22`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius + 30, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();

  // Inner reference circle
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, 0, 2 * Math.PI);
  ctx.stroke();

  // Waveform
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < bufLen; i++) {
    const v = (tdata[i] / 128.0) - 1.0;
    const r = baseRadius + v * 40;
    const angle = i * sliceAngle - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Rotating tick marks
  const numTicks = 16;
  for (let i = 0; i < numTicks; i++) {
    const angle = (i / numTicks) * 2 * Math.PI + t * 0.5 - Math.PI / 2;
    const r1 = baseRadius - 8;
    const r2 = baseRadius - 14;
    ctx.strokeStyle = `rgba(108,99,255,${i % 4 === 0 ? 0.5 : 0.15})`;
    ctx.lineWidth = i % 4 === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + r1 * Math.cos(angle), cy + r1 * Math.sin(angle));
    ctx.lineTo(cx + r2 * Math.cos(angle), cy + r2 * Math.sin(angle));
    ctx.stroke();
  }

  // Centre dot
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

export default function VoiceTest({ demoMode, onComplete }) {
  const [phase, setPhase] = useState('ready'); // ready | countdown | recording | analyzing | done
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const audioCtxRef   = useRef(null);
  const analyserRef   = useRef(null);
  const sourceRef     = useRef(null);
  const streamRef     = useRef(null);
  const chunksRef     = useRef([]);
  const recorderRef   = useRef(null);
  const circCanvasRef = useRef(null);  // circular waveform
  const specCanvasRef = useRef(null);  // frequency spectrum
  const animRef       = useRef(null);
  const phaseRef      = useRef(phase);
  const demoAnimRef   = useRef(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Canvas drawing ────────────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const t = performance.now() / 1000;
    const isRecording = phaseRef.current === 'recording';

    // Circular oscilloscope
    const cc = circCanvasRef.current;
    if (cc) {
      const ctx = cc.getContext('2d');
      if (analyserRef.current) {
        drawCircularWaveform(ctx, analyserRef.current, t, isRecording);
      } else {
        // idle state — draw static circle
        ctx.fillStyle = '#0A0A0F';
        ctx.fillRect(0, 0, cc.width, cc.height);
        const cx = cc.width / 2, cy = cc.height / 2, r = Math.min(cc.width, cc.height) * 0.28;
        ctx.strokeStyle = 'rgba(108,99,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
        // Pulse ring
        const pr = r + 10 + 8 * Math.sin(t * 1.5);
        ctx.strokeStyle = `rgba(108,99,255,${0.05 + 0.05 * Math.sin(t * 1.5)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, pr, 0, 2 * Math.PI); ctx.stroke();
        // Centre dot
        ctx.fillStyle = 'rgba(108,99,255,0.5)';
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill();
      }
    }

    // Frequency spectrum bars
    const sc = specCanvasRef.current;
    if (sc && analyserRef.current) {
      const ctx = sc.getContext('2d');
      const fdata = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(fdata);
      ctx.fillStyle = '#0A0A0F';
      ctx.fillRect(0, 0, sc.width, sc.height);
      const barCount = 64;
      const barW = sc.width / barCount;
      for (let i = 0; i < barCount; i++) {
        const h = (fdata[i] / 255) * sc.height;
        const pct = i / barCount;
        // Purple → teal gradient
        const r = Math.round(108 + (0 - 108) * pct);
        const g = Math.round(99 + (212 - 99) * pct);
        const b = Math.round(255 + (170 - 255) * pct);
        ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
        ctx.fillRect(i * barW, sc.height - h, barW - 1, h);
      }
    }

    animRef.current = requestAnimationFrame(drawFrame);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawFrame]);

  // ── Demo mode: fake analyser with animated sine wave ─────────────────────
  useEffect(() => {
    if (!demoMode) return;
    // Create offline analyser with fake data
    let step = 0;
    const fakeBuffer = new Uint8Array(2048);
    const fakeAnalyser = {
      frequencyBinCount: 2048,
      getByteTimeDomainData(buf) {
        const t = performance.now() / 1000;
        for (let i = 0; i < buf.length; i++) {
          // Simulate a voice waveform with some shimmer noise
          buf[i] = 128 + 30 * Math.sin(2 * Math.PI * i / buf.length * 8 + t * 4)
                       + 8  * Math.sin(2 * Math.PI * i / buf.length * 17 + t * 7)
                       + (Math.random() - 0.5) * 12;
        }
      },
      getByteFrequencyData(buf) {
        const t = performance.now() / 1000;
        for (let i = 0; i < buf.length; i++) {
          const base = i < 20 ? (255 * (1 - i / 20)) : 0;
          buf[i] = Math.max(0, base + 30 * Math.sin(t * 3 + i * 0.2) + Math.random() * 20);
        }
      },
    };
    analyserRef.current = fakeAnalyser;

    return () => { analyserRef.current = null; };
  }, [demoMode]);

  const startCountdown = async () => {
    if (demoMode) {
      setPhase('recording');
      let t = 0;
      const iv = setInterval(() => {
        t++;
        setElapsed(t);
        if (t >= RECORD_SECONDS) {
          clearInterval(iv);
          setPhase('analyzing');
          setTimeout(() => {
            const r = demoPDVoiceFeatures();
            setResult(r);
            setPhase('done');
          }, 800);
        }
      }, 1000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      setPhase('countdown');
      let c = 3;
      setCountdown(c);
      const cdInterval = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) { clearInterval(cdInterval); beginRecording(stream); }
      }, 1000);
    } catch {
      setError('Microphone access denied. Please allow microphone and try again.');
    }
  };

  const beginRecording = (stream) => {
    setPhase('recording');
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = processAudio;
    recorder.start();
    let t = 0;
    const iv = setInterval(() => {
      t++;
      setElapsed(t);
      if (t >= RECORD_SECONDS) { clearInterval(iv); recorder.stop(); }
    }, 1000);
  };

  const processAudio = async () => {
    setPhase('analyzing');
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const offCtx = new OfflineAudioContext(1, 44100 * RECORD_SECONDS, 44100);
      const decoded = await offCtx.decodeAudioData(arrayBuffer);
      const buffer = decoded.getChannelData(0);
      const r = analyzeVoice(buffer, decoded.sampleRate);
      setResult(r);
    } catch {
      setResult(demoPDVoiceFeatures());
    }
    setPhase('done');
  };

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
  }, []);

  const metricColor = (val, healthy, elevated) =>
    val <= healthy ? '#00D4AA' : val <= elevated ? '#FFB547' : '#FF4D6D';

  const isLive = phase === 'recording' || phase === 'countdown';
  const accentBorder = isLive ? 'rgba(255,77,109,0.5)' : 'rgba(108,99,255,0.3)';
  const accentGlow   = isLive ? '0 0 30px rgba(255,77,109,0.2)' : '0 0 20px rgba(108,99,255,0.15)';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-4 py-8">
      {/* Header */}
      <div className="text-center max-w-md">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Voice Analysis
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Sustain a steady "ahhh" sound for {RECORD_SECONDS} seconds at a comfortable pitch.
          {demoMode && <span style={{ color: 'var(--accent-amber)' }}> Simulating in demo mode.</span>}
        </p>
      </div>

      {/* Circular waveform + recording state overlay */}
      <div style={{ position: 'relative', width: 300, height: 300 }}>
        <canvas
          ref={circCanvasRef}
          width={300} height={300}
          style={{
            display: 'block', borderRadius: '50%',
            border: `1px solid ${accentBorder}`,
            boxShadow: accentGlow,
            background: '#0A0A0F',
          }}
        />

        {/* State label overlaid in the centre */}
        {phase === 'ready' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ready</span>
          </div>
        )}

        {phase === 'countdown' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>{countdown}</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 6 }}>Get ready…</p>
          </div>
        )}

        {phase === 'recording' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {/* Recording indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4D6D', animation: 'pulse-glow 1s ease-in-out infinite' }} />
              <span style={{ color: '#FF4D6D', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em' }}>REC</span>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
              {RECORD_SECONDS - elapsed}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4 }}>Say "ahhh" steadily…</p>
          </div>
        )}

        {phase === 'analyzing' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 36, height: 36, border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite', marginBottom: 10 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Analysing…</p>
          </div>
        )}
      </div>

      {/* Frequency spectrum */}
      <div style={{
        width: '100%', maxWidth: 360,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: '#0A0A0F',
      }}>
        <canvas ref={specCanvasRef} width={360} height={64} style={{ display: 'block', width: '100%' }} />
      </div>

      {/* CTA */}
      {phase === 'ready' && (
        <button
          onClick={startCountdown}
          style={{
            padding: '14px 48px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent-primary)', border: 'none',
            color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 0 24px rgba(108,99,255,0.35)',
            transition: 'all 0.15s',
          }}
        >
          {demoMode ? 'Run Voice Test' : 'Allow Microphone & Start'}
        </button>
      )}

      {error && <p style={{ color: '#FF4D6D', fontSize: '0.875rem' }}>{error}</p>}

      {/* Results */}
      {phase === 'done' && result && (
        <div className="card w-full max-w-sm animate-fade-in-up" style={{ borderColor: 'rgba(108,99,255,0.3)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Voice Biomarkers — UCI PD Dataset norms
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <VoiceMetric label="Jitter" value={`${result.jitter_pct?.toFixed(2)}%`} sub="healthy: <0.55%"
                         color={metricColor(result.jitter_pct, 0.55, 0.83)} />
            <VoiceMetric label="Shimmer" value={`${result.shimmer_pct?.toFixed(2)}%`} sub="healthy: <1.7%"
                         color={metricColor(result.shimmer_pct, 1.7, 3.3)} />
            <VoiceMetric label="HNR" value={`${result.hnr_db?.toFixed(1)} dB`} sub="healthy: >21.9 dB"
                         color={result.hnr_db > 21 ? '#00D4AA' : result.hnr_db > 19 ? '#FFB547' : '#FF4D6D'} />
            <VoiceMetric label="NHR" value={result.nhr?.toFixed(4)} sub="healthy: <0.0065"
                         color={metricColor(result.nhr, 0.0065, 0.018)} />
          </div>
          <button
            onClick={() => onComplete(result)}
            style={{
              width: '100%', padding: '13px', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-primary)', border: 'none', color: 'white',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

function VoiceMetric({ label, value, sub, color }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '1.15rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
      <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}
