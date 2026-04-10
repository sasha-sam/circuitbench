import { useEffect, useRef, useState, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const TARGET_TAPS = 60;
const SEQUENCE = ['j', 'k'];

/** Visual "key press" with a 3D depress effect */
function KeyCard({ keyLabel, isActive, isNext, onPress, disabled }) {
  const [pressed, setPressed] = useState(false);

  // Mirror physical key depress on keyboard events
  useEffect(() => {
    if (!isActive) return;
    const dn = (e) => { if (e.key.toLowerCase() === keyLabel.toLowerCase()) setPressed(true); };
    const up = (e) => { if (e.key.toLowerCase() === keyLabel.toLowerCase()) setPressed(false); };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, [isActive, keyLabel]);

  const depressed = pressed || (isActive && isNext);

  return (
    <button
      onClick={() => !disabled && onPress(keyLabel.toLowerCase())}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      disabled={disabled}
      style={{
        width: 'clamp(120px, 22vw, 200px)',
        height: 'clamp(120px, 22vw, 200px)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'clamp(3rem, 8vw, 6rem)',
        fontWeight: 800,
        fontFamily: 'var(--font-mono)',
        cursor: disabled ? 'default' : 'pointer',
        border: '2px solid',
        borderColor: isNext
          ? 'var(--accent-primary)'
          : 'rgba(255,255,255,0.08)',
        background: isNext
          ? depressed
            ? 'rgba(108,99,255,0.35)'
            : 'rgba(108,99,255,0.18)'
          : depressed
            ? 'rgba(255,255,255,0.05)'
            : 'var(--bg-elevated)',
        color: isNext ? 'var(--accent-primary)' : 'var(--text-muted)',
        boxShadow: isNext
          ? depressed
            ? 'inset 0 4px 12px rgba(0,0,0,0.5), 0 0 24px rgba(108,99,255,0.4)'
            : '0 8px 0 rgba(108,99,255,0.4), 0 0 30px rgba(108,99,255,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          : depressed
            ? 'inset 0 4px 12px rgba(0,0,0,0.4)'
            : '0 6px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        transform: depressed ? 'translateY(4px) scale(0.97)' : 'translateY(0) scale(1)',
        transition: 'all 0.07s',
        userSelect: 'none',
        outline: 'none',
        // Keyboard cap texture
        backgroundImage: isNext
          ? 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.08) 0%, transparent 60%)'
          : 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.03) 0%, transparent 60%)',
      }}
    >
      {keyLabel.toUpperCase()}
    </button>
  );
}

export default function KeyboardTest({ demoMode, onComplete }) {
  const [taps, setTaps]         = useState([]);
  const [nextKey, setNextKey]   = useState(0);
  const [finished, setFinished] = useState(false);
  const lastTimeRef   = useRef(null);
  const tapCountRef   = useRef(0);
  const demoIntervalRef = useRef(null);

  const registerTap = useCallback((key) => {
    const expected = SEQUENCE[nextKey % SEQUENCE.length];
    if (key !== expected && !demoMode) return;

    const now = performance.now();
    if (lastTimeRef.current !== null) {
      const interval_ms = now - lastTimeRef.current;
      if (interval_ms < 50 || interval_ms > 2000) { lastTimeRef.current = now; return; }
      const tapN = tapCountRef.current;
      setTaps(prev => [...prev, { tapN, interval_ms: parseFloat(interval_ms.toFixed(1)) }]);
      tapCountRef.current++;
      if (tapCountRef.current >= TARGET_TAPS) {
        setFinished(true);
        clearInterval(demoIntervalRef.current);
      }
    }
    lastTimeRef.current = now;
    setNextKey(n => n + 1);
  }, [nextKey, demoMode]);

  // Key listener
  useEffect(() => {
    if (finished || demoMode) return;
    const handler = (e) => {
      if (['j', 'k'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        registerTap(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [registerTap, finished, demoMode]);

  // Demo mode — simulate bradykinesia
  useEffect(() => {
    if (!demoMode) return;
    lastTimeRef.current = performance.now();
    let n = 0;
    demoIntervalRef.current = setInterval(() => {
      if (n >= TARGET_TAPS) { clearInterval(demoIntervalRef.current); setFinished(true); return; }
      const progress = n / TARGET_TAPS;
      const baseInterval = 300 + progress * 250;
      const jitter = (Math.random() - 0.5) * 40;
      const interval_ms = Math.max(150, baseInterval + jitter);
      setTaps(prev => [...prev, { tapN: n, interval_ms: parseFloat(interval_ms.toFixed(1)) }]);
      n++;
      tapCountRef.current = n;
      setNextKey(k => k + 1);
      lastTimeRef.current = performance.now();
    }, 380);
    return () => clearInterval(demoIntervalRef.current);
  }, [demoMode]);

  const computeResults = () => {
    const intervals = taps.map(t => t.interval_ms);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const n = intervals.length, meanX = (n - 1) / 2;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - meanX) * (intervals[i] - mean);
      den += (i - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    return { meanInterval_ms: parseFloat(mean.toFixed(1)), decelerationSlope: parseFloat(slope.toFixed(3)) };
  };

  const regressionData = () => {
    if (taps.length < 4) return [];
    const r = computeResults();
    return [
      { tapN: 0, interval_ms: r.meanInterval_ms },
      { tapN: taps.length - 1, interval_ms: r.meanInterval_ms + r.decelerationSlope * (taps.length - 1) },
    ];
  };

  const currentKeyLabel = SEQUENCE[nextKey % SEQUENCE.length].toUpperCase();
  const nextKeyLabel    = SEQUENCE[(nextKey + 1) % SEQUENCE.length].toUpperCase();
  const progress        = Math.min(1, taps.length / TARGET_TAPS);
  const lastInterval    = taps[taps.length - 1]?.interval_ms;
  const result          = taps.length > 4 ? computeResults() : null;

  // Dot colour by interval value
  const dotColor = (interval) =>
    interval < 350 ? '#00D4AA' : interval < 480 ? '#FFB547' : '#FF4D6D';

  // Colour each scatter dot individually
  const coloredTaps = taps.map(t => ({ ...t, fill: dotColor(t.interval_ms) }));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-8 select-none">
      {/* Header */}
      <div className="text-center">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
          Keyboard Tap Test
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
          Alternate between <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>J</span> and{' '}
          <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>K</span> as fast as possible — {TARGET_TAPS} taps.
          {demoMode && <span style={{ color: 'var(--accent-amber)' }}> Auto-running in demo mode.</span>}
        </p>
      </div>

      {/* Progress bar + count */}
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {taps.length} / {TARGET_TAPS}
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-teal))',
            transition: 'width 0.08s linear',
          }} />
        </div>
      </div>

      {/* Giant key cards */}
      {!finished && (
        <div style={{ display: 'flex', gap: 'clamp(16px, 4vw, 48px)', alignItems: 'center' }}>
          {SEQUENCE.map((key) => {
            const isNext = SEQUENCE[nextKey % SEQUENCE.length] === key;
            return (
              <KeyCard
                key={key}
                keyLabel={key}
                isNext={isNext}
                isActive={!finished}
                onPress={registerTap}
                disabled={demoMode || finished}
              />
            );
          })}
        </div>
      )}

      {/* Instruction hint */}
      {!finished && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          {demoMode
            ? 'Watch the keys depress automatically…'
            : `Press  ${currentKeyLabel}  →  ${nextKeyLabel}  →  ${currentKeyLabel}  …`}
        </p>
      )}

      {/* Live metrics */}
      {lastInterval && !finished && (
        <div style={{ display: 'flex', gap: 24 }}>
          <LiveMetric
            label="Last interval"
            value={`${lastInterval.toFixed(0)} ms`}
            color={dotColor(lastInterval)}
          />
          {result && (
            <LiveMetric
              label="Trend"
              value={result.decelerationSlope > 0.5 ? '↑ Slowing' : '→ Stable'}
              color={result.decelerationSlope > 0.5 ? '#FFB547' : '#00D4AA'}
            />
          )}
          {result && (
            <LiveMetric
              label="Mean"
              value={`${result.meanInterval_ms} ms`}
              color={dotColor(result.meanInterval_ms)}
            />
          )}
        </div>
      )}

      {/* Live scatter chart */}
      {taps.length > 4 && (
        <div style={{ width: '100%', maxWidth: 480, height: 170 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
              <XAxis
                dataKey="tapN" name="Tap"
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                label={{ value: 'Tap #', position: 'insideBottomRight', fill: 'var(--text-muted)', fontSize: 9, offset: -4 }}
              />
              <YAxis
                dataKey="interval_ms" name="Interval (ms)"
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                domain={[100, 700]}
              />
              <ReferenceLine y={294} stroke="rgba(0,212,170,0.35)" strokeDasharray="4 2"
                label={{ value: 'Healthy mean', fill: '#00D4AA', fontSize: 8, position: 'right' }} />
              <ReferenceLine y={412} stroke="rgba(255,77,109,0.35)" strokeDasharray="4 2"
                label={{ value: 'PD mean', fill: '#FF4D6D', fontSize: 8, position: 'right' }} />
              {/* Individual dots coloured by interval */}
              <Scatter
                data={coloredTaps}
                shape={(props) => {
                  const { cx, cy, fill } = props;
                  return <circle cx={cx} cy={cy} r={3.5} fill={fill} fillOpacity={0.85} />;
                }}
              />
              {/* Regression line in amber */}
              {taps.length > 8 && (
                <Scatter
                  data={regressionData()}
                  fill="var(--accent-amber)"
                  line={{ stroke: 'var(--accent-amber)', strokeWidth: 1.5, strokeDasharray: '0' }}
                  r={0}
                />
              )}
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
                formatter={(v, n) => [n === 'interval_ms' ? `${v} ms` : v, n === 'interval_ms' ? 'Interval' : 'Tap']}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results card */}
      {finished && (() => {
        const r = computeResults();
        return (
          <div className="card w-full max-w-sm animate-fade-in-up" style={{ borderColor: 'rgba(108,99,255,0.3)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Test Complete — {TARGET_TAPS} taps recorded
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
              <LiveMetric
                label="Mean interval"
                value={`${r.meanInterval_ms} ms`}
                color={r.meanInterval_ms < 350 ? '#00D4AA' : r.meanInterval_ms < 450 ? '#FFB547' : '#FF4D6D'}
              />
              <LiveMetric
                label="Deceleration"
                value={`${r.decelerationSlope > 0 ? '+' : ''}${r.decelerationSlope.toFixed(2)} ms/tap`}
                color={r.decelerationSlope < 1 ? '#00D4AA' : r.decelerationSlope < 3 ? '#FFB547' : '#FF4D6D'}
              />
            </div>
            {/* Final scatter (full) */}
            <div style={{ height: 130, marginBottom: 14 }}>
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                  <XAxis dataKey="tapN" tick={{ fontSize: 8, fill: 'var(--text-muted)' }} />
                  <YAxis dataKey="interval_ms" tick={{ fontSize: 8, fill: 'var(--text-muted)' }} domain={[100, 700]} />
                  <ReferenceLine y={294} stroke="rgba(0,212,170,0.3)" strokeDasharray="3 2" />
                  <ReferenceLine y={412} stroke="rgba(255,77,109,0.3)" strokeDasharray="3 2" />
                  <Scatter
                    data={coloredTaps}
                    shape={(props) => {
                      const { cx, cy, fill } = props;
                      return <circle cx={cx} cy={cy} r={2.5} fill={fill} fillOpacity={0.85} />;
                    }}
                  />
                  <Scatter data={regressionData()} fill="var(--accent-amber)"
                    line={{ stroke: 'var(--accent-amber)', strokeWidth: 1.5 }} r={0} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <button
              onClick={() => onComplete(r)}
              style={{
                width: '100%', padding: '13px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-primary)', border: 'none', color: 'white',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Continue →
            </button>
          </div>
        );
      })()}
    </div>
  );
}

function LiveMetric({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
