import React from 'react';
import { Brain, Database, Activity, Eye, Code, FileText, Globe } from 'lucide-react';

interface ActiveAgentsProps {
    domain: string;
}

const AGENTS = [
    { id: 'meta', name: 'Meta-Scientist', icon: Brain, domains: ['all'], role: 'Orchestrator' },
    { id: 'obs', name: 'Observation', icon: Activity, domains: ['all'], role: 'Signal Capture' },
    { id: 'cv', name: 'Computer Vision', icon: Eye, domains: ['Hardware', 'Biology', 'Chemistry'], role: 'Visual Analysis' },
    { id: 'code', name: 'Code Analyst', icon: Code, domains: ['Software', 'Theoretical'], role: 'Static Analysis' },
    { id: 'research', name: 'Prior Art', icon: Globe, domains: ['all'], role: 'Literature' },
    { id: 'store', name: 'Artifact Store', icon: Database, domains: ['all'], role: 'Context' }
];

export function ActiveAgentsPanel({ domain }: ActiveAgentsProps) {
    return (
        <div className="bg-[#111111] border border-slate-800 p-4">
            <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={14} /> Active Agent Swarm
            </h3>

            <div className="grid grid-cols-2 gap-2">
                {AGENTS.map(agent => {
                    const isActive = agent.domains.includes('all') || agent.domains.some(d => domain.includes(d));
                    return (
                        <div
                            key={agent.id}
                            className={`p-2 border rounded flex items-center gap-2 transition-all ${isActive
                                    ? 'border-slate-700 bg-slate-900/50 opacity-100'
                                    : 'border-slate-800/50 bg-[#0f0f0f] opacity-30 grayscale'
                                }`}
                        >
                            <agent.icon size={14} className={isActive ? 'text-blue-400' : 'text-slate-600'} />
                            <div>
                                <div className={`text-[10px] font-bold ${isActive ? 'text-slate-200' : 'text-slate-600'}`}>{agent.name}</div>
                                <div className="text-[9px] text-slate-500 leading-none">{agent.role}</div>
                            </div>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>}
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
