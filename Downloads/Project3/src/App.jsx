import { useState, useRef, useCallback, useEffect } from 'react';
import Landing from './components/Landing.jsx';
import Onboarding from './components/Onboarding.jsx';
import WebcamFeed from './components/WebcamFeed.jsx';
import SignalGraphs from './components/SignalGraphs.jsx';
import RiskDashboard from './components/RiskDashboard.jsx';
import { ProgressStepper, MediaPipeTestPanel, ALL_TESTS } from './components/TestFlow.jsx';
import SpiralTest from './components/SpiralTest.jsx';
import KeyboardTest from './components/KeyboardTest.jsx';
import VoiceTest from './components/VoiceTest.jsx';
import ReactionTest from './components/ReactionTest.jsx';
import ReportView from './components/ReportView.jsx';
import { useMediaPipe } from './hooks/useMediaPipe.js';
import { useSignalProcessor } from './hooks/useSignalProcessor.js';
import { computeScores } from './hooks/useParkinsonsScorer.js';
import { generateReport, fallbackReport } from './utils/reportGenerator.js';

const MEDIAPIPE_PHASES = new Set(['fingerTap', 'tremor', 'gait']);
const TEST_IDS = ALL_TESTS.map(t => t.id);

export default function App() {
  const [phase, setPhase]               = useState('landing');
  const [demoMode, setDemoMode]         = useState(false);
  const [apiKey, setApiKey]             = useState('');
  const [userProfile, setUserProfile]   = useState(null);
  const [testResults, setTestResults]   = useState({});
  const [scores, setScores]             = useState({ aggregate: 0, _completedTests: 0 });
  const [report, setReport]             = useState(null);

  const startedAt = useRef(Date.now());
  const frameCount = useRef(0);

  // ── Signal processor for MediaPipe tests ────────────────────────────────
  const { signals, processFrame, resetBuffers } = useSignalProcessor();

  // Recompute scores whenever testResults or userProfile changes
  useEffect(() => {
    const s = computeScores(testResults, userProfile ?? {});
    setScores(s);
  }, [testResults, userProfile]);

  // ── MediaPipe ─────────────────────────────────────────────────────────────
  const mediaPipeActive = MEDIAPIPE_PHASES.has(phase);

  const handleMPResults = useCallback((results) => {
    frameCount.current++;
    processFrame(results, phase, frameCount.current);
  }, [processFrame, phase]);

  const { attachVideoRef } = useMediaPipe({
    enabled: mediaPipeActive,
    demoMode,
    testPhase: phase,
    onResults: handleMPResults,
  });

  const videoRefCallback = useCallback((el) => {
    attachVideoRef(el);
  }, [attachVideoRef]);

  // ── Phase transitions ─────────────────────────────────────────────────────
  const advanceToNextTest = useCallback((currentPhase) => {
    const idx = TEST_IDS.indexOf(currentPhase);
    if (idx === -1 || idx === TEST_IDS.length - 1) {
      setPhase('processing');
    } else {
      setPhase(TEST_IDS[idx + 1]);
    }
  }, []);

  /** Called when a MediaPipe test timer expires */
  const handleMediaPipeTestComplete = useCallback(() => {
    // Snapshot current signals into testResults
    if (phase === 'fingerTap') {
      const intervals = signals.tapIntervals ?? [];
      const mean = intervals.length
        ? intervals.reduce((a, b) => a + b, 0) / intervals.length * 1000
        : 320;
      setTestResults(prev => ({
        ...prev,
        fingerTap: {
          meanInterval_ms: parseFloat(mean.toFixed(1)),
          decelerationSlope: parseFloat(((signals.tapSlope ?? 0) * 1000).toFixed(3)),
          amplitudeDecay: signals.tapDecay ?? 0,
        },
      }));
    }
    if (phase === 'tremor') {
      setTestResults(prev => ({
        ...prev,
        tremor: {
          tremorFreq: signals.tremorFreq ?? 0,
          tremorAmplitude: signals.tremorAmplitude ?? 0,
        },
      }));
    }
    if (phase === 'gait') {
      setTestResults(prev => ({
        ...prev,
        gait: {
          asymmetryRatio: signals.asymmetryRatio ?? 1,
        },
      }));
    }
    advanceToNextTest(phase);
  }, [phase, signals, advanceToNextTest]);

  /** Called when a non-MediaPipe test completes with its results */
  const handleTestComplete = useCallback((testId, results) => {
    setTestResults(prev => ({ ...prev, [testId]: results }));
    advanceToNextTest(testId);
  }, [advanceToNextTest]);

  // ── Processing phase — call Claude ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'processing') return;
    const frozenScores = computeScores(testResults, userProfile ?? {});
    setScores(frozenScores);

    const runReport = async () => {
      await new Promise(r => setTimeout(r, 1800)); // brief "analysing" delay
      try {
        if (apiKey) {
          const r = await generateReport(frozenScores, userProfile ?? {}, startedAt.current, apiKey);
          setReport(r);
        } else {
          setReport(fallbackReport(frozenScores, userProfile ?? {}));
        }
      } catch (e) {
        console.warn('Report generation failed:', e.message);
        setReport(fallbackReport(frozenScores, userProfile ?? {}));
      }
      setPhase('report');
    };
    runReport();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestart = useCallback(() => {
    resetBuffers();
    setTestResults({});
    setScores({ aggregate: 0, _completedTests: 0 });
    setReport(null);
    frameCount.current = 0;
    startedAt.current = Date.now();
    setPhase('landing');
  }, [resetBuffers]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'landing') {
    return (
      <Landing
        onBegin={() => setPhase('onboarding')}
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
    );
  }

  if (phase === 'onboarding') {
    return <Onboarding onComplete={(profile) => { setUserProfile(profile); setPhase('fingerTap'); startedAt.current = Date.now(); }} />;
  }

  if (phase === 'report' && report) {
    return <ReportView report={report} scores={scores} userProfile={userProfile ?? {}} onRestart={handleRestart} />;
  }

  if (phase === 'processing') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ width: 52, height: 52, border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>Analysing your movement patterns…</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {apiKey ? 'Calling Claude to generate your personalised report' : 'Generating your screening report'}
          </p>
        </div>
      </div>
    );
  }

  // ── Non-MediaPipe test screens ──────────────────────────────────────────
  if (phase === 'spiral') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <TopBar phase={phase} demoMode={demoMode} apiKey={apiKey} setApiKey={setApiKey} />
        <SpiralTest demoMode={demoMode} onComplete={(r) => handleTestComplete('spiral', r)} />
      </div>
    );
  }
  if (phase === 'keyboard') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <TopBar phase={phase} demoMode={demoMode} apiKey={apiKey} setApiKey={setApiKey} />
        <KeyboardTest demoMode={demoMode} onComplete={(r) => handleTestComplete('keyboard', r)} />
      </div>
    );
  }
  if (phase === 'voice') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <TopBar phase={phase} demoMode={demoMode} apiKey={apiKey} setApiKey={setApiKey} />
        <VoiceTest demoMode={demoMode} onComplete={(r) => handleTestComplete('voice', r)} />
      </div>
    );
  }
  if (phase === 'reactionTime') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <TopBar phase={phase} demoMode={demoMode} apiKey={apiKey} setApiKey={setApiKey} />
        <ReactionTest demoMode={demoMode} onComplete={(r) => handleTestComplete('reactionTime', r)} />
      </div>
    );
  }

  // ── MediaPipe 3-column layout ───────────────────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <TopBar phase={phase} demoMode={demoMode} apiKey={apiKey} setApiKey={setApiKey} />

      {/* Progress stepper */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <ProgressStepper phase={phase} />
      </div>

      {/* 55/45 split */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '55% 45%', gap: 0, overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT 55% — Webcam feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0, overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minHeight: 0, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <WebcamFeed
              videoRefCallback={mediaPipeActive ? videoRefCallback : null}
              scores={scores}
              demoMode={demoMode}
              isActive={mediaPipeActive}
              testPhase={phase}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px', flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: mediaPipeActive ? '#00D4AA' : 'var(--text-muted)', animation: mediaPipeActive ? 'pulse-glow 1.5s ease-in-out infinite' : 'none' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {mediaPipeActive ? (demoMode ? 'Demo landmarks active' : 'MediaPipe Holistic') : 'Inactive'}
              </span>
              {mediaPipeActive && (
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {signals.tremorFreq?.toFixed(1) ?? '0.0'} Hz
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 45% — Live data panel */}
        <div style={{ overflow: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Test panel (timer, instructions) */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <MediaPipeTestPanel phase={phase} onComplete={handleMediaPipeTestComplete} scores={scores} />
          </div>
          {/* Live signal graphs */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px' }}>
            <SignalGraphs signals={signals} testPhase={phase} />
          </div>
          {/* Risk dashboard */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <RiskDashboard scores={scores} completedTests={Object.keys(testResults).length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ phase, demoMode, apiKey, setApiKey }) {
  const idx = ALL_TESTS.findIndex(t => t.id === phase);
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px',
      background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse-glow 2s infinite' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          Neuromotor Screening
        </span>
        <span className="pill" style={{ background: 'rgba(255,77,109,0.1)', borderColor: 'rgba(255,77,109,0.3)', color: '#ff4d6d', fontSize: '0.62rem' }}>
          Research Demo
        </span>
        {idx >= 0 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Test {idx + 1}/7
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {demoMode && (
          <span className="pill" style={{ background: 'rgba(255,181,71,0.12)', borderColor: 'rgba(255,181,71,0.3)', color: 'var(--accent-amber)', fontSize: '0.65rem' }}>
            DEMO MODE ON
          </span>
        )}
        <input
          type="password"
          placeholder="Anthropic API key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          style={{
            width: 180, padding: '5px 10px', borderRadius: 6, fontSize: '0.72rem',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', outline: 'none',
          }}
        />
      </div>
    </header>
  );
}
