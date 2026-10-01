import React, { useState, useEffect } from 'react';
import { Award, BookOpen, CheckCircle, TrendingUp, AlertTriangle, Play } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { axiosClient } from '../api/axiosClient';

export default function StudentDashboard({ onNavigateTab }) {
  const [overview, setOverview] = useState({
    total_quizzes_taken: 0,
    average_score_pct: 0,
    total_materials_read: 0,
    total_ai_chat_queries: 0,
    weak_subjects: []
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ovRes, chRes] = await Promise.all([
          axiosClient.get('/analytics/student/overview'),
          axiosClient.get('/analytics/student/performance-chart')
        ]);
        setOverview(ovRes.data);
        setChartData(chRes.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading student analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black">Welcome to Smart Learning! 🚀</h2>
          <p className="text-indigo-100 text-sm mt-1">Track your AI lecture summaries, quiz mastery, and academic growth.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigateTab('summarizer')}
            className="px-4 py-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <BookOpen className="h-4 w-4" /> Summarize PDF
          </button>
          <button
            onClick={() => onNavigateTab('quizzes')}
            className="px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5"
          >
            <Play className="h-4 w-4" /> Take Quiz
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">Avg Quiz Score</span>
            <Award className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black text-slate-900">{overview.average_score_pct}%</p>
          <p className="text-xs text-green-600 font-medium mt-1">Across all evaluated tests</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">Quizzes Taken</span>
            <CheckCircle className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black text-slate-900">{overview.total_quizzes_taken}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">MCQ assessments completed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">My Study PDFs</span>
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black text-slate-900">{overview.total_materials_read}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">PDFs uploaded (private notes stay hidden)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">AI Tutor Queries</span>
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-2xl font-black text-slate-900">{overview.total_ai_chat_queries}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Contextual discussions</p>
        </div>
      </div>

      {/* Charts & Subject Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" /> Score Trajectory History (%)
          </h3>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} />
                  <Line type="monotone" dataKey="score_pct" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5, fill: '#4f46e5' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No quiz score history yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Subject Focus Radar
          </h3>
          {overview.weak_subjects.length > 0 ? (
            <div className="space-y-3">
              {overview.weak_subjects.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-800">
                    <span>{item.subject}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      item.average_score < 60 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {item.average_score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.average_score < 60 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${item.average_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Take multiple subject quizzes to analyze focus areas.</p>
          )}
        </div>
      </div>
    </div>
  );
}
