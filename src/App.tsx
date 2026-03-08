/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Settings, 
  Zap, 
  Shield, 
  Wallet, 
  X, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Trophy,
  Lock,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Activity,
  Cpu,
  Globe,
  Menu,
  ChevronRight,
  Volume2,
  Image as ImageIcon,
  Video,
  Search,
  Brain,
  Sparkles,
  History,
  UserCircle,
  LogOut,
  CreditCard,
  Crown,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Play,
  Pause,
  Mic
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import Markdown from 'react-markdown';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { User, Message, Challenge } from './types';

const PERSONAS = {
  helpful: "You are a helpful and polite AI assistant.",
  leader: "You are a visionary leader, inspiring and brave like a historical hero. Speak with authority and courage.",
  journalist: "You are an investigative journalist. Ask sharp questions and provide deep, factual analysis.",
  creative: "You are a creative genius. Think outside the box and use poetic, imaginative language.",
  technical: "You are a senior software architect. Be precise, logical, and provide deep technical insights."
};

const getSystemInstruction = (persona: string, memory: any[]) => {
  const memoryContext = memory.length > 0 
    ? `\nUser Context (Memory): ${memory.map(m => m.content).join('; ')}`
    : '';
  
  return `You are WAQIBYX AI System, a powerful and highly intelligent AI assistant.
Persona: ${PERSONAS[persona as keyof typeof PERSONAS] || PERSONAS.helpful}
Communication Style: Support both English and Roman Urdu. Be insightful and natural.
${memoryContext}
If the user asks who you are, identify as WAQIBYX AI System.`;
};

// Mock data for charts
const activityData = [
  { name: 'Mon', value: 400 },
  { name: 'Tue', value: 300 },
  { name: 'Wed', value: 600 },
  { name: 'Thu', value: 800 },
  { name: 'Fri', value: 500 },
  { name: 'Sat', value: 900 },
  { name: 'Sun', value: 700 },
];

const usageData = [
  { name: 'Chat', value: 400 },
  { name: 'Logic', value: 300 },
  { name: 'Code', value: 300 },
  { name: 'Creative', value: 200 },
];

const COLORS = ['#00f3ff', '#bc13fe', '#ff00ff', '#00d2ff'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'profile' | 'admin'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [challengeInput, setChallengeInput] = useState('');
  const [challengeSuccess, setChallengeSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState<'image' | 'video' | 'audio' | null>(null);
  const [searchEnabled, setSearchEnabled] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const fetchUser = async (userId: string) => {
    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    setUser(data);
  };

  useEffect(() => {
    const userId = localStorage.getItem('waqibyx_user_id') || Math.random().toString(36).substring(7);
    localStorage.setItem('waqibyx_user_id', userId);
    fetchUser(userId);
  }, []);

  const handleSendMessage = async (customInput?: string, mediaType?: 'image' | 'video') => {
    const textInput = customInput || input;
    if (!textInput.trim() || !user || isLoading) return;

    const isUnlimited = user.unlimited_until > Date.now() || user.subscription_tier !== 'free';
    if (!isUnlimited && user.message_count >= 10) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: "Aapka free message limit khatam ho gaya hai. Please subscribe karein ya challenges complete karke free time earn karein.",
        timestamp: Date.now()
      }]);
      return;
    }

    const userMessage: Message = { role: 'user', content: textInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    if (!customInput) setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      if (mediaType === 'image') {
        setIsGeneratingMedia('image');
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{ parts: [{ text: textInput }] }]
        });
        
        let imageUrl = '';
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        }

        setMessages(prev => [...prev, {
          role: 'model',
          content: response.text || "Image generated successfully.",
          image: imageUrl,
          timestamp: Date.now()
        }]);
      } else if (mediaType === 'video') {
        setIsGeneratingMedia('video');
        let operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: textInput,
          config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });

        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          operation = await ai.operations.getVideosOperation({ operation });
        }

        const videoUrl = operation.response?.generatedVideos?.[0]?.video?.uri;
        setMessages(prev => [...prev, {
          role: 'model',
          content: "Video generation complete.",
          video: videoUrl,
          timestamp: Date.now()
        }]);
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: messages.concat(userMessage).map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
          })),
          config: { 
            systemInstruction: getSystemInstruction(user.persona, user.memory),
            tools: searchEnabled ? [{ googleSearch: {} }] : []
          }
        });

        const modelMessage: Message = {
          role: 'model',
          content: response.text || "Sorry, I couldn't process that.",
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, modelMessage]);

        // Save to memory if important
        if (textInput.toLowerCase().includes('i like') || textInput.toLowerCase().includes('my name is')) {
          await fetch('/api/user/memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, content: textInput })
          });
        }
      }

      const res = await fetch('/api/user/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const updatedUser = await res.json();
      setUser(prev => ({ ...prev, ...updatedUser }));

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: "Error connecting to AI. Please check your connection.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
      setIsGeneratingMedia(null);
    }
  };

  const handleTTS = async (text: string) => {
    if (isGeneratingMedia) return;
    setIsGeneratingMedia('audio');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say cheerfully in a professional voice: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.play();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingMedia(null);
    }
  };

  const updateSettings = async (updates: any) => {
    const res = await fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, ...updates })
    });
    const data = await res.json();
    setUser(prev => ({ ...prev, ...data }));
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
        setActiveTab('admin');
      } else {
        alert('Incorrect Password');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateAdminCode = async () => {
    try {
      const res = await fetch('/api/admin/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setAdminCode(data.code);
      } else {
        const data = await res.json();
        alert(data.error || 'Incorrect Password');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRedeemCode = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, code: redeemCode })
      });
      if (res.ok) {
        const data = await res.json();
        setUser({ ...user, unlimited_until: data.unlimitedUntil });
        setRedeemCode('');
        alert('Unlimited Access Activated for 24 Hours!');
      } else {
        alert('Invalid or Expired Code');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWithdraw = async () => {
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          password: adminPassword, 
          phoneNumber: withdrawPhone, 
          amount: parseFloat(withdrawAmount) 
        })
      });
      if (res.ok) {
        alert('Withdrawal request submitted to Admin.');
        setShowWithdraw(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Unauthorized');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startChallenge = () => {
    const challenges: Challenge[] = [
      {
        type: 'logic',
        question: "If you have three apples and you take away two, how many apples do you have?",
        answer: "2"
      },
      {
        type: 'creative',
        question: "Describe a new color that doesn't exist yet in 3 words.",
        scenario: "New color description"
      },
      {
        type: 'factual',
        question: "Find the error: 'The capital of Pakistan is Karachi and it was founded in 1947.'",
        text: "The capital of Pakistan is Karachi and it was founded in 1947."
      }
    ];
    setCurrentChallenge(challenges[Math.floor(Math.random() * challenges.length)]);
    setShowChallenge(true);
    setChallengeSuccess(false);
    setChallengeInput('');
  };

  const submitChallenge = () => {
    if (currentChallenge?.type === 'logic' && challengeInput.trim() === currentChallenge.answer) {
      setChallengeSuccess(true);
    } else if (currentChallenge?.type === 'creative' && challengeInput.split(' ').length >= 3) {
      setChallengeSuccess(true);
    } else if (currentChallenge?.type === 'factual' && (challengeInput.toLowerCase().includes('islamabad'))) {
      setChallengeSuccess(true);
    } else {
      alert('Try again! Think carefully.');
    }
  };

  return (
    <div className="flex h-screen bg-cyber-bg overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 80 }}
        className="hidden md:flex flex-col border-r border-white/5 bg-cyber-card/50 backdrop-blur-xl z-20"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center shadow-lg shadow-neon-blue/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold tracking-tight neon-text">WAQIBYX</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'profile', icon: UserCircle, label: 'Profile' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20' 
                  : 'text-white/50 hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-3 rounded-xl hover:bg-white/5 text-white/30"
          >
            <ChevronRight className={`w-5 h-5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
          <button 
            onClick={() => setShowAdmin(true)}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-white/50 hover:bg-white/5"
          >
            <Settings className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="text-sm font-medium">Settings</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-cyber-bg/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 hover:bg-white/5 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {activeTab === 'chat' ? 'Neural Interface' : 
                 activeTab === 'dashboard' ? 'System Analytics' : 
                 activeTab === 'profile' ? 'User Profile' : 'Admin Control'}
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
                  {user?.subscription_tier?.toUpperCase() || 'FREE'} MODE
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold">
                  {user.unlimited_until > Date.now() ? 'ULTRA' : `${user.message_count}/10`}
                </span>
              </div>
            )}
            <div className="w-10 h-10 rounded-full border border-white/10 p-0.5 bg-gradient-to-tr from-neon-blue to-neon-purple">
              <div className="w-full h-full rounded-full bg-cyber-bg flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white/70" />
              </div>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col"
              >
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6"
                >
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                      <div className="relative">
                        <motion.div 
                          animate={{ 
                            scale: [1, 1.2, 1],
                            rotate: [0, 180, 360],
                            filter: ["hue-rotate(0deg)", "hue-rotate(360deg)"]
                          }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="w-32 h-32 rounded-full bg-gradient-to-tr from-neon-blue via-neon-purple to-neon-pink blur-2xl opacity-20"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Bot className="w-12 h-12 text-neon-blue animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-3xl font-bold tracking-tighter neon-text">WAQIBYX AI</h3>
                        <p className="text-white/50 max-w-sm mx-auto text-sm leading-relaxed">
                          Multimodal Intelligence: Voice, Vision, and Deep Memory.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                        {['Generate a Cyberpunk City', 'Tell me a story in Urdu', 'Latest Tech News', 'Analyze my memory'].map(q => (
                          <button 
                            key={q}
                            onClick={() => setInput(q)}
                            className="px-4 py-2 text-[10px] uppercase tracking-widest cyber-card hover:border-neon-blue/30 transition-all group"
                          >
                            <span className="text-white/40 group-hover:text-neon-blue transition-colors">{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                          msg.role === 'user' ? 'bg-white/10' : 'bg-neon-blue/20 text-neon-blue'
                        }`}>
                          {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className="space-y-2 flex flex-col items-start">
                          <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-white/5 border border-white/10' 
                              : 'bg-cyber-card border border-white/5 shadow-xl'
                          }`}>
                            <div className="markdown-body">
                              <Markdown>{msg.content}</Markdown>
                            </div>
                            
                            {msg.image && (
                              <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
                                <img src={msg.image} alt="Generated" className="w-full h-auto" referrerPolicy="no-referrer" />
                              </div>
                            )}
                            
                            {msg.video && (
                              <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black">
                                <video src={msg.video} controls className="w-full h-auto" />
                              </div>
                            )}
                          </div>
                          
                          {msg.role === 'model' && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleTTS(msg.content)}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-neon-blue transition-colors"
                                title="Listen to response"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-neon-purple transition-colors"
                                title="Copy to clipboard"
                                onClick={() => navigator.clipboard.writeText(msg.content)}
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-neon-blue/20 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-neon-blue" />
                        </div>
                        <div className="p-4 bg-cyber-card border border-white/5 rounded-2xl flex flex-col gap-3 min-w-[120px]">
                          <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                          {isGeneratingMedia && (
                            <span className="text-[10px] text-white/40 uppercase animate-pulse">
                              Generating {isGeneratingMedia}...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 md:p-8 bg-gradient-to-t from-cyber-bg to-transparent">
                  <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <button 
                        onClick={() => setSearchEnabled(!searchEnabled)}
                        className={`p-2 rounded-lg border transition-all flex items-center gap-2 ${
                          searchEnabled ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue' : 'border-white/5 text-white/30'
                        }`}
                      >
                        <Search className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Web Search</span>
                      </button>
                      <div className="h-4 w-px bg-white/5 mx-2" />
                      <button 
                        onClick={() => handleSendMessage(input, 'image')}
                        disabled={!input.trim() || isLoading}
                        className="p-2 rounded-lg border border-white/5 text-white/30 hover:text-neon-purple hover:border-neon-purple/30 transition-all flex items-center gap-2"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Vision</span>
                      </button>
                      <button 
                        onClick={() => handleSendMessage(input, 'video')}
                        disabled={!input.trim() || isLoading}
                        className="p-2 rounded-lg border border-white/5 text-white/30 hover:text-neon-pink hover:border-neon-pink/30 transition-all flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Video</span>
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type your thoughts, generate images, or ask for news..."
                        rows={1}
                        className="w-full bg-cyber-card border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-neon-blue/50 transition-all pr-16 shadow-2xl resize-none"
                      />
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-3 bottom-2.5 p-3 bg-neon-blue text-black rounded-xl hover:bg-white transition-all disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="h-full overflow-y-auto p-4 md:p-8 space-y-8"
              >
                {/* Stats Grid - Publicly visible but less detailed */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Requests', value: '1.2M', icon: Activity, color: 'text-neon-blue' },
                    { label: 'System Load', value: '24%', icon: Cpu, color: 'text-neon-purple' },
                    { label: 'Global Reach', value: '142', icon: Globe, color: 'text-neon-pink' },
                    { label: 'AI Efficiency', value: '99.9%', icon: TrendingUp, color: 'text-green-400' },
                  ].map((stat, i) => (
                    <div key={i} className="cyber-card p-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        <span className="text-[10px] text-white/20 font-mono">LIVE</span>
                      </div>
                      <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                      <p className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="cyber-card p-8 text-center space-y-4">
                  <h3 className="text-xl font-bold neon-text">System Status: Optimal</h3>
                  <p className="text-sm text-white/50 max-w-lg mx-auto">
                    All neural nodes are operating within normal parameters. Global latency is currently at 142ms.
                  </p>
                  <div className="flex justify-center gap-8 pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-neon-blue">99.9%</p>
                      <p className="text-[10px] text-white/30 uppercase">Uptime</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-neon-purple">1.2s</p>
                      <p className="text-[10px] text-white/30 uppercase">Avg Response</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-neon-pink">256</p>
                      <p className="text-[10px] text-white/30 uppercase">Active Nodes</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'profile' ? (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto"
              >
                <div className="flex items-center gap-6 p-8 cyber-card">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple p-1">
                    <div className="w-full h-full rounded-full bg-cyber-bg flex items-center justify-center">
                      <UserIcon className="w-10 h-10 text-white/70" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold tracking-tight">User Node: {user?.id}</h3>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-neon-blue/20 text-neon-blue text-[10px] font-bold uppercase tracking-widest border border-neon-blue/30">
                        {user?.subscription_tier} Tier
                      </span>
                      <span className="text-xs text-white/40">Active since March 2026</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Persona Selector */}
                  <div className="cyber-card p-6 space-y-6">
                    <div className="flex items-center gap-3">
                      <Brain className="w-5 h-5 text-neon-purple" />
                      <h4 className="text-sm font-bold uppercase tracking-widest">AI Persona</h4>
                    </div>
                    <div className="space-y-3">
                      {Object.keys(PERSONAS).map(p => (
                        <button 
                          key={p}
                          onClick={() => updateSettings({ persona: p })}
                          className={`w-full p-4 rounded-xl border text-left transition-all ${
                            user?.persona === p 
                              ? 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple' 
                              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          <p className="text-xs font-bold uppercase mb-1">{p}</p>
                          <p className="text-[10px] opacity-60">{PERSONAS[p as keyof typeof PERSONAS]}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subscription Plans */}
                  <div className="cyber-card p-6 space-y-6">
                    <div className="flex items-center gap-3">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <h4 className="text-sm font-bold uppercase tracking-widest">Subscription</h4>
                    </div>
                    <div className="space-y-4">
                      {[
                        { id: 'free', name: 'Free', price: 'Rs. 0', features: ['10 Messages/Day', 'Basic AI', 'Text Only'] },
                        { id: 'pro', name: 'Pro', price: 'Rs. 999', features: ['Unlimited Messages', 'Advanced Persona', 'Vision & Search'] },
                        { id: 'ultra', name: 'Ultra', price: 'Rs. 2499', features: ['Everything in Pro', 'Video Generation', 'Priority Neural Link'] },
                      ].map(plan => (
                        <div 
                          key={plan.id}
                          className={`p-4 rounded-xl border transition-all ${
                            user?.subscription_tier === plan.id 
                              ? 'bg-neon-blue/10 border-neon-blue/30' 
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold">{plan.name}</p>
                            <p className="text-xs font-mono text-neon-blue">{plan.price}</p>
                          </div>
                          <ul className="space-y-1">
                            {plan.features.map(f => (
                              <li key={f} className="text-[10px] text-white/40 flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          {user?.subscription_tier !== plan.id && (
                            <button 
                              onClick={() => updateSettings({ subscription_tier: plan.id })}
                              className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                              Upgrade
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Memory View */}
                <div className="cyber-card p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <History className="w-5 h-5 text-neon-blue" />
                      <h4 className="text-sm font-bold uppercase tracking-widest">Neural Memory</h4>
                    </div>
                    <span className="text-[10px] text-white/20 font-mono">{user?.memory?.length || 0} ENTRIES</span>
                  </div>
                  <div className="space-y-3">
                    {user?.memory?.map((m: any, i: number) => (
                      <div key={i} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                        <p className="text-xs text-white/60 italic">"{m.content}"</p>
                        <span className="text-[10px] text-white/20 font-mono">
                          {new Date(m.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {(!user?.memory || user.memory.length === 0) && (
                      <p className="text-xs text-white/20 text-center py-8 italic">No neural patterns stored yet.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="admin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full overflow-y-auto p-4 md:p-8 space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold tracking-tight">Admin Command Center</h3>
                  <button onClick={() => setActiveTab('chat')} className="p-2 hover:bg-white/5 rounded-xl">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>

                {adminStats && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="cyber-card p-6">
                        <p className="text-[10px] text-white/40 uppercase mb-2">Total Users</p>
                        <p className="text-3xl font-bold">{adminStats.totalUsers}</p>
                      </div>
                      <div className="cyber-card p-6">
                        <p className="text-[10px] text-white/40 uppercase mb-2">Total Messages</p>
                        <p className="text-3xl font-bold">{adminStats.totalMessages}</p>
                      </div>
                      <div className="cyber-card p-6">
                        <p className="text-[10px] text-white/40 uppercase mb-2">Pending Withdrawals</p>
                        <p className="text-3xl font-bold text-yellow-400">{adminStats.pendingWithdrawals.length}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 1. User Growth (Line Graph) */}
                      <div className="cyber-card p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">User Growth</h4>
                          <TrendingUp className="w-4 h-4 text-neon-blue" />
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={adminStats.userGrowth}>
                              <defs>
                                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="date" stroke="#ffffff33" fontSize={10} />
                              <YAxis stroke="#ffffff33" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#121821', border: 'none', borderRadius: '12px' }} />
                              <Area type="monotone" dataKey="count" stroke="#00f3ff" fill="url(#colorGrowth)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* 2. Revenue vs Expenses (Bar Chart) */}
                      <div className="cyber-card p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">Revenue vs Expenses</h4>
                          <Wallet className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={adminStats.revenueExpenses}>
                              <XAxis dataKey="month" stroke="#ffffff33" fontSize={10} />
                              <YAxis stroke="#ffffff33" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#121821', border: 'none', borderRadius: '12px' }} />
                              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* 3. Subscription Distribution (Pie Chart) */}
                      <div className="cyber-card p-6">
                        <h4 className="text-sm font-bold uppercase mb-6 tracking-widest text-white/60">Subscription Distribution</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={adminStats.tiers.map((t: any) => ({ name: t.subscription_tier.toUpperCase(), value: t.count }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {adminStats.tiers.map((_: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#121821', border: 'none', borderRadius: '12px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* 4. Token Usage per Feature (Horizontal Bar Chart) */}
                      <div className="cyber-card p-6 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">Token Usage per Feature</h4>
                          <Cpu className="w-4 h-4 text-neon-purple" />
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={adminStats.tokenUsage} layout="vertical">
                              <XAxis type="number" stroke="#ffffff33" fontSize={10} hide />
                              <YAxis dataKey="feature" type="category" stroke="#ffffff33" fontSize={10} width={80} />
                              <Tooltip contentStyle={{ backgroundColor: '#121821', border: 'none', borderRadius: '12px' }} />
                              <Bar dataKey="tokens" fill="#bc13fe" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* 5. Peak Activity Hours (Heatmap-like Area Chart) */}
                      <div className="cyber-card p-6 space-y-6 lg:col-span-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">Peak Activity Hours (24h)</h4>
                          <Activity className="w-4 h-4 text-neon-pink" />
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={adminStats.peakActivity}>
                              <XAxis dataKey="hour" stroke="#ffffff33" fontSize={10} />
                              <YAxis stroke="#ffffff33" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#121821', border: 'none', borderRadius: '12px' }} />
                              <Area type="step" dataKey="users" stroke="#ff00ff" fill="#ff00ff33" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="cyber-card p-6 lg:col-span-2">
                        <h4 className="text-sm font-bold uppercase mb-6 tracking-widest text-white/60">Security Protocol Logs</h4>
                        <div className="space-y-3">
                          {adminStats.recentLogs.map((log: any, i: number) => (
                            <div key={i} className="text-[10px] font-mono p-2 bg-white/5 rounded border border-white/5 flex justify-between">
                              <div>
                                <span className="text-neon-blue">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className="text-white/60 ml-2">{log.event}</span>
                              </div>
                              <span className="text-white/20 ml-2">IP: {log.ip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md cyber-card p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-neon-blue" />
                  <h3 className="text-xl font-bold tracking-tight">Admin Interface</h3>
                </div>
                <button onClick={() => setShowAdmin(false)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Access Key</label>
                  <div className="relative">
                    <input 
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-neon-blue/50 outline-none"
                      placeholder="••••••••"
                    />
                    <Lock className="absolute right-4 top-4 w-4 h-4 text-white/20" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={generateAdminCode} className="cyber-button flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Code</span>
                  </button>
                  <button onClick={fetchAdminStats} className="cyber-button flex items-center justify-center gap-2 !from-neon-purple !to-neon-pink">
                    <BarChart3 className="w-4 h-4" />
                    <span>Stats</span>
                  </button>
                </div>

                {adminCode && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-neon-blue/10 border border-neon-blue/20 rounded-2xl text-center"
                  >
                    <p className="text-[10px] text-white/40 uppercase mb-2">24h Bypass Token</p>
                    <p className="text-3xl font-mono font-bold tracking-[0.2em] text-neon-blue">{adminCode}</p>
                  </motion.div>
                )}

                <div className="pt-6 border-t border-white/5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-3 block">Redeem Token</label>
                  <div className="flex gap-2">
                    <input 
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                      placeholder="XXXX-XXXX"
                    />
                    <button onClick={handleRedeemCode} className="px-6 py-3 bg-white text-black rounded-xl text-sm font-bold">
                      Redeem
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showWithdraw && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md cyber-card p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-neon-blue" />
                  <h3 className="text-xl font-bold tracking-tight">Fund Withdrawal</h3>
                </div>
                <button onClick={() => setShowWithdraw(false)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-neon-blue/10 to-transparent border border-neon-blue/20 rounded-2xl">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Current Earnings</p>
                  <p className="text-4xl font-bold text-neon-blue">Rs. 24,500</p>
                </div>

                <div className="space-y-4">
                  <input 
                    type="text"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm outline-none"
                    placeholder="EasyPaisa Number"
                  />
                  <input 
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm outline-none"
                    placeholder="Withdraw Amount"
                  />
                </div>

                <button 
                  onClick={handleWithdraw}
                  className="w-full py-4 cyber-button !from-neon-blue !to-neon-purple text-white"
                >
                  Initiate Transfer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showChallenge && currentChallenge && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md cyber-card p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-xl font-bold tracking-tight">Neural Challenge</h3>
                </div>
                {!challengeSuccess && (
                  <button onClick={() => setShowChallenge(false)} className="p-2 hover:bg-white/10 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {!challengeSuccess ? (
                <div className="space-y-6">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-mono">
                      {currentChallenge.type} Protocol
                    </p>
                    <p className="text-lg font-medium leading-relaxed">
                      {currentChallenge.question}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <textarea 
                      value={challengeInput}
                      onChange={(e) => setChallengeInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm min-h-[120px] outline-none focus:border-neon-blue/50"
                      placeholder="Input solution..."
                    />
                    <button onClick={submitChallenge} className="w-full py-4 cyber-button">
                      Verify Solution
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-8 py-4">
                  <div className="flex justify-center">
                    <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/30 animate-pulse">
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-2xl font-bold">Protocol Verified</h4>
                    <p className="text-white/50 text-sm leading-relaxed">
                      Your solution has been submitted. Please await Admin authorization for unlimited system access.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowChallenge(false)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all"
                  >
                    Return to Interface
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Footer Ads Mock */}
      <footer className="mt-auto pt-4">
        <div className="glass-panel rounded-xl p-2 flex items-center justify-center gap-4">
          <span className="text-[10px] text-white/20 uppercase font-mono">Sponsored</span>
          <div className="h-8 w-full max-w-xs bg-white/5 rounded flex items-center justify-center text-[10px] text-white/40 italic">
            Google AdMob Banner Placeholder
          </div>
        </div>
      </footer>
    </div>
  );
}
