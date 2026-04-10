import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, CornerDownLeft, Terminal } from 'lucide-react';

interface Message {
    id: string;
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ExperimentInterviewProps {
    onComplete: (context: any) => void;
}

const INITIAL_MESSAGES: Message[] = [
    {
        id: '1',
        role: 'system',
        content: 'INITIALIZING INTERVIEW PROTOCOL...'
    },
    {
        id: '2',
        role: 'assistant',
        content: 'Greetings, Colleague. I am your autonomous partner. To begin, please describe the primary objective of your experiment today.'
    }
];

export function ExperimentInterview({ onComplete }: ExperimentInterviewProps) {
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Internal state to track interview progress (rule-based mock for now)
    const [stage, setStage] = useState<'goal' | 'domain' | 'constraints' | 'complete'>('goal');
    const [contextData, setContextData] = useState({
        goal: '',
        domain: '',
        constraints: [] as string[]
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        addMessage('user', userMsg);
        setIsTyping(true);

        // Simulate AI thinking & Processing
        setTimeout(() => {
            processResponse(userMsg);
            setIsTyping(false);
        }, 1200);
    };

    const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role, content }]);
    };

    const processResponse = (userText: string) => {
        const text = userText.toLowerCase();
        let nextStage = stage;
        let reply = '';
        let detectedDomain = contextData.domain;

        if (stage === 'goal') {
            // Heuristic extraction
            setContextData(prev => ({ ...prev, goal: userText }));

            if (text.includes('code') || text.includes('software') || text.includes('app') || text.includes('debug')) {
                detectedDomain = 'Software';
            } else if (text.includes('circuit') || text.includes('hardware') || text.includes('breadboard') || text.includes('voltage')) {
                detectedDomain = 'Hardware';
            } else if (text.includes('cell') || text.includes('bio') || text.includes('culture') || text.includes('protein')) {
                detectedDomain = 'Biology';
            } else {
                detectedDomain = 'Research'; // Default
            }
            setContextData(prev => ({ ...prev, domain: detectedDomain }));

            reply = `Understood. We are operating in the ${detectedDomain} domain. Are there any specific constraints or tools I should be aware of? (e.g., "React only", "5V max", "Sterile environment")`;
            nextStage = 'constraints';
        } else if (stage === 'constraints') {
            setContextData(prev => ({ ...prev, constraints: [userText] }));
            reply = "Acknowledged. Context gathering complete. Initializing main console with these parameters.";
            nextStage = 'complete';

            // Finish after short delay
            setTimeout(() => {
                onComplete({
                    ...contextData,
                    constraints: [userText],
                    domain: detectedDomain
                });
            }, 2000);
        }

        setStage(nextStage);
        addMessage('assistant', reply);
    };

    return (
        <div className="fixed inset-0 bg-[#0B0B0B] z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#111111] border border-slate-800 rounded-lg shadow-2xl flex flex-col h-[600px] overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 bg-[#161616] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <h2 className="text-sm font-mono text-slate-300 tracking-widest uppercase">
                            Experiment Configuration Protocol
                        </h2>
                    </div>
                    <span className="text-xs text-slate-600 font-mono">SESSION-ID: {Date.now().toString().slice(-6)}</span>
                </div>

                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 p-6 overflow-y-auto space-y-6 scroll-smooth custom-scrollbar"
                >
                    {messages.map((msg) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id}
                            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`mt-1 w-8 h-8 rounded flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-800 text-slate-300' :
                                msg.role === 'system' ? 'bg-transparent text-emerald-500' : 'bg-blue-900/20 text-blue-400 border border-blue-900/50'
                                }`}>
                                {msg.role === 'user' ? <User size={14} /> : msg.role === 'system' ? <Terminal size={14} /> : <Bot size={14} />}
                            </div>

                            <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`p-3 rounded-lg text-sm font-mono leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-slate-200' :
                                    msg.role === 'system' ? 'text-emerald-500 tracking-wider text-xs uppercase' : 'text-slate-300 bg-[#161616] border border-slate-800/50'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                            <div className="w-8 h-8 rounded bg-blue-900/20 text-blue-400 border border-blue-900/50 flex items-center justify-center shrink-0">
                                <Bot size={14} />
                            </div>
                            <div className="h-10 flex items-center gap-1 pl-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-800 bg-[#161616]">
                    <form onSubmit={handleSend} className="relative flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Describe your experiment goal..."
                            autoFocus
                            className="flex-1 bg-[#0f0f0f] border border-slate-700 rounded p-3 pr-12 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-2 p-1.5 text-slate-500 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                        >
                            <CornerDownLeft size={16} />
                        </button>
                    </form>
                    <div className="mt-2 text-[10px] text-slate-600 font-mono flex justify-between">
                        <span>AI-ASSISTANT v3.1 // LISTENING</span>
                        <span>ENTER to send</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
