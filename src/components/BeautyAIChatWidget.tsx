import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  RotateCcw, 
  Copy, 
  Check, 
  Bot, 
  User, 
  MessageSquare,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  Radio,
  ShieldCheck,
  Headphones
} from 'lucide-react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from 'livekit-client';
import { ChatMessage } from '../types';
import { 
  getOrCreateTextSessionId, 
  resetTextSessionId, 
  sendTextQuestion,
  createVoiceSession
} from '../services/agentService';

interface BeautyAIChatWidgetProps {
  isOpen: boolean;
  onToggle: (open?: boolean) => void;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

type ChatTab = 'text' | 'voice';
type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'error';

export const BeautyAIChatWidget: React.FC<BeautyAIChatWidgetProps> = ({
  isOpen,
  onToggle,
  initialQuery,
  onClearInitialQuery
}) => {
  const [activeTab, setActiveTab] = useState<ChatTab>('text');
  const [sessionId, setSessionId] = useState<string>('');
  const [copiedSession, setCopiedSession] = useState<boolean>(false);
  const [inputVal, setInputVal] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Voice State
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [agentSpeaking, setAgentSpeaking] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);

  // Initialize session
  useEffect(() => {
    const sid = getOrCreateTextSessionId();
    setSessionId(sid);
  }, []);

  // Handle external query trigger (e.g., from product card "Ask AI About This Product")
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      onToggle(true);
      setActiveTab('text');
      handleSendMessage(initialQuery.trim());
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  // Focus input when opened on text tab
  useEffect(() => {
    if (isOpen && activeTab === 'text') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, activeTab]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean up voice room on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

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

  // REFRESH CONVERSATION / SESSION (using refresh icon)
  const handleRefreshChat = () => {
    const newSid = resetTextSessionId();
    setSessionId(newSid);
    setMessages([]);
    showToast('Conversation refreshed & new session started');
  };

  // TEXT CONTRACT EXECUTION
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
      const responseAnswer = await sendTextQuestion(textToSend, sessionId);
      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: responseAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Agent API Error:', err);
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

  // VOICE CONTRACT & LIVEKIT INTEGRATION
  const handleStartVoice = async () => {
    setVoiceStatus('connecting');
    setVoiceError(null);

    try {
      // 1. Get LiveKit credentials from voice session endpoint
      const sessionData = await createVoiceSession("en");
      const { url, token } = sessionData.voice;

      if (!url || !token) {
        throw new Error("Invalid voice session credentials returned by server");
      }

      // 2. Instantiate LiveKit Room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // Handle remote audio subscription (the AI agent speaking)
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          if (audioContainerRef.current) {
            audioContainerRef.current.innerHTML = '';
            audioContainerRef.current.appendChild(audioElement);
          }
          audioElement.play().catch((e) => console.warn("Audio autoplay blocked:", e));
        }
      });

      // Track speaking states
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const hasAgent = speakers.some((s) => s.identity !== room.localParticipant.identity);
        setAgentSpeaking(hasAgent);
      });

      room.on(RoomEvent.Disconnected, () => {
        setVoiceStatus('idle');
        setAgentSpeaking(false);
      });

      // 3. Connect to LiveKit server
      await room.connect(url, token);

      // 4. Enable user microphone
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsMuted(false);
      } catch (micErr) {
        console.warn("Could not auto-enable mic:", micErr);
      }

      setVoiceStatus('connected');
      showToast('Voice session connected! You can speak now.');

    } catch (err: any) {
      console.error("Voice connection error:", err);
      setVoiceStatus('error');
      setVoiceError(err.message || "Failed to establish voice session");
    }
  };

  const handleEndVoice = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setVoiceStatus('idle');
    setAgentSpeaking(false);
  };

  const handleToggleMute = async () => {
    if (!roomRef.current) return;
    const nextMute = !isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!nextMute);
    setIsMuted(nextMute);
  };

  // Helper formatter for text: ALL TEXT FULL WHITE
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
          <div key={i} className="flex items-start gap-2 my-1 text-white">
            <span className="text-[#E31837] font-bold text-sm leading-none">•</span>
            <span className="text-white font-normal">{formattedParts}</span>
          </div>
        );
      }

      return (
        <p key={i} className={i > 0 && line.trim() === '' ? 'h-2' : 'my-0.5 leading-relaxed text-white font-normal'}>
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0D2040] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-2xl border border-white/15 animate-fade-in flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden audio element container for remote voice playback */}
      <div ref={audioContainerRef} className="hidden" />

      {/* ================= FLOATING ACTION BUTTON (BOTTOM RIGHT) ================= */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {!isOpen && (
          <div 
            onClick={() => onToggle(true)}
            className="cursor-pointer bg-[#0D2040] text-white text-xs font-bold px-3.5 py-2 rounded-2xl shadow-xl border border-white/15 flex items-center gap-2 hover:shadow-2xl hover:border-[#E31837] transition-all duration-300 group hover:-translate-y-0.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E31837] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E31837]"></span>
            </span>
            <span className="tracking-tight text-white group-hover:text-rose-200 transition-colors">
              Ask Nahdi AI Assistant
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
          </div>
        )}

        <button
          onClick={() => onToggle(!isOpen)}
          aria-label="Toggle Nahdi Beauty AI Assistant"
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#0D2040] via-[#1A365D] to-[#E31837] text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 glow-launcher group focus:outline-none cursor-pointer"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200 text-white" />
          ) : (
            <div className="relative">
              <Bot className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
              <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
          )}
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </button>
      </div>

      {/* ================= CHAT WINDOW MODAL (HYBRID TEXT & VOICE) ================= */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[600px] max-h-[82vh] bg-[#0A1628] text-white rounded-3xl shadow-2xl border border-white/15 flex flex-col overflow-hidden transition-all duration-300 ease-out"
        >
          {/* Header */}
          <div className="bg-[#0D2040] p-4 text-white flex items-center justify-between shrink-0 border-b border-white/10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E31837] to-rose-400 flex items-center justify-center text-white shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
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

            {/* Header controls: REFRESH CONVERSATION ICON (RotateCcw) instead of delete, and minimize */}
            <div className="flex items-center gap-1 text-slate-300">
              <button
                onClick={handleRefreshChat}
                title="Refresh Conversation & Session"
                className="w-8 h-8 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer group"
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              </button>

              <button
                onClick={() => onToggle(false)}
                title="Minimize"
                className="w-8 h-8 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ================= 2-TAB SWITCHER (TEXT & VOICE) ================= */}
          <div className="bg-[#0D2040]/70 border-b border-white/10 px-3 py-2 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-white text-[#0D2040] shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Text Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                activeTab === 'voice'
                  ? 'bg-gradient-to-r from-[#E31837] to-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Radio className="w-4 h-4 animate-pulse text-amber-300" />
              <span>Live Voice</span>
              {voiceStatus === 'connected' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-2"></span>
              )}
            </button>
          </div>

          {/* ================= TAB 1: TEXT CHAT ================= */}
          {activeTab === 'text' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#0A1628]">
              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                
                {/* Clean State: If no messages, render a minimal clean invitation (NO hardcoded suggestions chips) */}
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-300 space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E31837]">
                      <Sparkles className="w-6 h-6 text-amber-300" />
                    </div>
                    <div className="text-white font-bold text-sm">
                      Nahdi Beauty AI Assistant
                    </div>
                    <p className="text-white/80 text-xs max-w-xs leading-relaxed font-normal">
                      Ask about our luxury skincare products, ingredients, delivery fees, or promotions in Saudi Arabia.
                    </p>
                  </div>
                )}

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
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0D2040] to-[#E31837] text-white flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">
                        AI
                      </div>
                    )}

                    {/* Message Bubble: FULL WHITE TEXT */}
                    <div
                      className={`max-w-[85%] space-y-1 ${
                        msg.sender === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm text-white ${
                          msg.sender === 'user'
                            ? 'bg-[#1A365D] rounded-tr-xs border border-sky-400/20 text-white font-normal'
                            : msg.isError
                            ? 'bg-rose-950/80 text-rose-100 border border-rose-600 rounded-tl-xs'
                            : 'bg-[#122238] border border-white/15 text-white rounded-tl-xs'
                        }`}
                      >
                        {renderFormattedText(msg.text)}
                      </div>
                      <div className="text-[10px] text-white/50 px-1">
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

                {/* Real-time typing / loading indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2.5 justify-start">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0D2040] to-[#E31837] text-white flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 shadow-sm">
                      AI
                    </div>
                    <div className="bg-[#122238] border border-white/15 p-3 rounded-2xl rounded-tl-xs shadow-sm flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#E31837] typing-dot-1"></span>
                        <span className="w-2 h-2 rounded-full bg-sky-400 typing-dot-2"></span>
                        <span className="w-2 h-2 rounded-full bg-amber-400 typing-dot-3"></span>
                      </div>
                      <span className="text-[11px] text-white font-medium">Nahdi Beauty AI is formulating your response...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Text Input Area */}
              <div className="p-3 bg-[#0D2040] border-t border-white/10 shrink-0">
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
                    placeholder="Type your question..."
                    disabled={isLoading}
                    className="flex-1 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!inputVal.trim() || isLoading}
                    aria-label="Send message"
                    className="w-10 h-10 rounded-xl bg-[#E31837] hover:bg-[#D71921] disabled:bg-white/10 text-white disabled:text-slate-500 flex items-center justify-center transition-all duration-200 shrink-0 cursor-pointer shadow-sm disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/60 px-1">
                  <span>Press <kbd className="px-1 py-0.5 bg-white/10 border border-white/20 rounded font-mono text-[9px] text-white">Enter</kbd> to send</span>
                  <span className="text-[#E31837] font-semibold">24/7 Verified Beauty Assistance</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: LIVE VOICE AGENT ================= */}
          {activeTab === 'voice' && (
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#0A1628] to-[#0D2040] text-center">
              
              {/* Top Status */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-rose-200 border border-white/15">
                  <Headphones className="w-3.5 h-3.5 text-[#E31837]" />
                  <span>Real-time Voice Conversation</span>
                </div>
                <h4 className="text-lg font-bold text-white mt-2">
                  Talk to Nahdi Beauty AI
                </h4>
                <p className="text-xs text-white/80 max-w-xs mx-auto">
                  Powered by LiveKit low-latency voice streaming. Ask about product safety, skincare steps, or discounts.
                </p>
              </div>

              {/* Pulsing Visualizer Orb */}
              <div className="relative my-8 flex items-center justify-center">
                {/* Outer concentric pulsing rings when active */}
                {voiceStatus === 'connected' && (
                  <>
                    <div className={`absolute w-44 h-44 rounded-full border border-rose-500/30 ${agentSpeaking ? 'animate-ping' : ''}`}></div>
                    <div className="absolute w-36 h-36 rounded-full bg-[#E31837]/20 blur-md"></div>
                  </>
                )}

                {/* Central Orb */}
                <div 
                  className={`w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 border-2 ${
                    voiceStatus === 'connected'
                      ? agentSpeaking 
                        ? 'bg-gradient-to-tr from-[#E31837] to-amber-500 border-amber-300 scale-110' 
                        : 'bg-gradient-to-tr from-[#1A365D] to-[#E31837] border-rose-400'
                      : voiceStatus === 'connecting'
                      ? 'bg-slate-800 border-slate-600 animate-pulse'
                      : 'bg-white/5 border-white/20'
                  }`}
                >
                  {voiceStatus === 'connected' ? (
                    agentSpeaking ? (
                      <Volume2 className="w-10 h-10 text-white animate-bounce" />
                    ) : (
                      <Mic className="w-10 h-10 text-white" />
                    )
                  ) : voiceStatus === 'connecting' ? (
                    <Radio className="w-8 h-8 text-amber-300 animate-spin" />
                  ) : (
                    <Mic className="w-10 h-10 text-white/60" />
                  )}
                </div>
              </div>

              {/* Live Status text */}
              <div className="min-h-8">
                {voiceStatus === 'idle' && (
                  <span className="text-xs text-white/80">Press the button below to start voice call</span>
                )}
                {voiceStatus === 'connecting' && (
                  <span className="text-xs text-amber-300 font-semibold animate-pulse">
                    Connecting to voice agent...
                  </span>
                )}
                {voiceStatus === 'connected' && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      {agentSpeaking ? "Nahdi AI Speaking..." : isMuted ? "You are Muted" : "Listening to you..."}
                    </span>
                    <p className="text-[11px] text-white/70">Speak naturally in English or Arabic</p>
                  </div>
                )}
                {voiceStatus === 'error' && (
                  <div className="text-xs text-rose-400 max-w-xs mx-auto">
                    {voiceError || "Connection error. Please try again."}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="w-full pt-4 space-y-3">
                {voiceStatus === 'idle' || voiceStatus === 'error' ? (
                  <button
                    onClick={handleStartVoice}
                    className="w-full bg-[#E31837] hover:bg-[#D71921] text-white py-3.5 px-6 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-rose-900/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Start Voice Conversation</span>
                  </button>
                ) : voiceStatus === 'connecting' ? (
                  <button
                    disabled
                    className="w-full bg-slate-800 text-slate-400 py-3.5 px-6 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <span>Establishing Voice Connection...</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Mute/Unmute */}
                    <button
                      onClick={handleToggleMute}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        isMuted 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                          : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                    </button>

                    {/* End Call */}
                    <button
                      onClick={handleEndVoice}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>End Call</span>
                    </button>
                  </div>
                )}

                <div className="text-[10px] text-white/60">
                  Agent ID: agt-1791181897950-mxc20l • US Voice (Female)
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </>
  );
};
