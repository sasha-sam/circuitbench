import { useState, useRef, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { riskColor, riskTier, riskLabel } from '../hooks/useParkinsonsScorer.js';
import { exportPDF } from '../utils/reportGenerator.js';

const NAV_SECTIONS = [
  { id: 'summary',       label: '01  Executive Summary',       icon: '▸' },
  { id: 'risk',          label: '02  Risk Assessment',          icon: '▸' },
  { id: 'nutrition',     label: '03  Nutrition Plan',           icon: '▸' },
  { id: 'exercise',      label: '04  Exercise Prescription',    icon: '▸' },
  { id: 'sleep',         label: '05  Sleep Protocol',           icon: '▸' },
  { id: 'stress',        label: '06  Stress & Mental Health',   icon: '▸' },
  { id: 'environment',   label: '07  Environmental Factors',    icon: '▸' },
  { id: 'monitoring',    label: '08  Monitoring Plan',          icon: '▸' },
  { id: 'consultation',  label: '09  Consultation Guide',       icon: '▸' },
  { id: 'disclaimer',    label: '10  Disclaimer & Data',        icon: '▸' },
];

// Map AI signal names → actual score keys in the scores object
const SIGNAL_SCORE_MAP = {
  'finger tap interval':  'fingerTapInterval',
  'finger tap decel':     'fingerTapDecel',
  'tremor freq':          'tremorFreq',
  'tremor amplitude':     'tremorAmplitude',
  'arm swing asymmetry':  'armSwingAsymmetry',
  'spiral smoothness':    'spiralSmoothness',
  'spiral tremor':        'spiralTremor',
  'keyboard interval':    'keyboardInterval',
  'keyboard decel':       'keyboardDecel',
  'voice jitter':         'voiceJitter',
  'voice shimmer':        'voiceShimmer',
  'voice hnr':            'voiceHNR',
  'voice nhr':            'voiceNHR',
  'rt simple':            'rtSimple',
  'rt choice':            'rtChoice',
  'rt switch cost':       'rtSwitchCost',
};

function resolveScore(sigName, scores) {
  const key = sigName.toLowerCase().replace(/[^a-z ]/g, '').trim();
  // Direct match
  for (const [pattern, scoreKey] of Object.entries(SIGNAL_SCORE_MAP)) {
    if (key.includes(pattern)) return scores[scoreKey];
  }
  // Fuzzy: try camelCase variant
  const camel = sigName.replace(/[\s_-]+([a-z])/g, (_, c) => c.toUpperCase());
  return scores[camel] || scores[sigName] || null;
}

// ── Urgency overlay ─────────────────────────────────────────────────────────
function UrgencyOverlay({ tier, name, onDismiss }) {
  if (tier !== 'URGENT') return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(10,10,15,0.97)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 520, textAlign: 'center',
        border: '1px solid rgba(255,45,85,0.4)',
        borderRadius: 'var(--radius-xl)', padding: '48px 40px',
        background: 'rgba(255,45,85,0.04)',
        boxShadow: '0 0 80px rgba(255,45,85,0.12)',
      }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem' }}>
          ⚠
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ff2d55', marginBottom: 14 }}>
          Important Notice
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.8, marginBottom: 8 }}>
          {name ? `${name}, your` : 'Your'} results show significant deviation across multiple motor signals.
        </p>
        <p style={{ color: 'var(--text-primary)', fontSize: '1rem', lineHeight: 1.8, marginBottom: 24 }}>
          We recommend contacting your GP or a neurologist <strong>this week</strong> to discuss these findings.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.7, marginBottom: 32 }}>
          This screening tool does not diagnose Parkinson's disease. Many factors can cause elevated motor signals.
          Your GP can provide a proper evaluation.
        </p>
        <button
          onClick={onDismiss}
          style={{
            padding: '14px 36px', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,45,85,0.4)',
            background: 'rgba(255,45,85,0.12)', color: '#ff2d55',
            fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          I understand — view full report
        </button>
      </div>
    </div>
  );
}

// ── Animated arc gauge ──────────────────────────────────────────────────────
function ArcGauge({ value, color, size = 140 }) {
  const [animated, setAnimated] = useState(false);
  const R = size * 0.37;
  const CIRC = 2 * Math.PI * R;
  const target = CIRC * (1 - value / 100);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="var(--bg-elevated)" strokeWidth={size * 0.07} />
      {/* Filled arc */}
      <circle
        cx={size/2} cy={size/2} r={R}
        fill="none" stroke={color} strokeWidth={size * 0.07}
        strokeDasharray={CIRC}
        strokeDashoffset={animated ? target : CIRC}
        strokeLinecap="round"
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
          transition: animated ? 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      />
      {/* Value */}
      <text x={size/2} y={size/2 - size*0.04} textAnchor="middle" fontSize={size*0.2} fontWeight="800" fill={color}>
        {value}
      </text>
      <text x={size/2} y={size/2 + size*0.1} textAnchor="middle" fontSize={size*0.08} fill="var(--text-muted)">
        / 100
      </text>
    </svg>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────
function Section({ id, title, children }) {
  return (
    <div id={id} style={{ marginBottom: 48, scrollMarginTop: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
        paddingBottom: 12, borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ width: 3, height: 22, borderRadius: 99, background: 'var(--accent-primary)', flexShrink: 0 }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

function Prose({ text }) {
  if (!text) return null;
  return <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.9rem', margin: 0 }}>{text}</p>;
}

function BulletList({ items = [], color = 'var(--text-secondary)' }) {
  if (!items.length) return null;
  return (
    <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 3, fontSize: '0.7rem' }}>◆</span>
          <span style={{ color, lineHeight: 1.65, fontSize: '0.875rem' }}>
            {typeof item === 'object' ? JSON.stringify(item) : item}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Signal deviation bar ────────────────────────────────────────────────────
function SignalBar({ signal, score, z, healthyMean }) {
  const [animated, setAnimated] = useState(false);
  const color = riskColor(score);
  const pct = Math.min(100, Math.max(2, score));

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {signal}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {healthyMean && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              healthy: {healthyMean}
            </span>
          )}
          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>
            {score}/100
          </span>
          {z !== undefined && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ({z > 0 ? '+' : ''}{z}σ)
            </span>
          )}
        </div>
      </div>
      <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
        {/* Healthy zone marker (0–40%) */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%',
          background: 'rgba(0,212,170,0.08)',
          borderRight: '1px solid rgba(0,212,170,0.2)',
        }} />
        {/* Score bar */}
        <div style={{
          height: '100%', borderRadius: 99,
          width: animated ? `${pct}%` : '0%',
          background: `linear-gradient(90deg, ${color}bb, ${color})`,
          transition: 'width 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: `0 0 8px ${color}60`,
        }} />
      </div>
    </div>
  );
}

// ── Food card ───────────────────────────────────────────────────────────────
function FoodCard({ food, mechanism, evidence }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)', marginBottom: 8,
    }}>
      <p style={{ fontWeight: 600, color: 'var(--accent-teal)', fontSize: '0.875rem', marginBottom: 4 }}>{food}</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.55, marginBottom: mechanism && evidence ? 4 : 0 }}>{mechanism}</p>
      {evidence && <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.4 }}>{evidence}</p>}
    </div>
  );
}

// ── 7-day weekly grid ───────────────────────────────────────────────────────
const DAY_COLORS = ['#6C63FF', '#4DACFF', '#00D4AA', '#6C63FF', '#FFB547', '#00D4AA', '#8B5CF6'];

function WeekGrid({ schedule = [] }) {
  if (!schedule.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
      {schedule.slice(0, 7).map((day, i) => {
        const color = DAY_COLORS[i % DAY_COLORS.length];
        const intensity = (day.intensity || '').toLowerCase();
        const intensityColor = intensity.includes('high') ? '#FF4D6D'
          : intensity.includes('moderate') || intensity.includes('medium') ? '#FFB547'
          : '#00D4AA';
        return (
          <div key={i} style={{
            padding: '10px 6px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)', border: `1px solid ${color}25`,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {typeof day.day === 'string' ? day.day.slice(0, 3) : `D${i+1}`}
            </p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 4 }}>
              {day.activity || '—'}
            </p>
            {day.duration && (
              <p style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 3 }}>{day.duration}</p>
            )}
            {day.intensity && (
              <div style={{
                display: 'inline-block', padding: '1px 5px', borderRadius: 99,
                background: `${intensityColor}15`, border: `1px solid ${intensityColor}30`,
                fontSize: '0.56rem', color: intensityColor, fontWeight: 600,
              }}>
                {intensity}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Copy-to-clipboard GP script ─────────────────────────────────────────────
function GPScript({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(108,99,255,0.06)',
        border: '1px solid rgba(108,99,255,0.25)',
        padding: '18px 52px 18px 18px',
        borderLeft: '3px solid var(--accent-primary)',
      }}>
        <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.8, fontStyle: 'italic', margin: 0 }}>
          "{text}"
        </p>
      </div>
      <button
        onClick={copy}
        title="Copy to clipboard"
        style={{
          position: 'absolute', top: 12, right: 12,
          padding: '5px 10px', borderRadius: 6,
          border: '1px solid var(--border)',
          background: copied ? 'rgba(0,212,170,0.15)' : 'var(--bg-elevated)',
          color: copied ? 'var(--accent-teal)' : 'var(--text-muted)',
          cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        {copied ? '✓ Copied' : '⎘ Copy'}
      </button>
    </div>
  );
}

// ── Main ReportView ─────────────────────────────────────────────────────────
export default function ReportView({ report, scores, userProfile, onRestart }) {
  const [urgencyDismissed, setUrgencyDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');

  const agg   = scores.aggregate ?? 0;
  const tier  = riskTier(agg);
  const color = riskColor(tier);

  // Radar data — inverted (higher = healthier for display)
  const radarData = [
    { subject: 'Tap Speed',   A: 100 - (scores.fingerTapInterval?.score ?? 0) },
    { subject: 'Tremor',      A: 100 - (scores.tremorFreq?.score ?? 0) },
    { subject: 'Arm Swing',   A: 100 - (scores.armSwingAsymmetry?.score ?? 0) },
    { subject: 'Spiral',      A: 100 - (scores.spiralSmoothness?.score ?? 0) },
    { subject: 'Voice',       A: 100 - (scores.voiceJitter?.score ?? 0) },
    { subject: 'Reaction',    A: 100 - (scores.rtSimple?.score ?? 0) },
    { subject: 'Keyboard',    A: 100 - (scores.keyboardInterval?.score ?? 0) },
  ];

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await exportPDF(report, scores, userProfile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neuromotor-report-${(userProfile.name ?? 'report').toLowerCase()}-${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('PDF export failed: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const ra  = report.riskAssessment     ?? {};
  const np  = report.nutritionPlan      ?? {};
  const ep  = report.exercisePlan       ?? {};
  const sp  = report.sleepProtocol      ?? {};
  const stp = report.stressProtocol     ?? {};
  const ef  = report.environmentalFactors ?? {};
  const mon = report.monitoringPlan     ?? {};
  const cg  = report.consultationGuide  ?? {};
  const dis = report.disclaimer         ?? {};

  // Default red flags shown even without AI report
  const redFlags = mon.redFlags?.length
    ? mon.redFlags
    : [
        'Resting tremor at rest (not when moving)',
        'Handwriting getting smaller (micrographia)',
        'Sudden loss of or reduced sense of smell',
        'Vivid dreams / acting out dreams in sleep (REM behaviour disorder)',
        'New onset constipation — early autonomic sign',
      ];

  return (
    <>
      {!urgencyDismissed && (
        <UrgencyOverlay tier={tier} name={userProfile.name} onDismiss={() => setUrgencyDismissed(true)} />
      )}

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>

        {/* ── Sticky left sidebar ─────────────────────────────────────────── */}
        <aside style={{
          width: 240, flexShrink: 0, overflow: 'auto',
          background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Patient block */}
          <div style={{ padding: '20px 16px 18px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Report for</p>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: 2 }}>
              {userProfile.name || 'Anonymous'}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', padding: '4px 12px',
              borderRadius: 99, border: `1px solid ${color}50`,
              background: `${color}15`, color, fontSize: '0.72rem', fontWeight: 700,
            }}>
              {tier}
            </div>
          </div>

          {/* Composite mini-gauge */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <ArcGauge value={agg} color={color} size={52} />
            <div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>Composite score</p>
              <p style={{ fontSize: '0.75rem', color, fontWeight: 600, lineHeight: 1.3 }}>{riskLabel(tier)}</p>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
            {NAV_SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '9px 16px',
                  cursor: 'pointer', border: 'none', outline: 'none',
                  background: activeSection === s.id ? 'rgba(108,99,255,0.1)' : 'transparent',
                  borderLeft: `3px solid ${activeSection === s.id ? 'var(--accent-primary)' : 'transparent'}`,
                  color: activeSection === s.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.73rem', textAlign: 'left', lineHeight: 1.3,
                  transition: 'all 0.12s',
                }}
              >
                <span>{s.label}</span>
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                padding: '10px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: downloading ? 'var(--bg-elevated)' : 'var(--accent-primary)',
                color: 'white', cursor: downloading ? 'not-allowed' : 'pointer',
                fontSize: '0.78rem', fontWeight: 600,
                boxShadow: downloading ? 'none' : '0 0 14px rgba(108,99,255,0.3)',
              }}
            >
              {downloading ? 'Generating PDF…' : '↓  Download PDF'}
            </button>
            <button
              onClick={onRestart}
              style={{
                padding: '10px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem',
              }}
            >
              ↺  New Assessment
            </button>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflow: 'auto', padding: '36px 44px 100px', maxWidth: 900 }}>

          {/* Hero row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, marginBottom: 44 }}>
            <ArcGauge value={agg} color={color} size={130} />

            {/* Radar */}
            <div style={{ flex: 1, height: 160, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 4, right: 24, bottom: 4, left: 24 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 9.5 }} />
                  <Radar name="Health" dataKey="A" stroke={color} fill={color} fillOpacity={0.12} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Title block */}
            <div style={{ paddingTop: 10, flexShrink: 0 }}>
              <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.2 }}>
                {userProfile.name ? `${userProfile.name}'s` : 'Your'}<br />
                Neuromotor Report
              </h1>
              <div style={{
                display: 'inline-flex', padding: '5px 14px', borderRadius: 99,
                border: `1px solid ${color}50`, background: `${color}12`,
                color, fontSize: '0.78rem', fontWeight: 600, marginBottom: 10,
              }}>
                {riskLabel(tier)}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                {scores._completedTests ?? 0}/7 tests completed<br />
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Elevated tier banner */}
          {(tier === 'RED' || tier === 'URGENT') && (
            <div style={{
              padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 32,
              background: 'rgba(255,77,109,0.07)', border: '1px solid rgba(255,77,109,0.3)',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{ fontSize: '1.1rem', marginTop: 1, flexShrink: 0 }}>🔴</span>
              <p style={{ color: '#ff4d6d', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                <strong>{tier === 'URGENT' ? 'Significant deviation detected.' : 'Elevated signals detected.'}</strong>{' '}
                {tier === 'URGENT'
                  ? 'We recommend speaking to your GP or a neurologist this week.'
                  : 'We recommend a GP visit within 4 weeks to discuss these results.'}
              </p>
            </div>
          )}

          {/* ── 01 Executive Summary ────────────────────────────────────── */}
          <Section id="summary" title="Executive Summary">
            <Card>
              {(report.executiveSummary?.paragraphs ?? []).map((p, i, arr) => (
                <p key={i} style={{
                  color: 'var(--text-secondary)', lineHeight: 1.95, fontSize: '0.98rem',
                  marginBottom: i < arr.length - 1 ? 18 : 0,
                }}>
                  {p}
                </p>
              ))}
            </Card>
          </Section>

          {/* ── 02 Risk Assessment ──────────────────────────────────────── */}
          <Section id="risk" title="Risk Assessment">
            {/* Urgency pill + text */}
            <Card style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{
                  padding: '5px 14px', borderRadius: 99, border: `1px solid ${color}50`,
                  background: `${color}15`, color, fontSize: '0.78rem', fontWeight: 700,
                }}>
                  {ra.urgencyLevel || tier}
                </div>
                <Prose text={ra.urgencyText} />
              </div>

              {/* Signal bars using ACTUAL scores object */}
              {Object.entries(scores)
                .filter(([k, v]) => !['aggregate', '_completedTests'].includes(k) && v?.score !== undefined && v.score > 0)
                .sort(([, a], [, b]) => b.score - a.score)
                .map(([key, val]) => (
                  <SignalBar
                    key={key}
                    signal={key.replace(/([A-Z])/g, ' $1').trim()}
                    score={val.score}
                    z={val.z}
                  />
                ))}
            </Card>

            {/* Elevated signals explained (from AI) */}
            {ra.elevatedSignals?.length > 0 && (
              <Card style={{ marginBottom: 14 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Elevated Signals — Plain English
                </p>
                {ra.elevatedSignals.map((sig, i) => {
                  // Look up actual score from scores object
                  const resolved = resolveScore(sig.signal, scores);
                  return (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < ra.elevatedSignals.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <p style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: '0.875rem', margin: 0 }}>{sig.signal}</p>
                        {resolved && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {resolved.score}/100 · z={resolved.z > 0 ? '+' : ''}{resolved.z}σ
                          </span>
                        )}
                      </div>
                      <Prose text={sig.plainEnglishExplanation} />
                      {sig.healthyMean && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Healthy population mean: {sig.healthyMean}
                        </p>
                      )}
                    </div>
                  );
                })}
              </Card>
            )}

            {/* Healthy signals */}
            {ra.healthySignals?.length > 0 && (
              <Card style={{ background: 'rgba(0,212,170,0.04)', borderColor: 'rgba(0,212,170,0.2)', marginBottom: 14 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Within Healthy Norms
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {ra.healthySignals.join('  ·  ')}
                </p>
              </Card>
            )}

            {/* Caveats */}
            {ra.confidenceCaveats?.length > 0 && (
              <Card style={{ background: 'rgba(77,172,255,0.05)', borderColor: 'rgba(77,172,255,0.2)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Confidence Caveats
                </p>
                <BulletList items={ra.confidenceCaveats} color="var(--text-muted)" />
              </Card>
            )}
          </Section>

          {/* ── 03 Nutrition ────────────────────────────────────────────── */}
          <Section id="nutrition" title="Neuroprotective Nutrition Plan">
            {np.headline && <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>{np.headline}</p>}

            {np.foodsIncrease?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Increase
                </p>
                {np.foodsIncrease.map((f, i) => (
                  <FoodCard key={i} {...(typeof f === 'object' ? f : { food: f })} />
                ))}
              </div>
            )}

            {np.foodsReduce?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Reduce or Eliminate
                </p>
                <Card>
                  <BulletList
                    items={np.foodsReduce.map(f => typeof f === 'object' ? `${f.food} — ${f.reason}` : f)}
                    color="var(--text-secondary)"
                  />
                </Card>
              </div>
            )}

            {np.gutBrainSection && (
              <Card style={{ marginBottom: 16, background: 'rgba(0,212,170,0.04)', borderColor: 'rgba(0,212,170,0.2)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Gut–Brain Axis
                </p>
                <Prose text={np.gutBrainSection} />
              </Card>
            )}

            {np.micronutrients && Object.keys(np.micronutrients).length > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Key Micronutrients
                </p>
                {Object.entries(np.micronutrients).map(([k, v]) => v && (
                  <div key={k} style={{ marginBottom: 7 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'capitalize' }}>
                      {k.replace(/([A-Z])/g, ' $1')}: {' '}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{v}</span>
                  </div>
                ))}
              </Card>
            )}

            {np.sampleDay && Object.keys(np.sampleDay).length > 0 && (
              <Card>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Sample Day of Eating
                </p>
                {Object.entries(np.sampleDay).map(([meal, desc]) => (
                  <div key={meal} style={{ marginBottom: 9, paddingBottom: 9, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-teal)', textTransform: 'capitalize', marginRight: 8 }}>
                      {meal}:
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{desc}</span>
                  </div>
                ))}
              </Card>
            )}
          </Section>

          {/* ── 04 Exercise ─────────────────────────────────────────────── */}
          <Section id="exercise" title="Exercise Prescription">
            {ep.headline && <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>{ep.headline}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Aerobic', key: 'aerobic',    accent: 'var(--accent-blue)' },
                { label: 'Resistance', key: 'resistance', accent: 'var(--accent-primary)' },
                { label: 'Balance',    key: 'balance',    accent: 'var(--accent-teal)' },
                { label: 'Fine Motor', key: 'fineMotor',  accent: 'var(--accent-amber)' },
              ].map(({ label, key, accent }) => {
                const section = ep[key];
                if (!section || typeof section !== 'object' || !Object.keys(section).length) return null;
                return (
                  <Card key={key}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: accent, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {label}
                    </p>
                    {section.description && <Prose text={section.description} />}
                    {section.heartRateZone && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                        Zone: <span style={{ color: 'var(--text-secondary)' }}>{section.heartRateZone}</span>
                      </p>
                    )}
                    {section.evidence && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>{section.evidence}</p>
                    )}
                    {Array.isArray(section.modalities || section.movements || section.exercises) && (
                      <div style={{ marginTop: 8 }}>
                        <BulletList
                          items={(section.modalities || section.movements || section.exercises || []).slice(0, 4)}
                          color="var(--text-muted)"
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {ep.voiceExercises && (
              <Card style={{ marginBottom: 16, background: 'rgba(108,99,255,0.05)', borderColor: 'rgba(108,99,255,0.2)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Voice Exercises</p>
                <Prose text={ep.voiceExercises} />
              </Card>
            )}

            {ep.weeklySchedule?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  7-Day Schedule
                </p>
                <WeekGrid schedule={ep.weeklySchedule} />
              </div>
            )}
          </Section>

          {/* ── 05 Sleep ────────────────────────────────────────────────── */}
          <Section id="sleep" title="Sleep Optimisation Protocol">
            {sp.headline && <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 14 }}>{sp.headline}</p>}
            <Card style={{ marginBottom: 14 }}>
              <BulletList items={sp.keyPoints ?? []} />
            </Card>
            {sp.supplements?.length > 0 && (
              <Card style={{ marginBottom: 14 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Supplements</p>
                {sp.supplements.map((s, i) => (
                  <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < sp.supplements.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>{s.name} </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {[s.dose, s.timing].filter(Boolean).join(' · ')}
                    </span>
                    {s.evidence && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.evidence}</p>
                    )}
                  </div>
                ))}
              </Card>
            )}
            {sp.monitorFor?.length > 0 && (
              <Card style={{ background: 'rgba(255,77,109,0.05)', borderColor: 'rgba(255,77,109,0.2)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-red)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Sleep Red Flags</p>
                <BulletList items={sp.monitorFor} color="var(--text-secondary)" />
              </Card>
            )}
          </Section>

          {/* ── 06 Stress ───────────────────────────────────────────────── */}
          <Section id="stress" title="Stress & Mental Health Protocol">
            {stp.headline && <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 14 }}>{stp.headline}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(stp.techniques ?? []).map((t, i) => (
                <Card key={i}>
                  <p style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.9rem', marginBottom: 5 }}>
                    {typeof t === 'object' ? t.name : t}
                  </p>
                  {typeof t === 'object' && t.mechanism && <Prose text={t.mechanism} />}
                  {typeof t === 'object' && t.evidence && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 5, fontStyle: 'italic' }}>{t.evidence}</p>
                  )}
                </Card>
              ))}
            </div>
            {stp.cognitiveActivities?.length > 0 && (
              <Card style={{ marginTop: 10 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Cognitive Stimulation
                </p>
                <BulletList items={stp.cognitiveActivities} />
              </Card>
            )}
          </Section>

          {/* ── 07 Environment ──────────────────────────────────────────── */}
          <Section id="environment" title="Environmental & Lifestyle Factors">
            {ef.avoid?.length > 0 && (
              <Card style={{ marginBottom: 12, background: 'rgba(255,77,109,0.05)', borderColor: 'rgba(255,77,109,0.2)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-red)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Avoid / Minimise
                </p>
                <BulletList items={ef.avoid} />
              </Card>
            )}
            {ef.monitor?.length > 0 && (
              <Card style={{ marginBottom: 12 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Monitor</p>
                <BulletList items={ef.monitor} />
              </Card>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(ef.lifestyle ?? []).map((item, i) => (
                <Card key={i}>
                  <p style={{ fontWeight: 600, color: 'var(--accent-teal)', fontSize: '0.875rem', marginBottom: 5 }}>
                    {typeof item === 'object' ? item.factor : item}
                  </p>
                  {typeof item === 'object' && item.evidence && <Prose text={item.evidence} />}
                  {typeof item === 'object' && item.action && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: 5 }}>→ {item.action}</p>
                  )}
                </Card>
              ))}
            </div>
          </Section>

          {/* ── 08 Monitoring ───────────────────────────────────────────── */}
          <Section id="monitoring" title="Monitoring Plan">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Card>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Next Screening</p>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color }}>{mon.rescreeningDate || 'In 6 months'}</p>
                {mon.urgencyContext && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{mon.urgencyContext}</p>}
              </Card>
              {mon.watchSignals?.length > 0 && (
                <Card>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Watch Signals</p>
                  <BulletList items={mon.watchSignals} />
                </Card>
              )}
            </div>

            {/* Red flags — always shown, prominent */}
            <Card style={{ background: 'rgba(255,77,109,0.06)', borderColor: 'rgba(255,77,109,0.35)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1rem' }}>🚨</span>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff4d6d', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
                  See a Doctor Immediately If You Notice
                </p>
              </div>
              <BulletList items={redFlags} color="var(--text-secondary)" />
            </Card>

            {mon.biomarkers?.length > 0 && (
              <Card>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Biomarkers to Discuss with GP
                </p>
                <BulletList items={mon.biomarkers} />
              </Card>
            )}
          </Section>

          {/* ── 09 Consultation Guide ───────────────────────────────────── */}
          <Section id="consultation" title="GP Consultation Guide">
            <Card style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ padding: '4px 12px', borderRadius: 99, border: `1px solid ${color}50`, background: `${color}12`, color, fontSize: '0.75rem', fontWeight: 700 }}>
                  {cg.urgency || ra.urgencyLevel || tier}
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                What to say to your GP:
              </p>
              {cg.gpScript && <GPScript text={cg.gpScript} />}
            </Card>

            {cg.specialistType && (
              <Card style={{ marginBottom: 14, background: 'rgba(108,99,255,0.05)', borderColor: 'rgba(108,99,255,0.2)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>Specialist: </strong>{cg.specialistType}
                </p>
              </Card>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {cg.testsToRequest?.length > 0 && (
                <Card>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Tests to Request</p>
                  <BulletList items={cg.testsToRequest} />
                </Card>
              )}
              {cg.questionsToAsk?.length > 0 && (
                <Card>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Questions to Ask</p>
                  <BulletList items={cg.questionsToAsk} />
                </Card>
              )}
            </div>
          </Section>

          {/* ── 10 Disclaimer ───────────────────────────────────────────── */}
          <Section id="disclaimer" title="Disclaimer & Data Provenance">
            <Card style={{ marginBottom: 14, background: 'rgba(255,77,109,0.03)', borderColor: 'rgba(255,77,109,0.2)' }}>
              <Prose text={dis.text || 'This is a research-grade screening tool, not a medical diagnostic device. It cannot diagnose Parkinson\'s disease or any other medical condition. Always consult a qualified medical professional.'} />
            </Card>
            <Card>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Clinical Datasets Used
              </p>
              <BulletList items={dis.datasets ?? []} color="var(--text-muted)" />
              {dis.confidenceExplanation && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  {dis.confidenceExplanation}
                </p>
              )}
            </Card>
          </Section>

        </main>
      </div>
    </>
  );
}
