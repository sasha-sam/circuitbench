import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Send, Bot, User, Paperclip } from 'lucide-react';
import axios from 'axios';

const API_URL = "http://localhost:8000";

interface Message {
    id: string;
    sender: 'user' | 'agent';
    text: string;
    citations?: Citation[];
}

interface Citation {
    id: string;
    title: string;
    snippet: string;
    source: string;
}

export function ResearchPanel() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    // Initial Greeting / Context Check
    useEffect(() => {
        // In a real app, we'd check if context is already set and load it.
        // For now, we wait for the user or the Interview completion event (handled in parent usually, 
        // but lets just generic greet).
        if (messages.length === 0) {
            setMessages([{
                id: 'init',
                sender: 'agent',
                text: "Research Agent Online. I have access to arXiv, USPTO, and internal repositories. Once you complete the interview and upload your protocol, I will generate a reading list.",
            }]);
        }
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setProcessing(true);

        try {
            // Chat Endpoint
            const res = await axios.post(`${API_URL}/research/chat`, { message: input });

            const agentMsg: Message = {
                id: Date.now().toString() + '_a',
                sender: 'agent',
                text: res.data.response,
                citations: res.data.citations
            };

            setMessages(prev => [...prev, agentMsg]);

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { id: 'err', sender: 'agent', text: "Error connecting to Knowledge Base." }]);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#111111] border border-slate-800 rounded-sm overflow-hidden">
            <div className="p-3 border-b border-slate-800 bg-[#161616] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-purple-400" />
                    <span className="text-xs font-mono text-slate-300 uppercase tracking-widest">Research Assistant (Gemini)</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={scrollRef}>
                {messages.map(msg => (
                    <div key={msg.id} className={`mb-4 flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`flex gap-3 max-w-[90%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-slate-700' : 'bg-purple-900/50'}`}>
                                {msg.sender === 'user' ? <User size={12} /> : <Bot size={12} className="text-purple-400" />}
                            </div>
                            <div className={`p-3 rounded text-xs leading-relaxed ${msg.sender === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-[#1a1a1a] text-slate-300 border border-slate-800'}`}>
                                {msg.text}
                            </div>
                        </div>
                        {/* Citations Block */}
                        {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-2 ml-9 max-w-[85%] space-y-2">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">References Found:</span>
                                {msg.citations.map(cit => (
                                    <div key={cit.id} className="bg-[#111] border border-slate-800 p-2 rounded hover:border-purple-500/30 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-purple-300">{cit.title}</span>
                                            <span className="text-[9px] text-slate-600 border border-slate-800 px-1">{cit.source}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-600 line-clamp-1">{cit.snippet}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {processing && (
                    <div className="ml-9 text-[10px] text-slate-500 animate-pulse font-mono">
                        Agently Analyzing...
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-[#161616]">
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <button type="button" className="text-slate-500 hover:text-slate-300 transition-colors">
                        <Paperclip size={14} />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about papers, methods, or prior art..."
                        className="flex-1 bg-[#0f0f0f] border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <button
                        type="submit"
                        disabled={processing}
                        className="text-purple-500 hover:text-purple-400 disabled:opacity-50"
                    >
                        <Send size={14} />
                    </button>
                </form>
            </div>
        </div>
    );
}
