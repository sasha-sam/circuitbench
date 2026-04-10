import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, Microscope, Zap, CheckCircle, FileText, Terminal, Database, Eye } from 'lucide-react';
import { ExperimentInterview } from './components/ExperimentInterview';

// Types aligning with python backend
interface Event {
    id: string;
    type: string;
    source: string;
    payload: any;
    timestamp: number;
}

const API_URL = "http://localhost:8000";

// Minimal Science Theme - The user selected #0B0B0B background in CSS
// We just need mild accents here.
const THEME = {
    panel: "science-panel",
    text_label: "science-text"
};

import { WorkspaceGuide } from './components/WorkspaceGuide';
import { SensorFeed } from './components/SensorFeed';
import { ActiveAgentsPanel } from './components/ActiveAgentsPanel';
import { ManualInput } from './components/ManualInput';
import { ResearchPanel } from './components/ResearchPanel';

function App() {
    const [events, setEvents] = useState<Event[]>([]);
    const [activeHypothesis, setActiveHypothesis] = useState<any>(null);

    // App State
    const [isInterviewComplete, setIsInterviewComplete] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [personalizationData, setPersonalizationData] = useState<any>(null);

    // Derived check for domain to enable/disable CV
    const domain = personalizationData?.domain || 'Research';
    const isHardwareOrBio = true; // ALWAYS ENABLE CAMERA FOR DEMO PURPOSES as user requested visuals

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_URL}/history`);
            setEvents(res.data);
            const hyps = res.data.filter((e: Event) => e.type === 'hypothesis');
            if (hyps.length > 0) setActiveHypothesis(hyps[hyps.length - 1].payload);
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const handleInterviewComplete = async (data: any) => {
        setPersonalizationData(data);
        setIsInterviewComplete(true);
        setShowGuide(true); // Show guide after interview

        // Notify Backend of configuration
        // We map the answers to the Domain Config expectations
        // In a real app, this payload would be richer
        let backendDomain = 'Software';
        if (data.domain.includes('Hardware')) backendDomain = 'Hardware';
        if (data.domain.includes('Bio')) backendDomain = 'Biology';
        if (data.domain.includes('Chem')) backendDomain = 'Chemistry';

        await axios.post(`${API_URL}/configure/domain`, { domain: backendDomain });

        // Auto-start simulation for demo purposes if needed, or wait for user
    };

    const handleGuideClose = () => {
        setShowGuide(false);
    };

    const triggerSimulation = async () => {
        await axios.post(`${API_URL}/simulate/user-mistake`);
    };

    useEffect(() => {
        const interval = setInterval(fetchHistory, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen p-6 font-mono selection:bg-blue-500/30 selection:text-white">
            <AnimatePresence>
                {!isInterviewComplete && <ExperimentInterview onComplete={handleInterviewComplete} />}
                {showGuide && <WorkspaceGuide onClose={handleGuideClose} />}
            </AnimatePresence>

            {/* Header */}
            <header className="flex justify-between items-end mb-6 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-xl font-light text-white tracking-wide">
                        AUTO-SCIENTIST <span className="text-xs text-slate-600 align-top ml-1">v3.0</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-slate-500 uppercase flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            System Online
                        </span>
                        {personalizationData && (
                            <span className="text-xs text-slate-500 uppercase border-l border-slate-800 pl-4">
                                Context: {personalizationData.domain} // Confidence: {personalizationData.confidence}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={triggerSimulation}
                    className="bg-[#1a1a1a] hover:bg-[#222] border border-slate-700 text-slate-300 px-4 py-2 text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                    title="Triggers a simulated user mistake to test the autonomous reasoning loop."
                >
                    <Zap size={14} /> Run Simulation Protocol
                </button>
            </header>

            <main className="grid grid-cols-12 gap-6 h-[85vh]">



                // ... (in main render)

                {/* LEFT COLUMN: SENSORS & AGENTS */}
                <div className="col-span-3 flex flex-col gap-6">
                    {/* Active Agents Visualization */}
                    <ActiveAgentsPanel domain={domain} />

                    {/* Sensor Feed (Camera) */}
                    <section className={`${THEME.panel} p-4 rounded-sm`}>
                        <h3 className={`${THEME.text_label} mb-2 flex items-center gap-2 px-1`}>
                            <Eye size={14} /> Sensor Array (CV)
                        </h3>
                        <SensorFeed active={isHardwareOrBio} domain={domain} />
                    </section>

                    {/* Artifact Stub */}
                    <section className={`h-1/3 ${THEME.panel} p-4 rounded-sm flex flex-col`}>
                        <h3 className={`${THEME.text_label} mb-4 flex items-center gap-2`}>
                            <Database size={14} /> Artifact Repository
                        </h3>
                        <div className="flex-1 flex items-center justify-center border border-dashed border-slate-800 rounded">
                            <div className="text-center w-full">
                                <p className="text-xs text-slate-600 mb-2">Drag & Drop Protocol / Data</p>
                                <label className="cursor-pointer text-[10px] bg-slate-900 border border-slate-800 px-3 py-1 text-slate-500 hover:text-white transition inline-block">
                                    Upload/Select Source
                                    <input type="file" className="hidden" onChange={async (e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            // Mock Upload
                                            await axios.post(`${API_URL}/event`, {
                                                type: 'artifact_uploaded',
                                                source: 'frontend',
                                                payload: { filename: file.name, size: file.size }
                                            });
                                            alert(`Ingested ${file.name} into Knowledge Base.`);
                                        }
                                    }} />
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Research Assistant */}
                    <section className="h-1/3">
                        <ResearchPanel />
                    </section>
                </div>

                {/* MIDDLE COLUMN: REASONING & EVENTS */}
                <div className="col-span-6 flex flex-col gap-6">
                    {/* Active Hypothesis */}
                    <section className={`${THEME.panel} p-6 border-l-2 border-l-blue-900/50 min-h-[200px]`}>
                        <h3 className={`${THEME.text_label} mb-4 flex items-center gap-2 text-blue-500`}>
                            <Brain size={14} /> Current Reasoning Model
                        </h3>
                        {activeHypothesis ? (
                            <div>
                                <p className="text-lg text-slate-200 font-light leading-relaxed mb-4">
                                    "{activeHypothesis.claim}"
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900/50 p-2 border border-slate-800">
                                        <span className="block text-[10px] text-slate-600 uppercase mb-1">Confidence</span>
                                        <span className="text-sm text-blue-400 font-mono">{(activeHypothesis.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 border border-slate-800">
                                        <span className="block text-[10px] text-slate-600 uppercase mb-1">Evidence Chain</span>
                                        <span className="text-xs text-slate-400 truncate">{activeHypothesis.evidence.length} signals correlated</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-600 italic">Analysis initialization pending...</p>
                        )}
                    </section>

                    {/* Event Stream + Input */}
                    <section className={`flex-1 ${THEME.panel} p-0 overflow-hidden flex flex-col`}>
                        <div className="p-3 border-b border-slate-800 bg-[#161616]">
                            <h3 className={`${THEME.text_label} flex items-center gap-2`}>
                                <Terminal size={14} /> Event Telemetry
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-3 custom-scrollbar">
                            {events.slice().reverse().map((evt) => (
                                <div key={evt.id} className="flex gap-3 group hover:bg-[#1a1a1a] p-1 -mx-2 px-2 rounded">
                                    <span className="text-slate-600 min-w-[70px]">{new Date(evt.timestamp * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    <span className={`uppercase font-bold tracking-wider min-w-[120px] ${getTypeColor(evt.type)}`}>
                                        {evt.type.replace('domain_', '').replace('intervention_', '').substring(0, 15)}
                                    </span>
                                    <span className="text-slate-400 break-all">{renderPayload(evt)}</span>
                                </div>
                            ))}
                            {events.length === 0 && <span className="text-slate-700">Waiting for signal acquisition...</span>}
                        </div>
                        <div className="p-4 bg-[#111111]">
                            <ManualInput />
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN: EVALS & CONTROLS */}
                <div className="col-span-3 flex flex-col gap-6">
                    <section className={`flex-1 ${THEME.panel} p-4`}>
                        <h3 className={`${THEME.text_label} mb-4 flex items-center gap-2`}>
                            <Microscope size={14} /> Exp. Controls
                        </h3>
                        <div className="space-y-2">
                            {events.filter(e => e.type.includes('experiment') || e.type.includes('intervention')).slice(0, 3).map(e => (
                                <div key={e.id} className="border border-slate-800 bg-slate-900/30 p-2 text-xs">
                                    <span className="text-emerald-500 block mb-1">ACTIVE INTERVENTION</span>
                                    {renderPayload(e)}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className={`h-1/3 ${THEME.panel} p-4`}>
                        <h3 className={`${THEME.text_label} mb-4 flex items-center gap-2`}>
                            <CheckCircle size={14} /> Eval Metrics
                        </h3>
                        {/* Mock Chart Stub */}
                        <div className="flex h-full items-end gap-1 px-2 pb-2 opacity-50">
                            <div className="w-1/4 bg-blue-900/40 h-[40%]"></div>
                            <div className="w-1/4 bg-blue-900/60 h-[60%]"></div>
                            <div className="w-1/4 bg-blue-900/80 h-[30%]"></div>
                            <div className="w-1/4 bg-blue-500 h-[80%]"></div>
                        </div>
                    </section>
                </div>

            </main>
        </div>
    )
}

function getTypeColor(type: string) {
    if (type.includes('observation')) return 'text-slate-600';
    if (type.includes('hypothesis')) return 'text-blue-400';
    if (type.includes('proposal')) return 'text-purple-400';
    if (type.includes('eval') || type.includes('result')) return 'text-emerald-400';
    if (type.includes('error')) return 'text-red-500';
    return 'text-slate-500';
}

function renderPayload(evt: Event) {
    if (evt.type === 'user_observation') return `USER LOG: ${evt.payload.text}`; // EXPLICIT HANDLER
    if (evt.type === 'observation_event') return `${evt.payload.signal} @ ${evt.payload.location}`;
    if (evt.type === 'hypothesis') return evt.payload.claim;
    if (evt.type === 'intervention_proposal') return `PROP: ${evt.payload.intervention}`;
    if (evt.type === 'eval_result') return `SCORE: ${evt.payload.metrics.score}`;
    if (evt.type === 'domain_configured') return `CONTEXT: ${evt.payload.domain}`;
    if (evt.type === 'artifact_uploaded') return `ARTIFACT: ${evt.payload.filename} (${(evt.payload.size / 1024).toFixed(1)}KB)`;
    return JSON.stringify(evt.payload).slice(0, 60);
}

export default App
