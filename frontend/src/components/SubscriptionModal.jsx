import React, { useState } from 'react';
import { X, Sparkles, Zap, Crown, Check, Lock, Copy, Send, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { axiosClient } from '../api/axiosClient';

const UPI_ID   = 'vishubhsolanki31582-1@okaxis';
const UPI_NAME = 'Vishu Solanki';

const PLANS = [
  {
    id: 'pro', name: 'Smart Pro', price: '₹99', amount: 99, period: '/month',
    icon: <Zap className="h-5 w-5" />,
    color: 'from-indigo-600 to-purple-600', border: 'border-indigo-300',
    badge: 'Most Popular', badgeColor: 'bg-indigo-100 text-indigo-800',
    features: [
      'Detailed step-by-step AI answers',
      'Unlimited quiz generation',
      'Formula walkthroughs & derivations',
      'Exam strategy tips per topic',
      'Hindi & Gujarati quiz translation',
      'Priority AI response speed',
    ]
  },
  {
    id: 'elite', name: 'Smart Elite', price: '₹799', amount: 799, period: '/year',
    icon: <Crown className="h-5 w-5" />,
    color: 'from-amber-500 to-orange-500', border: 'border-amber-300',
    badge: 'Best Value', badgeColor: 'bg-amber-100 text-amber-800',
    features: [
      'Everything in Smart Pro',
      'Personalized study plan AI',
      'Advanced exam paper analysis',
      'Concept mind-map generation',
      'Solved previous year questions',
      'Early access to new features',
    ]
  }
];

const FREE_LIMITS = [
  'Basic AI answers (short)',
  '5 quiz generations only',
  'Standard PDF summarization',
  'No detailed AI explanations',
];

// ── Step 1 — Plan Selection
function PlanSelection({ onSelectPlan }) {
  return (
    <>
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 text-white text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 mb-3">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-black">Upgrade Your Learning</h2>
        <p className="text-indigo-200 text-sm mt-1">Choose a plan to unlock unlimited AI features</p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map(plan => (
            <div key={plan.id} className={`rounded-2xl border-2 ${plan.border} overflow-hidden`}>
              <div className={`bg-gradient-to-r ${plan.color} px-5 py-4 text-white`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold">{plan.icon}<span>{plan.name}</span></div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>{plan.badge}</span>
                </div>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-2xl font-black">{plan.price}</span>
                  <span className="text-sm text-white/80 mb-0.5">{plan.period}</span>
                </div>
              </div>
              <div className="bg-white px-5 py-4 space-y-2">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
                <button
                  onClick={() => onSelectPlan(plan)}
                  className={`mt-3 w-full py-2.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r ${plan.color} hover:opacity-90 shadow-md transition`}
                >
                  Subscribe {plan.name}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Your Current Free Plan
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {FREE_LIMITS.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Step 2 — UPI Payment
function UpiPayment({ plan, onPaid, onBack }) {
  const [copied, setCopied] = useState(false);

  const copyUpi = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // UPI deep link (opens PhonePe / GPay / BHIM on mobile)
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${plan.amount}&cu=INR&tn=${encodeURIComponent(`Smart Learning AI - ${plan.name}`)}`;

  return (
    <>
      <div className={`bg-gradient-to-r ${plan.color} px-6 py-5 text-white text-center`}>
        <button onClick={onBack} className="absolute left-4 top-4 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-xs font-bold">←</button>
        <h2 className="text-lg font-black">Pay via UPI</h2>
        <p className="text-white/80 text-sm mt-1">{plan.name} — {plan.price}{plan.period}</p>
      </div>

      <div className="p-6 space-y-4">
        {/* UPI details card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Details</p>

          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] text-slate-500 font-medium">UPI ID</p>
              <p className="text-sm font-black text-slate-900 font-mono">{UPI_ID}</p>
            </div>
            <button onClick={copyUpi} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
              {copied ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
          </div>

          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Payee Name</p>
              <p className="text-sm font-bold text-slate-900">{UPI_NAME}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-medium">Amount</p>
              <p className="text-lg font-black text-indigo-700">{plan.price}</p>
            </div>
          </div>

          {/* Mobile UPI open button */}
          <a
            href={upiLink}
            className={`block w-full text-center py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${plan.color} hover:opacity-90 shadow-md transition`}
          >
            📱 Open in UPI App (GPay / PhonePe / BHIM)
          </a>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium space-y-1">
          <p className="font-bold">📌 Payment Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-700">
            <li>Open any UPI app (GPay, PhonePe, BHIM, Paytm)</li>
            <li>Send exactly <strong>{plan.price}</strong> to UPI ID above</li>
            <li>Come back and click "I've Paid — Verify"</li>
            <li>Enter the OTP sent to your registered email</li>
          </ol>
        </div>

        <button
          onClick={onPaid}
          className={`w-full py-3.5 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${plan.color} hover:opacity-90 shadow-md transition flex items-center justify-center gap-2`}
        >
          ✅ I've Paid — Verify Payment
        </button>
      </div>
    </>
  );
}

// ── Step 3 — OTP Verification
function OtpVerification({ plan, onVerified, onBack }) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const sendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await axiosClient.post('/auth/send-payment-otp', { plan: plan.id });
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) return setError('Enter the 6-digit OTP from your email.');
    setError('');
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/verify-payment', { plan: plan.id, otp: otp.trim() });
      // Update localStorage
      const stored = localStorage.getItem('user_info');
      if (stored) {
        const u = JSON.parse(stored);
        localStorage.setItem('user_info', JSON.stringify({ ...u, subscription: res.data.subscription }));
      }
      onVerified(res.data.subscription || plan.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`relative bg-gradient-to-r ${plan.color} px-6 py-5 text-white text-center`}>
        <button onClick={onBack} className="absolute left-4 top-4 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-xs font-bold">←</button>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 mb-2">
          <KeyRound className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-black">Verify Payment</h2>
        <p className="text-white/80 text-sm mt-1">OTP will be sent to your registered email</p>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {!otpSent ? (
          <>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-xs text-indigo-800">
              <p className="font-bold mb-1">🔐 Payment Verification</p>
              <p>Click below to receive a one-time password on your registered email address to confirm your payment.</p>
            </div>
            <button
              onClick={sendOtp}
              disabled={loading}
              className={`w-full py-3.5 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${plan.color} hover:opacity-90 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {loading ? 'Sending...' : <><Send className="h-4 w-4" /> Send Verification OTP</>}
            </button>
          </>
        ) : (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 font-medium">
              ✅ OTP sent to your registered email. Check your inbox.
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Enter 6-Digit OTP</label>
              <input
                type="text"
                value={otp}
                maxLength={6}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="● ● ● ● ● ●"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-center text-2xl font-mono font-black tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                className="flex-1 py-3 border border-slate-300 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50"
              >Resend OTP</button>
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
                className={`flex-1 py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${plan.color} hover:opacity-90 shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5`}
              >
                {loading ? 'Activating...' : '🔓 Activate Plan'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Step 4 — Success
function SuccessScreen({ plan, onClose }) {
  return (
    <div className="p-8 text-center space-y-4">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 mx-auto">
        <CheckCircle2 className="h-12 w-12" />
      </div>
      <h2 className="text-2xl font-black text-slate-900">You're All Set! 🎉</h2>
      <p className="text-slate-500 text-sm">
        <strong>{plan.name}</strong> is now active on your account.<br />
        All premium features are unlocked instantly.
      </p>
      <div className={`rounded-2xl p-4 text-white bg-gradient-to-r ${plan.color}`}>
        <p className="font-bold text-sm">✅ {plan.name} Active</p>
        <p className="text-white/80 text-xs mt-1">{plan.price}{plan.period} · Instant activation</p>
      </div>
      <button
        onClick={onClose}
        className={`w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r ${plan.color} hover:opacity-90 shadow-md transition`}
      >
        Start Using Premium Features →
      </button>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function SubscriptionModal({ onClose, onSubscribed }) {
  // steps: "plans" | "payment" | "otp" | "success"
  const [step,        setStep]        = useState('plans');
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleSelectPlan = (plan) => { setSelectedPlan(plan); setStep('payment'); };
  const handlePaid       = ()     => setStep('otp');
  const handleVerified   = (sub)  => { setStep('success'); onSubscribed(sub); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow border border-slate-200 transition"
        >
          <X className="h-4 w-4 text-slate-600" />
        </button>

        {step === 'plans' && <PlanSelection onSelectPlan={handleSelectPlan} />}
        {step === 'payment' && selectedPlan && (
          <UpiPayment plan={selectedPlan} onPaid={handlePaid} onBack={() => setStep('plans')} />
        )}
        {step === 'otp' && selectedPlan && (
          <OtpVerification plan={selectedPlan} onVerified={handleVerified} onBack={() => setStep('payment')} />
        )}
        {step === 'success' && selectedPlan && (
          <SuccessScreen plan={selectedPlan} onClose={onClose} />
        )}

        <p className="text-center text-[11px] text-slate-400 py-3 border-t border-slate-100">
          Secure UPI Payment · Instant Activation · Student Pricing
        </p>
      </div>
    </div>
  );
}
