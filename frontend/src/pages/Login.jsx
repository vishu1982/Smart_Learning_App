import React, { useState } from 'react';
import {
  GraduationCap, ArrowRight, Lock, Mail, User,
  KeyRound, CheckCircle2, RotateCcw, Eye, EyeOff, Sparkles
} from 'lucide-react';
import { axiosClient } from '../api/axiosClient';

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

// ─────────────────────────────────────────────────────────────────────────────
// OTP INPUT SCREEN (shared by Login Step 2 and Register Step 2)
// ─────────────────────────────────────────────────────────────────────────────
function OtpScreen({ email, purpose, onSuccess, onBack }) {
  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [resent,  setResent]  = useState(false);

  const isRegister = purpose === 'register';
  const verifyEndpoint  = isRegister ? '/auth/register-verify-otp' : '/auth/verify-otp';
  const resendEndpoint  = isRegister ? null : '/auth/send-otp';

  const handleVerify = async () => {
    if (otp.trim().length !== 6) return setError('Please enter the full 6-digit OTP.');
    setError('');
    setLoading(true);
    try {
      const res = await axiosClient.post(verifyEndpoint, { email, otp: otp.trim() });
      onSuccess(res.data.user, res.data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResent(false);
    try {
      if (isRegister) {
        setError('To resend, please go back and submit your details again.');
        return;
      }
      await axiosClient.post(resendEndpoint, { email });
      setResent(true);
      setOtp('');
      setTimeout(() => setResent(false), 6000);
    } catch (err) {
      setError('Could not resend OTP. Please go back and try again.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Icon + heading */}
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 mb-3">
          <KeyRound className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-black text-slate-900">
          {isRegister ? 'Verify Your Email' : 'Email Verification'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {isRegister
            ? 'Enter the OTP sent to your email to complete registration'
            : 'Enter the OTP sent to your email to sign in'}
        </p>
        <p className="text-sm font-bold text-indigo-700 mt-1">{email}</p>
      </div>

      {resent && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> OTP resent! Check your inbox.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          <span className="shrink-0">⚠️</span> {error}
        </div>
      )}

      {/* Big OTP input */}
      <div>
        <label className="block text-xs font-bold uppercase text-slate-600 mb-2 text-center">
          Enter 6-Digit OTP from Email
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={otp}
          maxLength={6}
          autoFocus
          onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          placeholder="● ● ● ● ● ●"
          className="w-full px-4 py-4 rounded-2xl border-2 border-slate-300 focus:border-indigo-500 text-center text-3xl font-mono font-black tracking-[0.5em] focus:outline-none transition"
        />
        <p className="text-center text-[11px] text-slate-400 mt-1.5">
          OTP is valid for 10 minutes · Sent from vishubhsolanki31582@gmail.com
        </p>
      </div>

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={loading || otp.length !== 6}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
      >
        {loading
          ? (isRegister ? 'Creating Account...' : 'Verifying...')
          : <><CheckCircle2 className="h-4 w-4" /> {isRegister ? 'Verify & Create Account' : 'Verify & Sign In'}</>
        }
      </button>

      {/* Back + Resend */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
        >
          ← Back
        </button>
        {!isRegister && (
          <button
            type="button"
            onClick={handleResend}
            className="flex-1 py-2.5 border border-indigo-200 text-indigo-600 font-bold rounded-xl text-xs hover:bg-indigo-50 transition flex items-center justify-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Resend OTP
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN FORM — email + password → sends OTP
// ─────────────────────────────────────────────────────────────────────────────
function LoginForm({ onOtpSent }) {
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const fillDemo = (e, p) => { setEmail(e); setPw(p); setError(''); };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setError('');
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    if (pw.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: pw
      });
      if (res.data.otp_sent) {
        onOtpSent(res.data.email);
      } else if (res.data.access_token) {
        // Offline/demo mode — direct login
        onOtpSent(null, res.data);
      }
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Connection error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="email" required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="student@example.com"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type={showPw ? 'text' : 'password'} required
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700">
        <KeyRound className="h-3.5 w-3.5 shrink-0" />
        After password check, an OTP will be sent to your email for secure login.
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
        {loading ? 'Verifying & Sending OTP...' : <>Continue <ArrowRight className="h-4 w-4" /></>}
      </button>

      {/* Demo fills */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" /> Quick Demo:
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: '📗 Class 10th', e: 'student10@univ.edu' },
            { label: '📙 Class 12th', e: 'student12@univ.edu' },
            { label: '🎓 College',    e: 'student@univ.edu' },
            { label: '🛡️ Admin',      e: 'admin@univ.edu', p: 'Admin@123' },
          ].map(d => (
            <button key={d.e} type="button"
              onClick={() => fillDemo(d.e, d.p || 'Student@123')}
              className="py-2 px-2.5 bg-white border border-slate-200 text-indigo-700 rounded-xl text-xs font-bold hover:border-indigo-300 hover:bg-indigo-50/50 transition">
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER FORM — name + email + password → sends OTP to new email
// ─────────────────────────────────────────────────────────────────────────────
function RegisterForm({ onOtpSent }) {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    grade_level: 'Class 10th', program: 'General Academic'
  });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setError('');
    if (form.full_name.trim().length < 2) return setError('Please enter your full name (at least 2 characters).');
    if (!isValidEmail(form.email)) return setError('Please enter a valid email address.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/register-initiate', {
        full_name:   form.full_name.trim(),
        email:       form.email.trim().toLowerCase(),
        password:    form.password,
        role:        'STUDENT',
        grade_level: form.grade_level,
        program:     form.program,
        semester:    1
      });
      if (res.data.otp_sent) {
        onOtpSent(res.data.email);
      } else if (res.data.access_token) {
        // Offline mode — direct
        onOtpSent(null, res.data);
      }
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Error. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Full Name</label>
        <input type="text" required value={form.full_name}
          onChange={e => set('full_name', e.target.value)}
          placeholder="e.g. Rohan Patel"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Grade / Level</label>
        <select value={form.grade_level} onChange={e => set('grade_level', e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="Class 10th">Class 10th</option>
          <option value="Class 11th-12th">Class 11th – 12th</option>
          <option value="Undergraduate (BCA/B.Tech/B.Sc)">Undergraduate</option>
          <option value="Postgraduate (MCA/M.Tech/MBA)">Postgraduate</option>
          <option value="Competitive Exam Prep">Competitive Exams (JEE/NEET)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input type="email" required value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="student@example.com"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input type={showPw ? 'text' : 'password'} required value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="Min. 6 characters"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        An OTP will be sent to your email to verify and complete registration.
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
        {loading ? 'Sending OTP...' : <>Send Verification OTP <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Login({ onLoginSuccess }) {
  // tab: "login" | "register"
  const [tab,       setTab]       = useState('login');
  // step: "form" | "otp"
  const [step,      setStep]      = useState('form');
  const [otpEmail,  setOtpEmail]  = useState('');

  const handleOtpSent = (email, directData = null) => {
    if (directData) {
      // Offline/demo mode — received token directly
      onLoginSuccess(directData.user, directData.access_token);
      return;
    }
    setOtpEmail(email);
    setStep('otp');
  };

  const handleBack = () => {
    setStep('form');
    setOtpEmail('');
  };

  // Progress: step 1 = form, step 2 = otp
  const progress = step === 'otp' ? 2 : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/70 to-purple-50/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8">

        {/* Logo */}
        <div className="text-center mb-5">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 mb-3">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Smart Learning AI</h2>
          <p className="text-xs text-slate-500 mt-0.5">AI-Powered Academic Platform for All Students</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-indigo-600" />
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${progress === 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
        </div>

        {step === 'form' && (
          <>
            {/* Tab switcher */}
            <div className="flex rounded-2xl border border-slate-200 overflow-hidden mb-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setTab('login'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition ${
                  tab === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Lock className="h-3.5 w-3.5" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition ${
                  tab === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="h-3.5 w-3.5" /> Register
              </button>
            </div>

            {tab === 'login'    && <LoginForm    onOtpSent={handleOtpSent} />}
            {tab === 'register' && <RegisterForm onOtpSent={handleOtpSent} />}
          </>
        )}

        {step === 'otp' && (
          <OtpScreen
            email={otpEmail}
            purpose={tab === 'register' ? 'register' : 'login'}
            onSuccess={onLoginSuccess}
            onBack={handleBack}
          />
        )}

      </div>
    </div>
  );
}
