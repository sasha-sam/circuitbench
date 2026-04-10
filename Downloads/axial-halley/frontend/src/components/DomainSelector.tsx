import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Cpu, FlaskConical, Dna } from 'lucide-react';

interface DomainSelectorProps {
    onSelect: (domain: string) => void;
}

const domains = [
    { id: 'Software', icon: Code2, color: 'text-blue-400', border: 'border-blue-500/50', bg: 'hover:bg-blue-900/40', desc: 'Codebases & Algorithms' },
    { id: 'Hardware', icon: Cpu, color: 'text-orange-400', border: 'border-orange-500/50', bg: 'hover:bg-orange-900/40', desc: 'Circuits & Sensors' },
    { id: 'Biology', icon: Dna, color: 'text-green-400', border: 'border-green-500/50', bg: 'hover:bg-green-900/40', desc: 'Organic Systems' },
    { id: 'Chemistry', icon: FlaskConical, color: 'text-pink-400', border: 'border-pink-500/50', bg: 'hover:bg-pink-900/40', desc: 'reactions & Compounds' },
];

export function DomainSelector({ onSelect }: DomainSelectorProps) {
    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-8">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400 mb-4"
                    >
                        Initialize Context
                    </motion.h1>
                    <p className="text-slate-400 text-lg">Select the experimental domain for the Auto-Scientist.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {domains.map((d, i) => (
                        <motion.button
                            key={d.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => onSelect(d.id)}
                            className={`group p-8 rounded-2xl border ${d.border} bg-slate-800/80 ${d.bg} transition-all duration-300 flex flex-col items-center gap-4 text-left hover:scale-[1.02] hover:shadow-2xl`}
                        >
                            <d.icon size={48} className={`${d.color}`} />
                            <div>
                                <h3 className={`text-2xl font-semibold ${d.color} mb-2`}>{d.id}</h3>
                                <p className="text-slate-400">{d.desc}</p>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}
