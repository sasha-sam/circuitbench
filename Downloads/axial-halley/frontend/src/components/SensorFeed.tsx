import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Eye } from 'lucide-react';

interface SensorFeedProps {
    active: boolean; // Domain availability
    domain: string;
}

export function SensorFeed({ active, domain }: SensorFeedProps) {
    const webcamRef = useRef<Webcam>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [enabled, setEnabled] = useState(false); // User Toggle

    // Simulate CV analysis cycle ONLY if active AND enabled
    useEffect(() => {
        if (!active || !enabled) {
            setAnalyzing(false);
            return;
        }
        const interval = setInterval(() => {
            setAnalyzing(true);
            setTimeout(() => setAnalyzing(false), 800);
        }, 4000);
        return () => clearInterval(interval);
    }, [active, enabled]);

    if (!active) {
        return (
            <div className="h-48 bg-black border border-slate-800 flex items-center justify-center text-slate-700 font-mono text-xs uppercase tracking-widest">
                <span className="flex items-center gap-2"><Eye size={14} className="opacity-50" /> Optical Sensor Offline</span>
            </div>
        );
    }

    return (
        <div className="relative h-48 bg-black border border-slate-800 overflow-hidden group">
            {enabled ? (
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity grayscale hover:grayscale-0"
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505]">
                    <Eye size={24} className="text-slate-800 mb-2" />
                    <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Visual Agent Paused</span>
                </div>
            )}

            {/* UI Overlay - Toggle Switch */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${enabled && analyzing ? 'bg-red-500 animate-pulse' : enabled ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                    <span className="text-[10px] font-mono text-white/80 bg-black/50 px-1 rounded">
                        CV AGENT // {domain.toUpperCase()}
                    </span>
                </div>

                <button
                    onClick={() => setEnabled(!enabled)}
                    className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded transition-all ${enabled
                        ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50'
                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                        }`}
                >
                    {enabled ? 'ON' : 'OFF'}
                </button>
            </div>

            {enabled && (
                <div className="absolute bottom-2 right-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-black/50 px-1 rounded">
                        1280x720 @ 30fps
                    </span>
                </div>
            )}

            {/* Scanning Effect */}
            {enabled && analyzing && (
                <div className="absolute inset-0 border-2 border-blue-500/20 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                    <div className="absolute bottom-4 left-4 text-xs font-mono text-blue-400 bg-black/60 px-2 py-1">
                        DETECTING: COMPONENT_CLUSTER
                    </div>
                </div>
            )}
        </div>
    );
}
