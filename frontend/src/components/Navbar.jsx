import React, { useState } from 'react';
import { GraduationCap, LogOut, User, ShieldCheck, Sparkles, BookOpen, Crown, Zap, Users } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';

export default function Navbar({ user, onLogout, onUserUpdate, onNavigateTab, activeTab }) {
  const [showSubModal, setShowSubModal] = useState(false);
  const subscription = user?.subscription || 'free';

  const handleSubscribed = (plan) => {
    setShowSubModal(false);
    if (onUserUpdate) onUserUpdate({ ...user, subscription: plan });
    try {
      const stored = JSON.parse(localStorage.getItem('user_info') || '{}');
      localStorage.setItem('user_info', JSON.stringify({ ...stored, subscription: plan }));
    } catch {}
  };

  return (
    <>
      {showSubModal && (
        <SubscriptionModal
          onClose={() => setShowSubModal(false)}
          onSubscribed={handleSubscribed}
        />
      )}

      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Smart Learning AI</h1>
            </div>
            <p className="text-xs font-medium text-slate-500">AI Academic Platform · Class 10th, 12th &amp; Degree</p>
          </div>
        </div>

        <div className="flex items-center gap-3">

          {/* Followers / Community button in Navbar */}
          {user && user.role !== 'ADMIN' && onNavigateTab && (
            <button
              onClick={() => onNavigateTab('community')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                activeTab === 'community'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Followers</span>
            </button>
          )}

          {/* Subscription corner badge — always visible for students */}
          {user && user.role !== 'ADMIN' && (
            subscription === 'free' ? (
              <button
                onClick={() => setShowSubModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow hover:opacity-90 transition animate-pulse hover:animate-none"
              >
                <Sparkles className="h-3.5 w-3.5" /> Upgrade to Pro
              </button>
            ) : (
              <span className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border ${
                subscription === 'elite'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {subscription === 'elite' ? <><Crown className="h-3.5 w-3.5" /> Elite</> : <><Zap className="h-3.5 w-3.5" /> Pro</>}
              </span>
            )
          )}


          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="text-sm font-semibold text-slate-800">{user.full_name}</p>
                <div className="flex items-center justify-end gap-1">
                  {user.role === 'ADMIN' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                      <ShieldCheck className="h-3 w-3" /> Faculty Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                      <BookOpen className="h-3 w-3" /> {user.grade_level || 'Class 10th'}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
