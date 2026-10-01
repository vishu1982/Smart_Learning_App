import React, { useState, useEffect } from 'react';
import { Shield, Users } from 'lucide-react';
import { axiosClient } from '../api/axiosClient';

export default function AdminDashboard() {
  const [overview, setOverview] = useState({
    total_students: 0,
    total_materials: 0,
    total_quizzes_generated: 0,
    total_submissions: 0
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const [ovRes, stRes] = await Promise.all([
          axiosClient.get('/analytics/admin/overview'),
          axiosClient.get('/analytics/admin/students')
        ]);
        setOverview(ovRes.data);
        setStudents(stRes.data);
      } catch (err) {
        console.error('Failed loading admin data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading administrator metrics...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider bg-purple-800 px-2.5 py-1 rounded-md">
            Faculty & Admin Portal
          </span>
          <h2 className="text-2xl font-black mt-2">Platform Administration</h2>
          <p className="text-purple-200 text-xs mt-1">Audit student progress, materials, and system logs.</p>
        </div>
        <Shield className="h-12 w-12 text-purple-300 opacity-60" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Total Enrolled</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.total_students}</p>
          <p className="text-xs text-indigo-600 font-medium">Active student accounts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Materials Stored</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.total_materials}</p>
          <p className="text-xs text-purple-600 font-medium">Uploaded study PDFs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Quizzes Created</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.total_quizzes_generated}</p>
          <p className="text-xs text-emerald-600 font-medium">AI generated test banks</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Submissions Logged</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{overview.total_submissions}</p>
          <p className="text-xs text-blue-600 font-medium">Evaluated quiz attempts</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-600" /> Registered Students Directory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Program</th>
                <th className="p-3">Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-800">{st.full_name}</td>
                  <td className="p-3 text-slate-600">{st.email}</td>
                  <td className="p-3 text-slate-600">{st.program}</td>
                  <td className="p-3 text-slate-600">Sem {st.semester}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
