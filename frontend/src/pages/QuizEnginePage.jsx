import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Clock, CheckCircle2, ArrowRight, RotateCcw, Languages, Crown } from 'lucide-react';
import { axiosClient } from '../api/axiosClient';
import SubscriptionModal from '../components/SubscriptionModal';



// Language config
const LANGUAGES = [
  { code: 'en',       label: 'English',   flag: '🇬🇧' },
  { code: 'hindi',    label: 'हिंदी',      flag: '🇮🇳' },
  { code: 'gujarati', label: 'ગુજરાતી',    flag: '🏳️' },
];

export default function QuizEnginePage({ initialMaterial }) {
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

  // --- Setup Form State ---
  const [topic, setTopic]           = useState(initialMaterial ? initialMaterial.title : '');
  const [subject, setSubject]       = useState(initialMaterial ? initialMaterial.subject : (storedUser.program && storedUser.program !== 'General Academic' ? storedUser.program : getDefaultSubject(storedUser.grade_level)));
  const [gradeLevel, setGradeLevel] = useState(initialMaterial?.grade_level || storedUser.grade_level || 'Class 10th');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [generating, setGenerating] = useState(false);

  // --- Active Quiz State ---
  const [activeQuiz, setActiveQuiz]       = useState(null);   // original English quiz
  const [displayQuestions, setDisplayQuestions] = useState([]); // currently shown (may be translated)
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft]           = useState(600);
  const [result, setResult]               = useState(null);
  const [submitting, setSubmitting]       = useState(false);

  // --- Subscription Modal State ---
  const [showSubModal, setShowSubModal]   = useState(false);
  const [quizSubscription, setQuizSubscription] = useState(() => {
    try {
      const raw = localStorage.getItem('user_info');
      if (!raw || raw === 'undefined' || raw === 'null') return 'free';
      return JSON.parse(raw)?.subscription || 'free';
    } catch { return 'free'; }
  });


  // --- Language State ---
  const [language, setLanguage]           = useState('en');
  const [translating, setTranslating]     = useState(false);
  const [translationCache, setTranslationCache] = useState({}); // { hindi: [...], gujarati: [...] }


  // Sync initialMaterial prop changes
  useEffect(() => {
    if (initialMaterial) {
      setTopic(initialMaterial.title);
      setSubject(initialMaterial.subject);
      if (initialMaterial.grade_level) setGradeLevel(initialMaterial.grade_level);
    }
  }, [initialMaterial]);

  // Countdown timer
  useEffect(() => {
    if (!activeQuiz || timeLeft <= 0 || result) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, timeLeft, result]);

  // --- Generate Quiz ---
  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setResult(null);
    setSelectedAnswers({});
    setLanguage('en');
    setTranslationCache({});
    try {
      const genRes = await axiosClient.post('/quizzes/generate', {
        topic,
        subject,
        grade_level: gradeLevel,
        num_questions: parseInt(numQuestions),
        difficulty,
        material_id: initialMaterial?.id || null
      });
      const quizRes = await axiosClient.get(`/quizzes/${genRes.data.quiz_id}`);
      setActiveQuiz(quizRes.data);
      setDisplayQuestions(quizRes.data.questions);
      setCurrentIndex(0);
      setTimeLeft(quizRes.data.time_limit_minutes * 60);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail === 'QUIZ_LIMIT_REACHED') {
        // Free user hit the quiz limit → show subscription modal
        setShowSubModal(true);
      } else {
        alert(err.response?.data?.detail || 'Failed to generate quiz. Please try again.');
      }
    } finally {
      setGenerating(false);
    }

  };

  // --- Language Switch ---
  const handleLanguageChange = async (langCode) => {
    setLanguage(langCode);

    if (langCode === 'en') {
      setDisplayQuestions(activeQuiz.questions);
      return;
    }

    if (translationCache[langCode]) {
      setDisplayQuestions(translationCache[langCode]);
      return;
    }

    setTranslating(true);
    try {
      const res = await axiosClient.post(`/quizzes/${activeQuiz.quiz_id}/translate`, {
        language: langCode
      });
      const translated = res.data.questions;
      setTranslationCache((prev) => ({ ...prev, [langCode]: translated }));
      setDisplayQuestions(translated);
    } catch (err) {
      console.error('Translation failed:', err);
      alert('Translation failed. Showing English questions.');
      setLanguage('en');
      setDisplayQuestions(activeQuiz.questions);
    } finally {
      setTranslating(false);
    }
  };

  // --- Select Answer ---
  const handleSelect = (questionId, optionIdx) => {
    setSelectedAnswers({ ...selectedAnswers, [questionId]: optionIdx });
  };


  // --- Submit Quiz ---

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmitting(true);
    try {
      const timeTaken = (activeQuiz.time_limit_minutes * 60) - timeLeft;
      const payload = {
        time_taken_seconds: Math.max(1, timeTaken),
        answers: Object.entries(selectedAnswers).map(([qId, optIdx]) => ({
          question_id: parseInt(qId),
          selected_option_index: optIdx
        }))
      };
      const res = await axiosClient.post(`/quizzes/${activeQuiz.quiz_id}/submit`, payload);
      setResult(res.data);
      // Show subscription modal if milestone reached
      if (res.data.subscription_prompt && quizSubscription === 'free') {
        setShowSubModal(true);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────

  // RESULT VIEW
  // ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6">

        {/* 8-quiz milestone subscription modal */}
        {showSubModal && (
          <SubscriptionModal
            onClose={() => setShowSubModal(false)}
            onSubscribed={(plan) => {
              setQuizSubscription(plan);
              setShowSubModal(false);
              // Update localStorage
              try {
                const u = JSON.parse(localStorage.getItem('user_info') || '{}');
                localStorage.setItem('user_info', JSON.stringify({ ...u, subscription: plan }));
              } catch {}
            }}
          />
        )}

        <div className="text-center border-b pb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Quiz Completed!</h2>
          <p className="text-sm text-slate-500 mt-1">Instant Automated AI Evaluation</p>

          <div className="mt-4 inline-flex items-center gap-3 bg-indigo-50 border border-indigo-200 px-6 py-2.5 rounded-2xl">
            <span className="text-xs font-bold uppercase text-indigo-900">Your Score:</span>
            <span className="text-2xl font-black text-indigo-700">{result.score} / {result.total_questions}</span>
            <span className="text-xs font-bold text-indigo-600">({result.percentage}%)</span>
          </div>
        </div>

        {/* Detailed Review — always shows in English */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Detailed Answer Review:</h3>
          {result.detailed_review.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border ${
                item.is_correct ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-xs md:text-sm text-slate-900">
                  {idx + 1}. {item.question_text}
                </p>
                {item.is_correct ? (
                  <span className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Correct</span>
                ) : (
                  <span className="shrink-0 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">Incorrect</span>
                )}
              </div>
              <p className="text-xs mt-2 text-slate-700 font-medium">
                <strong>Your Choice:</strong> {item.options[item.selected_option_index] || 'None Selected'}
              </p>
              {!item.is_correct && (
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  <strong>Correct Answer:</strong> {item.options[item.correct_option_index]}
                </p>
              )}
              <div className="mt-2 text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-slate-200 leading-relaxed">
                <strong>💡 Concept Explanation:</strong> {item.explanation}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <button
            onClick={() => { setActiveQuiz(null); setResult(null); setLanguage('en'); setTranslationCache({}); }}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" /> Take Another Practice Quiz
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // QUIZ TAKING VIEW
  // ─────────────────────────────────────────────────────────
  if (activeQuiz) {
    const currentQ = displayQuestions[currentIndex];
    if (!currentQ) return null;

    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">

        {/* ── Header Bar ── */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap bg-slate-50/80">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {activeQuiz.subject}
              </span>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                {activeQuiz.grade_level || 'Class 10th'}
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-1 truncate">{activeQuiz.title}</h2>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 text-rose-600 font-mono font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 text-sm shrink-0">
            <Clock className="h-4 w-4" />
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {/* ── Language Selector ── */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Languages className="h-4 w-4 text-indigo-500" />
            <span>Language:</span>
          </div>
          <div className="flex items-center gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={translating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition disabled:opacity-50 ${
                  language === lang.code
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
          {translating && (
            <span className="text-[10px] text-indigo-500 font-semibold italic animate-pulse ml-1">
              Gemini translating...
            </span>
          )}
        </div>

        {/* ── Question Body ── */}
        <div className="px-6 pt-5 pb-4">
          <span className="text-xs font-semibold text-slate-400">
            Question {currentIndex + 1} of {displayQuestions.length}
          </span>
          {/* Progress bar */}
          <div className="mt-1.5 mb-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / displayQuestions.length) * 100}%` }}
            />
          </div>
          <p className="text-sm font-bold text-slate-900 leading-relaxed">{currentQ.question_text}</p>
        </div>

        {/* ── Options ── */}
        <div className="px-6 pb-4 space-y-2.5">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedAnswers[currentQ.question_id] === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(currentQ.question_id, idx)}
                className={`w-full text-left p-3.5 rounded-2xl border text-xs transition flex items-center gap-3 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* ── Navigation ── */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex justify-between items-center">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((c) => c - 1)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-slate-100 transition"
          >
            ← Previous
          </button>

          <span className="text-[11px] text-slate-400 font-medium">
            {Object.keys(selectedAnswers).length} / {displayQuestions.length} answered
          </span>

          {currentIndex === displayQuestions.length - 1 ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Evaluating...' : 'Submit & Review Score ✓'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex((c) => c + 1)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // QUIZ SETUP FORM
  // ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200 mb-2">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">AI MCQ Quiz Generator</h2>
        <p className="text-xs text-slate-500 mt-0.5">AI-powered practice tests · English / हिंदी / ગુજરાતી</p>

      </div>


      {/* Free plan limit banner */}
      {quizSubscription === 'free' && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-sm">⚠️</span>
            <div>
              <p className="text-xs font-bold text-amber-800">Free Plan — 5 Quiz Limit</p>
              <p className="text-[11px] text-amber-600">You can generate up to 5 quizzes. Upgrade for unlimited access.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSubModal(true)}
            className="ml-3 shrink-0 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition"
          >
            Upgrade ⚡
          </button>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-4">

        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Topic / Concept</label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Newton's Laws of Motion / Chemical Reactions / Calculus"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics / Chemistry / Math"
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
              <option value="Class 11th-12th">Class 11th - 12th</option>
              <option value="Undergraduate (Degree)">Undergraduate (Degree)</option>
              <option value="Postgraduate (Masters)">Postgraduate (Masters)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Questions</label>
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="3">3 Questions (Quick Test)</option>
              <option value="5">5 Questions (Standard)</option>
              <option value="10">10 Questions (Comprehensive)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="easy">Easy (Definitions & Basics)</option>
              <option value="medium">Medium (Board Exam Level)</option>
              <option value="hard">Hard (Advanced Numerical/Logic)</option>
            </select>
          </div>
        </div>

        {/* Language hint */}
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-2.5">
          <Languages className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            After generating the quiz, you can switch between <strong>English</strong>, <strong>हिंदी</strong>, and <strong>ગુજરાતી</strong> at any time during the quiz.
          </p>
        </div>

        <button
          type="submit"
          disabled={generating}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {generating ? '⚙️ Generating Questions...' : 'Generate & Start Assessment'}
          <Play className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
