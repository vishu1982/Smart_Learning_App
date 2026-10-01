import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  Send, Bot, User, Sparkles, BookOpen, Layers, Crown,
  Trash2, Maximize2, Minimize2, Mic, MicOff, Volume2, VolumeX, Square
} from 'lucide-react';
import { axiosClient } from '../api/axiosClient';
import SubscriptionModal from '../components/SubscriptionModal';

// Keywords that indicate user wants a detailed / in-depth answer
const DETAIL_KEYWORDS = [
  'in detail', 'in details', 'detailed', 'detail me', 'explain in detail',
  'step by step', 'step-by-step', 'elaborate', 'elaborate on',
  'comprehensive', 'thoroughly', 'thorough explanation',
  'full explanation', 'complete explanation', 'deep dive',
  'in depth', 'in-depth', 'explain deeply', 'derive', 'derivation',
  'prove', 'proof of', 'full proof', 'show me all steps',
];

function requiresSubscription(message) {
  const lower = message.toLowerCase();
  return DETAIL_KEYWORDS.some((kw) => lower.includes(kw));
}

// Clean markdown text so SpeechSynthesis reads it naturally
function cleanTextForSpeech(markdown) {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, ' Code block omitted. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/>\s*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[|─━═•📘📗🎓💡❓👋⚠️]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Typing indicator (3 animated dots) ──────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border border-slate-200/70 rounded-2xl rounded-tl-none w-fit shadow-sm">
      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" />
    </div>
  );
}

// ── Renders AI markdown reply with proper styling ────────────────────────────
function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ children }) => <h1 className="text-base font-black text-slate-900 mt-3 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-extrabold text-slate-900 mt-3 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold text-indigo-700 mt-2.5 mb-1">{children}</h3>,
        h4: ({ children }) => <h4 className="text-xs font-bold text-slate-700 mt-2 mb-0.5">{children}</h4>,
        p: ({ children }) => <p className="text-sm text-slate-800 leading-relaxed mb-2">{children}</p>,
        strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 pl-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 pl-2">{children}</ol>,
        li: ({ children }) => <li className="text-sm text-slate-800 leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-indigo-400 bg-indigo-50 pl-4 pr-2 py-2 my-2 rounded-r-xl text-sm italic text-indigo-900">
            {children}
          </blockquote>
        ),
        code: ({ inline, className, children, ...props }) => {
          if (inline) {
            return (
              <code className="bg-slate-100 text-rose-600 font-mono text-xs px-1.5 py-0.5 rounded-md" {...props}>
                {children}
              </code>
            );
          }
          return (
            <div className="my-2 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase tracking-wider">
                  {(className || '').replace('language-', '') || 'code'}
                </span>
                <span className="flex gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
              </div>
              <code className={`block bg-slate-900 text-slate-100 font-mono text-xs p-4 overflow-x-auto leading-relaxed ${className || ''}`} {...props}>
                {children}
              </code>
            </div>
          );
        },
        pre: ({ children }) => <>{children}</>,
        hr: () => <hr className="border-slate-200 my-3" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 rounded-xl border border-slate-200">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-indigo-50 font-bold text-indigo-900">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
        tr: ({ children }) => <tr className="hover:bg-slate-50">{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-bold">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-slate-700">{children}</td>,
        a: ({ href, children }) => {
          // If it's a youtube link with a video ID matching, we can render an iframe instead
          if (href?.includes('youtube.com/watch?v=') && typeof children[0]?.props?.src !== 'undefined') {
            const videoId = new URL(href).searchParams.get('v');
            if (videoId) {
              return (
                <div className="my-3 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                  <iframe
                    width="100%"
                    height="315"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              );
            }
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800 font-medium">
              {children}
            </a>
          );
        },
        img: ({ src, alt }) => (
          <img src={src} alt={alt} className="max-w-full h-auto rounded-xl shadow-sm border border-slate-200 my-2" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}


// ── Main AI Tutor Page ────────────────────────────────────────────────────────
export default function AITutorPage() {
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user_info');
      if (!raw || raw === 'undefined' || raw === 'null') return {};
      return JSON.parse(raw) || {};
    } catch { return {}; }
  })();

  const getDefaultSubject = (grade) => {
    if (!grade) return 'Science';
    if (grade.includes('10th')) return 'Science & Mathematics';
    if (grade.includes('11th') || grade.includes('12th')) return 'Physics / Chemistry / Mathematics';
    if (grade.includes('Undergraduate')) return 'Computer Science / Engineering';
    if (grade.includes('Postgraduate')) return 'Advanced Computing / Management';
    if (grade.includes('Competitive')) return 'JEE / NEET Syllabus';
    return 'General Academic';
  };

  const [messages, setMessages] = useState([
    {
      sender: 'AI',
      content:
        '## 👋 Hello! I\'m your Smart AI Tutor\n\nI\'m here to help you study smarter — whether you\'re preparing for:\n\n- 📘 **Class 10th** Board Exams (Science, Maths, Social Studies)\n- 📗 **Class 11th–12th** (Physics, Chemistry, Biology, Calculus)\n- 🎓 **University / Degree** (Computer Science, DBMS, Algorithms, MCA)\n\n**Type or click the 🎙️ Mic button to speak your question!** I\'ll answer in both text and voice.\n\n> 💡 **Pro Tip:** Ask for *"detailed explanation"* or *"step-by-step"* to unlock in-depth answers with **Smart Pro**!\n\n❓ *What topic would you like to start with today?*'
    }
  ]);
  const [input, setInput]                 = useState('');
  const [gradeLevel, setGradeLevel]       = useState(storedUser.grade_level || 'Class 10th');
  const [subject, setSubject]             = useState(storedUser.program && storedUser.program !== 'General Academic' ? storedUser.program : getDefaultSubject(storedUser.grade_level));
  const [customSubject, setCustomSubject] = useState('');
  const [sessionId, setSessionId]         = useState(null);
  const [loading, setLoading]             = useState(false);
  const [isFullScreen, setIsFullScreen]   = useState(false);

  // ── Speech-to-Text (Voice Input) & Text-to-Speech (Voice Output) State ──
  const [isListening, setIsListening]     = useState(false);
  const [voiceEnabled, setVoiceEnabled]   = useState(true); // Auto-speak AI answers if enabled
  const [speakingIdx, setSpeakingIdx]     = useState(null); // Which message index is currently being spoken
  const recognitionRef                    = useRef(null);
  const voiceEnabledRef                   = useRef(voiceEnabled);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
    if (!voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
    }
  }, [voiceEnabled]);

  // Clean up speech synthesis & recognition on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Subscription state — read safely from localStorage
  const [subscription, setSubscription]     = useState(storedUser.subscription || 'free');
  const [showSubModal, setShowSubModal]     = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const activeSubject = customSubject.trim() ? customSubject.trim() : subject;
  const isPro = subscription === 'pro' || subscription === 'elite';

  // ── Text-to-Speech Function ────────────────────────────────────────────────
  const speakText = (text, msgIndex = null) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();

    // If clicking the same message that's already speaking, just stop it
    if (msgIndex !== null && speakingIdx === msgIndex) {
      setSpeakingIdx(null);
      return;
    }

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = 'en-IN';
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeakingIdx(msgIndex ?? 'auto');
    utterance.onend   = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);

    setSpeakingIdx(msgIndex ?? 'auto');
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIdx(null);
  };

  // ── Clear Chat ─────────────────────────────────────────────────────────────
  const handleClearChat = () => {
    stopSpeaking();
    setMessages([
      {
        sender: 'AI',
        content: '## 👋 Chat Cleared!\n\nReady for a fresh topic. **Speak or type your question!**'
      }
    ]);
    setSessionId(null);
  };

  // ── Send Question to AI Tutor ──────────────────────────────────────────────
  const handleSend = async (promptText) => {
    const userText = (promptText !== undefined ? promptText : input).trim();
    if (!userText || loading) return;

    stopSpeaking();

    // Gate detailed questions behind subscription
    if (requiresSubscription(userText) && !isPro) {
      setPendingMessage(userText);
      setInput('');
      setShowSubModal(true);
      return;
    }

    setInput('');
    const nextUserIdx = messages.length;
    setMessages((prev) => [...prev, { sender: 'USER', content: userText }]);
    setLoading(true);

    try {
      const res = await axiosClient.post('/ai-tutor/chat', {
        session_id: sessionId,
        subject: activeSubject,
        grade_level: gradeLevel,
        message: userText
      });
      const replyText = res.data.reply;
      setSessionId(res.data.session_id);
      const aiMsgIdx = nextUserIdx + 1;
      setMessages((prev) => [...prev, { sender: 'AI', content: replyText }]);

      // If Voice Reply is enabled, automatically speak the AI Tutor's response
      if (voiceEnabledRef.current) {
        setTimeout(() => speakText(replyText, aiMsgIdx), 150);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'AI',
          content:
            '> ⚠️ **Connection Error**\n>\n> Could not reach the backend. Please make sure **FastAPI is running** on `http://localhost:8000`.\n\n```bash\ncd backend\npython main.py\n```'
        }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // ── Speech-to-Text (Speak Question) ────────────────────────────────────────
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsListening(false);
      return;
    }

    stopSpeaking();

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      setInput((finalTranscript + interim).trim());
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      const spokenQuestion = finalTranscript.trim();
      if (spokenQuestion) {
        // Automatically send the spoken question so the AI Tutor answers immediately!
        handleSend(spokenQuestion);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const getPromptsForGrade = () => {
    if (gradeLevel.includes('10th')) {
      return [
        "Explain Ohm's Law V = IR with a water-pipe analogy",
        'Balance the equation: Fe + O₂ → Fe₂O₃',
        'How does the Human Digestive System work? (5-mark answer)'
      ];
    } else if (gradeLevel.includes('11th') || gradeLevel.includes('12th')) {
      return [
        "Derive Lens Maker's Formula with sign convention",
        'Explain SN1 vs SN2 with mechanism and examples',
        'Solve Integration by Parts: ∫x·eˣ dx'
      ];
    } else {
      return [
        'Explain Strict 2PL vs Rigorous 2PL with examples',
        'Time & Space complexity of MergeSort vs QuickSort',
        'What is deadlock? Explain detection using Wait-For Graph'
      ];
    }
  };

  return (
    <div className={
      isFullScreen
        ? 'fixed inset-0 z-50 w-full h-full flex flex-col bg-white overflow-hidden'
        : 'max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden'
    }>

      {/* ── Subscription Modal ── */}
      {showSubModal && (
        <SubscriptionModal
          onClose={() => { setShowSubModal(false); setPendingMessage(null); }}
          onSubscribed={(newPlan) => {
            setSubscription(newPlan);
            setShowSubModal(false);
            if (pendingMessage) {
              const msg = pendingMessage;
              setPendingMessage(null);
              setTimeout(() => handleSend(msg), 100);
            }
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">Smart AI Tutor</h3>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                Voice &amp; Text AI
              </span>
              {/* Subscription status badge */}
              {isPro ? (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  subscription === 'elite'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-purple-100 text-purple-800 border border-purple-300'
                }`}>
                  <Crown className="h-3 w-3" />
                  {subscription === 'elite' ? 'Smart Elite' : 'Smart Pro'}
                </span>
              ) : (
                <button
                  onClick={() => setShowSubModal(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition"
                >
                  <Crown className="h-3 w-3" /> Upgrade to Pro
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Speak or type your question · Answers in Text &amp; Voice</p>
          </div>
        </div>

        {/* Selectors & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
            <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="Class 10th">Class 10th</option>
              <option value="Class 11th-12th">Class 11th–12th</option>
              <option value="Undergraduate (BCA/B.Tech/B.Sc)">Undergraduate</option>
              <option value="Postgraduate (MCA/M.Tech/MBA)">Postgraduate</option>
              <option value="General & Competitive">Competitive Exams</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
            <BookOpen className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <select
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setCustomSubject(''); }}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="Science (Physics / Chemistry / Biology)">Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Social Science / History / Geography">Social Studies</option>
              <option value="Computer Science & IT">Computer Science</option>
              <option value="Advanced Database Systems">DBMS</option>
              <option value="Custom">Custom…</option>
            </select>
          </div>

          {subject === 'Custom' && (
            <input
              type="text"
              placeholder="Enter subject…"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="px-3 py-1.5 bg-white border border-indigo-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
            />
          )}

          {/* Voice Reply ON/OFF Toggle */}
          <button
            type="button"
            onClick={() => setVoiceEnabled(v => !v)}
            title={voiceEnabled ? 'Voice Reply is ON (Click to mute auto-speech)' : 'Voice Reply is OFF (Click to enable auto-speech)'}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition shadow-2xs ${
              voiceEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {voiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-600" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{voiceEnabled ? 'Voice: ON' : 'Voice: OFF'}</span>
          </button>

          {/* Stop Speaking button (shown while actively speaking) */}
          {speakingIdx !== null && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="flex items-center gap-1 bg-rose-50 border border-rose-300 text-rose-600 rounded-xl px-2.5 py-1.5 text-xs font-bold hover:bg-rose-100 transition animate-pulse"
            >
              <Square className="h-3 w-3 fill-rose-600" />
              <span>Stop Audio</span>
            </button>
          )}

          {/* Clear Chat Button */}
          <button
            type="button"
            onClick={handleClearChat}
            title="Clear Chat"
            className="flex items-center gap-1 bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-2xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {/* Full Screen Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFullScreen(f => !f)}
            title={isFullScreen ? 'Exit Whole Screen' : 'Whole Screen Mode'}
            className="flex items-center gap-1 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-2xs"
          >
            {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullScreen ? 'Exit Full' : 'Full Screen'}</span>
          </button>
        </div>
      </div>

      {/* ── Chat Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${msg.sender === 'USER' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              msg.sender === 'USER'
                ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white border border-indigo-200 text-indigo-600 shadow-sm'
            }`}>
              {msg.sender === 'USER' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            {msg.sender === 'USER' ? (
              <div className="max-w-lg px-4 py-3 rounded-2xl rounded-tr-none bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm leading-relaxed shadow-md shadow-indigo-100 font-medium">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-2xl px-5 py-4 rounded-2xl rounded-tl-none bg-white border border-slate-200/80 shadow-sm text-slate-800 overflow-hidden">
                <MarkdownMessage content={msg.content} />
                {/* Listen / Stop button per AI reply */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => speakText(msg.content, idx)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      speakingIdx === idx
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'
                    }`}
                  >
                    {speakingIdx === idx ? (
                      <>
                        <Square className="h-3 w-3 fill-rose-600" /> Stop Speaking
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5" /> Listen Answer
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator while loading */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 bg-white border border-indigo-200 text-indigo-600 shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Prompt Suggestions ── */}
      <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        {getPromptsForGrade().map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp)}
            disabled={loading}
            className="text-[11px] bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full whitespace-nowrap hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition disabled:opacity-40 shadow-2xs"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* ── Listening Banner ── */}
      {isListening && (
        <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs text-rose-700 font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-ping" />
            <span>🎙️ Listening... Speak your question clearly (auto-sends when you finish)</span>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold"
          >
            Stop Mic
          </button>
        </div>
      )}

      {/* ── Input Box with Mic (Speak-to-Text) + Send ── */}
      <form onSubmit={handleFormSubmit} className="px-4 py-3 bg-white border-t border-slate-200 flex gap-2 items-center">
        <button
          type="button"
          onClick={toggleListening}
          disabled={loading}
          title={isListening ? 'Stop Listening' : 'Speak Your Question (Voice to Text)'}
          className={`h-11 w-11 flex items-center justify-center rounded-2xl transition shadow-sm shrink-0 ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-rose-200'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening to your voice…' : `Speak 🎙️ or type a question in ${activeSubject} (${gradeLevel})…`}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/60 placeholder:text-slate-400 disabled:opacity-60 transition"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-11 w-11 flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl transition shadow-md shadow-indigo-200 disabled:opacity-40 shrink-0"
          title="Send"
        >
          {loading
            ? <Sparkles className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </button>
      </form>
    </div>
  );
}
