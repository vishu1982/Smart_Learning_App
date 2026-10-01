import React, { useState } from 'react';
import {
  User, Mail, GraduationCap, Crown, Zap, ShieldAlert,
  Trash2, Send, KeyRound, CheckCircle2, AlertTriangle, RotateCcw, Lock
} from 'lucide-react';
import { axiosClient } from '../api/axiosClient';

// ─── Delete Account Flow ──────────────────────────────────────────────────────
function DeleteAccountSection({ user, onDeleted }) {
  // 'idle' | 'confirm' | 'otp_sent' | 'deleting' | 'done'
  const [step,    setStep]    = useState('idle');
  const [otp,     setOtp]     = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await axiosClient.post('/auth/send-delete-otp');
      setStep('otp_sent');
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (otp.trim().length !== 6) return setError('Please enter the full 6-digit OTP.');
    setError('');
    setLoading(true);
    try {
      await axiosClient.delete('/auth/delete-account', { data: { otp: otp.trim() } });
      setStep('done');
      // Clear auth and notify parent after 2s
      setTimeout(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        onDeleted();
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mx-auto">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-black text-slate-900">Account Deleted</h3>
        <p className="text-sm text-slate-500">Your account and all data have been permanently removed. Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-rose-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-rose-50 px-5 py-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shrink-0">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-rose-800">Delete My Account</p>
          <p className="text-xs text-rose-600 mt-0.5">This action is permanent and cannot be undone.</p>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {step === 'idle' && (
          <>
            {/* What gets deleted */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">What will be deleted:</p>
              {[
                '🗑️ Your account and profile information',
                '🗑️ All quiz generations and quiz attempts',
                '🗑️ Your subscription and preferences',
                '🗑️ All personal login sessions and OTPs',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 rounded-lg px-3 py-1.5">
                  {item}
                </div>
              ))}
            </div>

            {/* What stays */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">What will be kept:</p>
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5">
                ✅ AI Notes &amp; Study Summaries (kept as public knowledge)
              </div>
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="w-full py-3 border-2 border-rose-300 text-rose-700 font-bold rounded-xl text-sm hover:bg-rose-50 transition flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> I want to delete my account
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Are you absolutely sure?</p>
                <p className="text-xs text-amber-700 mt-1">
                  We will send a verification OTP to <strong>{user?.email}</strong>.
                  Enter that OTP to permanently delete your account.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setStep('idle'); setError(''); }}
                className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-sm hover:bg-rose-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? 'Sending...' : <><Send className="h-4 w-4" /> Send OTP to Email</>}
              </button>
            </div>
          </>
        )}

        {step === 'otp_sent' && (
          <>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800">
              <p className="font-bold mb-1">⚠️ Final Warning — Permanent Action</p>
              <p>OTP sent to <strong>{user?.email}</strong>. Enter it below to permanently delete your account. This cannot be undone.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                <span>⚠️</span> {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-rose-700 mb-2 text-center">
                Enter 6-Digit Deletion OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                maxLength={6}
                autoFocus
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleDeleteAccount()}
                placeholder="● ● ● ● ● ●"
                className="w-full px-4 py-4 rounded-2xl border-2 border-rose-300 focus:border-rose-600 text-center text-3xl font-mono font-black tracking-[0.5em] focus:outline-none transition"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setStep('idle'); setOtp(''); setError(''); }}
                className="flex-1 py-2.5 border border-slate-300 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendOtp}
                className="py-2.5 px-3 border border-rose-200 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-50 transition flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Resend
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading || otp.length !== 6}
                className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {loading ? 'Deleting...' : <><Trash2 className="h-4 w-4" /> Delete Forever</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function ProfilePage({ user, onLogout }) {
  const subscription = user?.subscription || 'free';

  const planLabel = subscription === 'elite'
    ? { icon: <Crown className="h-4 w-4" />, text: 'Smart Elite 👑', cls: 'bg-amber-100 text-amber-800 border-amber-300' }
    : subscription === 'pro'
    ? { icon: <Zap className="h-4 w-4" />, text: 'Smart Pro ⚡', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
    : { icon: <Lock className="h-4 w-4" />, text: 'Free Plan', cls: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account details and settings.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Gradient banner */}
        <div className="h-20 bg-gradient-to-r from-indigo-600 to-purple-600" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-8 mb-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white border-4 border-white shadow-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-white">
              <User className="h-8 w-8" />
            </div>
          </div>

          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">{user?.full_name || 'Student'}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-sm text-slate-500">{user?.email}</span>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${planLabel.cls}`}>
              {planLabel.icon} {planLabel.text}
            </span>
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Account Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Full Name',   value: user?.full_name },
            { label: 'Email',       value: user?.email },
            { label: 'Grade/Level', value: user?.grade_level || 'Class 10th' },
            { label: 'Role',        value: user?.role === 'ADMIN' ? 'Faculty Admin' : 'Student' },
            { label: 'Plan',        value: planLabel.text },
            { label: 'Program',     value: user?.program || 'General Academic' },
          ].map((row, i) => (
            <div key={i} className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">{row.label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{row.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-black text-rose-700 uppercase tracking-wide flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Danger Zone
        </h3>

        <DeleteAccountSection user={user} onDeleted={onLogout} />
      </div>

    </div>
  );
}
