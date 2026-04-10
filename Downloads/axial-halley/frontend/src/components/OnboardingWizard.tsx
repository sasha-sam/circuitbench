import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, SkipForward, FlaskConical, AlertCircle } from 'lucide-react';

interface Question {
    id: string;
    text: string;
    options: string[];
}

const QUESTIONS: Record<string, Question[]> = {
    global: [
        { id: 'exp_nature', text: 'What is the primary nature of your experiment?', options: ['Software / Computational', 'Theoretical / Mathematical', 'Hardware / Embedded', 'Biological', 'Chemical'] },
    ],
    Software: [
        { id: 'sw_task', text: 'What is the nature of the task?', options: ['Debugging', 'Refactoring', 'New Feature', 'Performance Optimization'] },
        { id: 'sw_stability', text: 'What is the current stability level?', options: ['Stable', 'Unstable / Crashing', 'Unknown Behavior', 'Legacy Code'] },
        { id: 'sw_lang', text: 'Primary language context?', options: ['Python', 'TypeScript/JS', 'Rust/C++', 'Other'] },
        { id: 'sw_debug', text: 'Typical debugging approach?', options: ['Log Analysis', 'Interactive Debugger', 'Unit Tests', 'Intuition'] }
    ],
    Hardware: [
        { id: 'hw_env', text: 'Is this a live system or simulation?', options: ['Live Hardware', 'Simulation', 'Hybrid'] },
        { id: 'hw_risk', text: 'Are there safety constraints?', options: ['High Voltage', 'Moving Parts', 'Thermal limits', 'None'] },
        { id: 'hw_noise', text: 'Is signal noise expected?', options: ['Yes, High Noise', 'Minimal Noise', 'Filtered'] },
        { id: 'hw_visual', text: 'Enable visual anomaly detection?', options: ['Yes', 'No'] }
    ],
    // Fallback for others
    Generic: [
        { id: 'g_goal', text: 'Is this exploratory or confirmatory?', options: ['Exploratory', 'Confirmatory'] },
        { id: 'g_risk', text: 'Critically of failure?', options: ['Data Loss', 'Safety Risk', 'Time Loss', 'Low'] },
        { id: 'g_prec', text: 'Precision requirement?', options: ['High', 'Standard', 'Low'] },
        { id: 'g_lit', text: 'Enforce literature checks?', options: ['Yes', 'No'] }
    ]
};

interface OnboardingProps {
    onComplete: (data: any) => void;
}

export function OnboardingWizard({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [domain, setDomain] = useState<string>('Generic');
    const [skippedCount, setSkippedCount] = useState(0);

    // Determine current question queue
    const globalQ = QUESTIONS.global[0];
    const domainQs = QUESTIONS[domain] || QUESTIONS.Generic;
    const allQs = [globalQ, ...domainQs];
    const currentQ = allQs[step];

    const handleAnswer = (answer: string) => {
        const newAnswers = { ...answers, [currentQ.id]: answer };
        setAnswers(newAnswers);

        // If first question, set domain
        if (step === 0) {
            let d = 'Generic';
            if (answer.includes('Software')) d = 'Software';
            if (answer.includes('Hardware')) d = 'Hardware';
            if (answer.includes('Biological')) d = 'Generic'; // Placeholder for Bio prompts
            if (answer.includes('Chemical')) d = 'Generic'; // Placeholder
            setDomain(d);
        }

        goNext();
    };

    const handleSkip = () => {
        setSkippedCount(prev => prev + 1);
        goNext();
    };

    const goNext = () => {
        if (step < allQs.length - 1) {
            setStep(step + 1);
        } else {
            // Finish
            const confidence = Math.max(0.1, 1.0 - (skippedCount * 0.2)).toFixed(2);
            onComplete({ answers, domain, confidence });
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0B0B0B] z-[100] flex flex-col items-center justify-center p-8 font-mono text-slate-300">
            <div className="w-full max-w-2xl">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 border-l-2 border-slate-700 pl-6"
                >
                    <h1 className="text-3xl font-light text-white mb-2">Hello, Scientist.</h1>
                    <p className="text-slate-500">How can I help you today? Let's get started by initializing the experiment context.</p>
                </motion.div>

                <div className="bg-[#111111] border border-slate-800 p-8 rounded-lg relative overflow-hidden">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full">
                        <div
                            className="h-full bg-blue-500/50 transition-all duration-500"
                            style={{ width: `${((step) / allQs.length) * 100}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-slate-600 mb-8 uppercase tracking-widest">
                        <span>Input Request: {currentQ.id}</span>
                        <span>Progress: {step} / {allQs.length}</span>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-xl text-white mb-8 leading-relaxed">
                                {currentQ.text}
                            </h2>

                            <div className="grid grid-cols-1 gap-3">
                                {currentQ.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleAnswer(opt)}
                                        className="text-left px-6 py-4 bg-[#161616] border border-slate-800 hover:border-blue-500/50 hover:bg-[#1a1a1a] transition-all text-sm flex justify-between group"
                                    >
                                        <span className="group-hover:text-blue-200 transition-colors">{opt}</span>
                                        <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 text-blue-500" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-8 pt-6 border-t border-slate-800/50 flex justify-end">
                        {step > 0 && ( /* First question mandatory */
                            <button
                                onClick={handleSkip}
                                className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-2 uppercase tracking-wider"
                            >
                                Skip <SkipForward size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-slate-700">
                    AUTO-SCIENTIST SYSTEM v3.0 // RESEARCH GRADE
                </div>
            </div>
        </div>
    );
}
