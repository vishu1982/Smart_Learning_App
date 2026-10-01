import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, Sparkles, Check, BookOpen, Lock, Unlock, Eye, EyeOff, Mic, MicOff, Volume2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { axiosClient } from '../api/axiosClient';

export default function SummarizerPage({ onGenerateQuizForMaterial }) {
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

  const [materials, setMaterials] = useState([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(storedUser.program && storedUser.program !== 'General Academic' ? storedUser.program : getDefaultSubject(storedUser.grade_level));
  const [gradeLevel, setGradeLevel] = useState(storedUser.grade_level || 'Class 10th');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const toggleLockRef = useRef(false);

  // Voice Q&A state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    fetchMaterials();
    
    // Setup Speech Recognition
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        setIsListening(false);
        // Auto submit question
        handleAskQuestion(transcript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech error", event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await axiosClient.get('/materials/my');
      setMaterials(res.data);
      if (res.data.length > 0 && !activeMaterial) {
        setActiveMaterial(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  };

  const MAX_FILE_MB  = 20;
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_BYTES) {
      setUploadError(
        `File too large: ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is ${MAX_FILE_MB} MB.`
      );
      setSelectedFile(null);
      return;
    }
    setUploadError('');
    setUploading(true);
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('grade_level', gradeLevel);
    formData.append('is_private', isPrivate ? 'true' : 'false');
    formData.append('file', selectedFile);

    try {
      const res = await axiosClient.post('/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTitle('');
      setSelectedFile(null);
      setIsPrivate(false);
      setUploadError('');
      await fetchMaterials();
      setActiveMaterial(res.data);
      setAnswer(null);
      setQuestion('');
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePrivacy = async (material) => {
    if (toggleLockRef.current || togglingId) return;
    toggleLockRef.current = true;
    setTogglingId(material.id);
    try {
      const res = await axiosClient.patch(`/materials/${material.id}/privacy`);
      setMaterials((prev) =>
        prev.map((m) => m.id === material.id ? { ...m, is_private: res.data.is_private } : m)
      );
      if (activeMaterial?.id === material.id) {
        setActiveMaterial((prev) => ({ ...prev, is_private: res.data.is_private }));
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle privacy');
    } finally {
      setTogglingId(null);
      toggleLockRef.current = false;
    }
  };

  const readTextAloud = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setQuestion('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleAskQuestion = async (qText = question) => {
    if (!qText.trim() || !activeMaterial) return;
    
    setAsking(true);
    try {
      // Create context from the active material
      const context = `Context from PDF Notes (${activeMaterial.title}):\n${activeMaterial.ai_summary.bullet_notes}\n\nKey Takeaways:\n${activeMaterial.ai_summary.key_takeaways.join(', ')}`;
      const prompt = `Based on the following study notes, answer the user's question clearly and concisely.\n\n${context}\n\nUser Question: ${qText}`;
      
      const res = await axiosClient.post('/ai-tutor/chat', {
        subject: activeMaterial.subject || "Study Notes",
        message: prompt,
        grade_level: activeMaterial.grade_level || "Class 10th"
      });
      
      const aiReply = res.data.reply;
      setAnswer(aiReply);
      readTextAloud(aiReply); // Auto-read the answer
    } catch (err) {
      setAnswer("Sorry, I couldn't process your question at the moment.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── Left Panel: Upload + Library ── */}
      <div className="space-y-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-indigo-600" /> Upload PDF Notes
          </h3>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Chapter / Topic Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 1: Chemical Reactions"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Science / Physics / Maths"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Grade / Standard</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Class 10th">Class 10th (Secondary)</option>
                <option value="Class 11th-12th">Class 11th – 12th</option>
                <option value="Undergraduate (Degree)">Undergraduate (BCA/B.Tech/B.Sc)</option>
                <option value="Postgraduate (Masters)">Postgraduate (MCA/MBA/M.Tech)</option>
              </select>
            </div>
            <div
              onClick={() => setIsPrivate((v) => !v)}
              className={`flex items-center justify-between px-3.5 py-3 rounded-xl border cursor-pointer transition select-none ${
                isPrivate
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {isPrivate ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-slate-400" />}
                <div>
                  <p className="text-xs font-bold">{isPrivate ? 'Private PDF' : 'Public PDF'}</p>
                  <p className="text-[10px] leading-tight mt-0.5">
                    {isPrivate ? 'Notes hidden from progress & other users' : 'Notes visible in your library'}
                  </p>
                </div>
              </div>
              <div className={`relative h-5 w-9 rounded-full transition-colors ${isPrivate ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPrivate ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">PDF File</label>
              <input
                type="file"
                accept=".pdf"
                required
                onChange={(e) => {
                  const f = e.target.files[0];
                  setSelectedFile(f || null);
                  setUploadError('');
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            {uploadError && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-rose-500 text-sm shrink-0">⚠️</span>
                <p className="text-xs text-rose-700 font-medium leading-snug">{uploadError}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {uploading
                ? <><span className="animate-spin mr-1">⚙️</span> AI Analysing PDF...</>
                : <><Sparkles className="h-4 w-4" /> Upload & Generate AI Notes</>
              }
            </button>
          </form>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">
            My Study Library ({materials.length})
          </h4>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {materials.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No materials uploaded yet.</p>
            )}
            {materials.map((m) => (
              <button
                key={m.id}
                onClick={() => { setActiveMaterial(m); setAnswer(null); setQuestion(''); }}
                className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                  activeMaterial?.id === m.id
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {m.is_private ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{m.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{m.subject} · {m.grade_level || 'General'}</p>
                  </div>
                </div>
                {m.is_private && <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">Private</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Summary View ── */}
      <div className="lg:col-span-2">
        {activeMaterial ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                    {activeMaterial.subject}
                  </span>
                  <button
                    onClick={() => handleTogglePrivacy(activeMaterial)}
                    disabled={togglingId === activeMaterial.id}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border transition cursor-pointer disabled:opacity-50 ${
                      activeMaterial.is_private
                        ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {activeMaterial.is_private ? <><Lock className="h-3 w-3" /> Private</> : <><Eye className="h-3 w-3" /> Public</>}
                  </button>
                  <button 
                    onClick={() => readTextAloud(`Title: ${activeMaterial.title}. Subject: ${activeMaterial.subject}. ${activeMaterial.ai_summary.key_takeaways.join('. ')}`)}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                  >
                    <Volume2 className="h-3 w-3" /> Read Summary
                  </button>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-2">{activeMaterial.title}</h2>
              </div>
              <button
                onClick={() => onGenerateQuizForMaterial(activeMaterial)}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="h-4 w-4" /> Practice Quiz
              </button>
            </div>

            {/* Voice Q&A Box */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100 relative">
              <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-900 mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-indigo-600" /> Ask AI Tutor About This PDF
              </h4>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-indigo-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                />
                <button
                  onClick={toggleListening}
                  className={`p-2.5 rounded-xl text-white font-bold transition flex items-center justify-center shadow-md ${
                    isListening ? 'bg-rose-500 hover:bg-rose-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => handleAskQuestion()}
                  disabled={asking || !question.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md disabled:opacity-50"
                >
                  {asking ? '...' : 'Ask'}
                </button>
              </div>
              
              {answer && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-100 text-sm text-slate-700 relative">
                  <button 
                    onClick={() => readTextAloud(answer)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-indigo-600"
                    title="Read Aloud"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <p className="font-semibold mb-1 text-indigo-800">AI Tutor:</p>
                  <div className="prose prose-sm prose-indigo max-w-none text-slate-800">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        a: ({ href, children }) => {
                          if (href?.includes('youtube.com/watch?v=') && typeof children[0]?.props?.src !== 'undefined') {
                            const videoId = new URL(href).searchParams.get('v');
                            if (videoId) {
                              return (
                                <div className="my-3 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                                  <iframe width="100%" height="250" src={`https://www.youtube.com/embed/${videoId}`} title="YouTube" frameBorder="0" allowFullScreen></iframe>
                                </div>
                              );
                            }
                          }
                          return <a href={href} target="_blank" className="text-indigo-600 underline">{children}</a>;
                        },
                        img: ({ src, alt }) => <img src={src} alt={alt} className="max-w-full h-auto rounded-xl shadow-sm my-2" />
                      }}
                    >
                      {answer}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {activeMaterial.ai_summary?.key_takeaways && (
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5">
                <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-900 mb-3 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-indigo-600" /> Key Exam Takeaways
                </h4>
                <ul className="space-y-2">
                  {activeMaterial.ai_summary.key_takeaways.map((point, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                  {activeMaterial.is_private && <EyeOff className="h-3.5 w-3.5 text-amber-400" />}
                  Structured Study Notes
                </h4>
                <button 
                  onClick={() => readTextAloud(activeMaterial.ai_summary.bullet_notes)}
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  <Volume2 className="h-3 w-3" /> Read Notes Aloud
                </button>
              </div>
              <div className="prose prose-sm prose-indigo max-w-none bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    h1: ({ children }) => <h1 className="text-xl font-black text-slate-900 mt-4 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-extrabold text-slate-900 mt-4 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold text-indigo-700 mt-3 mb-1.5">{children}</h3>,
                    p: ({ children }) => <p className="text-sm text-slate-800 leading-relaxed mb-3">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 pl-2 text-sm">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 pl-2 text-sm">{children}</ol>,
                    li: ({ children }) => <li className="text-sm text-slate-800 leading-relaxed">{children}</li>,
                    code: ({ inline, className, children, ...props }) => {
                      if (inline) {
                        return <code className="bg-slate-100 text-rose-600 font-mono text-xs px-1.5 py-0.5 rounded-md" {...props}>{children}</code>;
                      }
                      return (
                        <div className="my-3 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                          <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase tracking-wider">code</span>
                          </div>
                          <code className="block bg-slate-900 text-slate-100 font-mono text-xs p-4 overflow-x-auto leading-relaxed" {...props}>
                            {children}
                          </code>
                        </div>
                      );
                    },
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-indigo-400 bg-indigo-50 pl-4 pr-2 py-2 my-2 rounded-r-xl text-sm italic text-indigo-900">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {activeMaterial.ai_summary?.bullet_notes || 'No notes available.'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400 gap-3">
            <BookOpen className="h-12 w-12 text-slate-300" />
            <p className="text-sm font-semibold">Select or upload a PDF to view its AI summary.</p>
          </div>
        )}
      </div>
    </div>
  );
}
