import React, { useState } from 'react';
import { Send, Upload, Paperclip } from 'lucide-react';
import axios from 'axios';

const API_URL = "http://localhost:8000";

export function ManualInput() {
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setSending(true);
        try {
            // Send manual log to backend
            await axios.post(`${API_URL}/event`, {
                type: 'user_observation',
                source: 'manual_input',
                payload: { text: input }
            });
            setInput('');
        } catch (err) {
            console.error("Failed to log observation", err);
        } finally {
            setSending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-auto border-t border-slate-800 pt-4">
            <div className="flex gap-2">
                <button type="button" className="p-2 border border-slate-700 bg-slate-800 text-slate-400 hover:text-white rounded hover:border-slate-500 transition-colors" title="Upload Artifact">
                    <Paperclip size={16} />
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Log manual observation or hypothesis..."
                    className="flex-1 bg-[#161616] border border-slate-700 rounded px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-600"
                />
                <button
                    type="submit"
                    disabled={sending}
                    className="px-4 bg-blue-900/30 border border-blue-800 text-blue-400 hover:text-blue-200 hover:bg-blue-900/50 rounded transition-all text-xs uppercase tracking-widest"
                >
                    {sending ? '...' : <Send size={14} />}
                </button>
            </div>
        </form>
    );
}
