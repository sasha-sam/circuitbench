import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface Step {
    target: string; // ID of element to highlight (although we'll just use fixed positions for simplicity in this prototype or relative descriptions)
    title: string;
    description: string;
    position: 'center' | 'left' | 'right' | 'bottom';
}

const STEPS: Step[] = [
    {
        target: 'intro',
        title: 'Welcome to Auto-Scientist',
        description: 'This is your research console. I am an autonomous agent designed to observe, reason, and help you improve your experiments. Let me show you around.',
        position: 'center'
    },
    {
        target: 'reasoning',
        title: 'Active Reasoning State',
        description: 'This center panel is my "Brain". Here, I will display my current hypothesis about your work, along with the confidence interval and supporting evidence.',
        position: 'center'
    },
    {
        target: 'telemetry',
        title: 'Event Telemetry',
        description: 'This terminal logs every action I take, every observation I make, and every decision in real-time. Watch this stream to understand my thought process.',
        position: 'center'
    },
    {
        target: 'artifacts',
        title: 'Artifact Repository',
        description: 'Upload your code files, logs, or research papers here (Left Panel). I will use them as context to better understand your specific domain constraints.',
        position: 'left'
    },
    {
        target: 'controls',
        title: 'Simulation & Controls',
        description: 'Use the "Run Simulation Protocol" button (Top Right) to test my reasoning capabilities by injecting a simulated failure. In a real deployment, I would observe your actual work passively.',
        position: 'right'
    }
];

export function WorkspaceGuide({ onClose }: { onClose: () => void }) {
    const [stepIndex, setStepIndex] = useState(0);
    const step = STEPS[stepIndex];

    const handleNext = () => {
        if (stepIndex < STEPS.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            onClose();
        }
    };

    const handleBack = () => {
        if (stepIndex > 0) setStepIndex(stepIndex - 1);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
                key={stepIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#111111] border border-blue-500/50 p-8 rounded-xl max-w-lg w-full shadow-2xl relative"
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-white">
                    <X size={16} />
                </button>

                <div className="mb-6">
                    <span className="text-[10px] uppercase tracking-widest text-blue-400 mb-2 block">
                        System Tour // Step {stepIndex + 1} of {STEPS.length}
                    </span>
                    <h3 className="text-2xl text-white font-light mb-4">{step.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">
                        {step.description}
                    </p>
                </div>

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800">
                    <button
                        onClick={handleBack}
                        disabled={stepIndex === 0}
                        className={`flex items-center gap-2 text-xs uppercase tracking-widest ${stepIndex === 0 ? 'text-slate-700' : 'text-slate-400 hover:text-white'}`}
                    >
                        <ChevronLeft size={14} /> Back
                    </button>

                    <div className="flex gap-1">
                        {STEPS.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === stepIndex ? 'bg-blue-500' : 'bg-slate-800'}`} />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 text-xs uppercase tracking-widest text-blue-400 hover:text-blue-300 font-bold bg-blue-900/20 px-4 py-2 rounded -mr-2"
                    >
                        {stepIndex === STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={14} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
