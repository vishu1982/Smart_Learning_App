import React from 'react';
import { LayoutDashboard, FileText, CheckSquare, Bot, Shield, BookOpen, Sparkles, UserCircle2, Users, PlayCircle } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, userRole }) {
  const studentNav = [
    { id: 'dashboard',  label: 'My Progress & Radar',     icon: LayoutDashboard },
    { id: 'tutor',      label: 'AI Tutor (Ask Anything)', icon: Bot },
    { id: 'summarizer', label: 'AI Notes Summarizer',     icon: FileText },
    { id: 'quizzes',    label: 'Practice Quiz Engine',    icon: CheckSquare },
    { id: 'videos',     label: 'Educational Videos',      icon: PlayCircle },
    { id: 'community',  label: 'Community',               icon: Users },
    { id: 'profile',    label: 'My Profile & Settings',   icon: UserCircle2 },
  ];

  const adminNav = [
    { id: 'admin-dashboard', label: 'Admin & Faculty Hub', icon: Shield },
    { id: 'summarizer', label: 'Curriculum Repository', icon: BookOpen },
    { id: 'quizzes', label: 'Assessment Banks', icon: CheckSquare },
    { id: 'videos', label: 'Educational Videos', icon: PlayCircle },
  ];

  const navItems = userRole === 'ADMIN' ? adminNav : studentNav;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-4 hidden md:flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Learning Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/50 p-4 text-xs text-slate-600 shadow-sm">
        <div className="flex items-center gap-1.5 font-bold text-indigo-950 mb-1">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span>Smart Learning AI</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Smart tutoring tailored for Class 10th, 11th-12th, and University degrees.
        </p>
      </div>

    </aside>
  );
}
