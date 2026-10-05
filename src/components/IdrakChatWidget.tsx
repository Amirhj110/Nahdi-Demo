import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Bot, 
  User, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  ShieldCheck,
  HeartHandshake
} from 'lucide-react';
import { ChatMessage } from '../types';
import { 
  getOrCreateSessionId, 
  resetSessionId, 
  sendQuestionToIdrak,
  AGENT_ID 
} from '../services/idrakService';

interface IdrakChatWidgetProps {
  isOpen: boolean;
  onToggle: (open?: boolean) => void;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

const PRESET_SUGGESTIONS = [
  "Recommend a skincare routine for dry skin",
  "What are your shipping fees in KSA?",
  "What is your return policy for unopened cosmetics?",
  "What is your pricing?"
];

export const IdrakChatWidget: React.FC<IdrakChatWidgetProps> = ({
  isOpen,
  onToggle,
  initialQuery,
  onClearInitialQuery
}) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [copiedSession, setCopiedSession] = useState<boolean>(false);
  const [inputVal, setInputVal] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session & welcome message
  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);

    setMessages([
      {
        id: 'welcome-1',
        sender: 'ai',
        text: 'Marhaban! I am your **Nahdi Beauty AI Advisor**, powered by Idrak RAG. I can help recommend personalized skincare routines, check cosmetic ingredient safety, explain delivery in KSA, or answer questions about our luxury brands. How can I pamper your skin today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, []);

  // Handle external query triggers (e.g. from Product Card "Ask AI About This Product")
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      onToggle(true);
      handleSendMessage(initialQuery.trim());
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 180);
    }
  }, [isOpen]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopySession = () => {
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopiedSession(true);
      showToast('Session ID copied to clipboard');
      setTimeout(() => setCopiedSession(false), 2000);
    });
  };

  const handleClearChat = () => {
    const newSid = resetSessionId();
    setSessionId(newSid);
    setMessages([
      {
        id: 'welcome-reset-' + Date.now(),
        sender: 'ai',
        text: '✨ **New consultation started.** Session ID refreshed. Ask me anything about skincare routines, makeup formulations, or Nahdi Beauty services!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    showToast('Conversation cleared & session refreshed');
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputVal.trim();
    if (!textToSend || isLoading) return;

    if (!queryText) setInputVal('');

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const responseAnswer = await sendQuestionToIdrak(textToSend, sessionId);
      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: responseAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Idrak AI API Error:', err);
      const errorMsg: ChatMessage = {
        id: 'ai-err-' + Date.now(),
        sender: 'ai',
        text: "I am having temporary trouble connecting to the Nahdi Beauty knowledge base. Please try asking again in a moment, or reach our Beauty Concierge at 800 119 1199.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper formatter for markdown-like formatting (bolding and bullet points)
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, i) => {
      // Bold match
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      // Bullet detection
      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
          <div key={i} className="flex items-start gap-2 my-1 text-slate-700">
            <span className="text-[#E31837] font-bold text-sm leading-none">•</span>
            <span>{formattedParts}</span>
          </div>
        );
      }

      return (
        <p key={i} className={i > 0 && line.trim() === '' ? 'h-2' : 'my-0.5 leading-relaxed text-slate-700'}>
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Toast alert inside widget */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0D2040] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xl border border-white/10 animate-fade-in flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= FLOATING LAUNCHER (BOTTOM RIGHT) ================= */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* Launcher Pill Badge */}
        {!isOpen && (
          <div 
            onClick={() => onToggle(true)}
            className="cursor-pointer bg-white/95 backdrop-blur-md text-[#0D2040] text-xs font-bold px-3.5 py-2 rounded-2xl shadow-xl border border-slate-200/90 flex items-center gap-2 hover:shadow-2xl hover:border-rose-300 transition-all duration-300 group hover:-translate-y-0.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E31837] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E31837]"></span>
            </span>
            <span className="tracking-tight group-hover:text-[#E31837] transition-colors">
              Ask Nahdi AI Assistant
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:rotate-12 transition-transform" />
          </div>
        )}

        {/* Round Gradient Action Button */}
        <button
          onClick={() => onToggle(!isOpen)}
          aria-label="Toggle Nahdi Beauty AI Chat"
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#0D2040] via-[#1A365D] to-[#E31837] text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 glow-launcher group focus:outline-none cursor-pointer"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
          ) : (
            <div className="relative">
              <Bot className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
              <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
          )}
          {/* Status Dot */}
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </button>
      </div>

      {/* ================= CHAT WINDOW DRAWER / MODAL ================= */}
      {isOpen && (
        <div 
          className={`fixed z-50 bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-300 ease-out ${
            isExpanded 
              ? 'bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:w-[500px] h-[720px] max-h-[92vh]' 
              : 'bottom-24 right-4 sm:right-6 w-[95vw] sm:w-[420px] h-[600px] max-h-[82vh]'
          }`}
        >
          {/* 1. Header: Modern glassmorphism dark/navy header (#0D2040) */}
          <div className="bg-[#0D2040] p-4 text-white flex items-center justify-between shrink-0 shadow-md border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E31837] to-rose-400 flex items-center justify-center text-white shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                {/* Glowing green status dot */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0D2040] rounded-full animate-pulse"></span>
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white tracking-tight">Nahdi Beauty AI</h3>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Online
                  </span>
                </div>
                
                {/* Session ID display with copy */}
                <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                  <span className="text-slate-400">Session:</span>
                  <button 
                    onClick={handleCopySession}
                    title="Click to copy Session ID"
                    className="font-mono text-[10px] bg-white/10 hover:bg-white/20 text-sky-200 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{sessionId ? `${sessionId.slice(0, 11)}...` : 'Connecting...'}</span>
                    {copiedSession ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Header controls: Clear chat, expand, minimize */}
            <div className="flex items-center gap-1 text-slate-300">
              <button
                onClick={handleClearChat}
                title="Clear Conversation"
                className="w-8 h-8 rounded-xl hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors text-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse View" : "Expand View"}
                className="hidden sm:flex w-8 h-8 rounded-xl hover:bg-white/10 hover:text-white items-center justify-center transition-colors text-xs cursor-pointer"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => onToggle(false)}
                title="Minimize Chat"
                className="w-8 h-8 rounded-xl hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors text-xs cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subheader info strip: Verified RAG Knowledge */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-1.5 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E31837]" />
              <span className="font-medium text-slate-600">Dermatologist-Trained • Nahdi Catalog</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Agent: {AGENT_ID.slice(0, 12)}...</span>
          </div>

          {/* 2. Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAFBFD] text-xs">
            {/* Quick Suggestion Chips (Pills) */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E31837]" />
                  Quick Beauty Suggestions
                </span>
                <span className="text-[10px] text-slate-400">Click to ask instantly</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(suggestion)}
                    disabled={isLoading}
                    className="text-left bg-slate-50 hover:bg-rose-50/60 hover:border-rose-200 border border-slate-200 text-slate-700 hover:text-[#0D2040] px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group disabled:opacity-50 cursor-pointer"
                  >
                    <span>{suggestion}</span>
                    <Sparkles className="w-3 h-3 text-slate-300 group-hover:text-[#E31837] group-hover:scale-110 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* AI Avatar */}
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0D2040] to-[#E31837] text-white flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-xs">
                    AI
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] space-y-1 ${
                    msg.sender === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-[#0D2040] text-white rounded-tr-xs font-normal'
                        : msg.isError
                        ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-tl-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                    }`}
                  >
                    {renderFormattedText(msg.text)}
                  </div>
                  <div className="text-[10px] text-slate-400 px-1">
                    {msg.timestamp}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-700 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-200" />
                  </div>
                )}
              </div>
            ))}

            {/* Real-time typing / loading dots indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0D2040] to-[#E31837] text-white flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-xs">
                  AI
                </div>
                <div className="bg-white border border-slate-200/90 p-3 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E31837] typing-dot-1"></span>
                    <span className="w-2 h-2 rounded-full bg-[#0D2040] typing-dot-2"></span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 typing-dot-3"></span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Nahdi Beauty AI is formulating your advice...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 3. Input Area: Smooth input bar with send button */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask about skincare, ingredients, or routine..."
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D2040] focus:border-transparent transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isLoading}
                aria-label="Send message"
                className="w-10 h-10 rounded-xl bg-[#0D2040] hover:bg-[#E31837] disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-all duration-200 shrink-0 cursor-pointer shadow-sm disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[9px]">Enter</kbd> to send</span>
              <span className="text-[#E31837] font-semibold">100% Authentic Beauty Knowledge</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
