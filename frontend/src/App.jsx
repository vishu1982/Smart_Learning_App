import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import SummarizerPage from './pages/SummarizerPage';
import QuizEnginePage from './pages/QuizEnginePage';
import AITutorPage from './pages/AITutorPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import VideosPage from './pages/VideosPage';


export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [quizMaterialContext, setQuizMaterialContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token      = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user_info');

      // Guard: must exist, must not be the literal strings "undefined" or "null"
      if (
        token && storedUser &&
        storedUser !== 'undefined' && storedUser !== 'null'
      ) {
        const parsed = JSON.parse(storedUser);
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
        } else {
          throw new Error('Invalid user data');
        }
      }
    } catch (e) {
      // Corrupted storage — clear it so user goes to login page cleanly
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);


  const handleLoginSuccess = (userData, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_info', JSON.stringify(userData));
    setUser(userData);
    setActiveTab(userData.role === 'ADMIN' ? 'admin-dashboard' : 'dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    setUser(null);
  };

  const handleGenerateQuizFromMaterial = (material) => {
    setQuizMaterialContext(material);
    setActiveTab('quizzes');
  };

  if (loading) return null;

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user_info', JSON.stringify(updatedUser));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onUserUpdate={handleUserUpdate}
        onNavigateTab={setActiveTab}
        activeTab={activeTab}
      />


      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={user.role} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <StudentDashboard onNavigateTab={setActiveTab} />}
          {activeTab === 'summarizer' && (
            <SummarizerPage onGenerateQuizForMaterial={handleGenerateQuizFromMaterial} />
          )}
          {activeTab === 'quizzes' && (
            <QuizEnginePage initialMaterial={quizMaterialContext} />
          )}
          {activeTab === 'tutor'           && <AITutorPage />}
          {activeTab === 'admin-dashboard' && <AdminDashboard />}
          {activeTab === 'community'       && <CommunityPage />}
          {activeTab === 'videos'          && <VideosPage />}
          {activeTab === 'profile'         && <ProfilePage user={user} onLogout={handleLogout} />}


        </main>
      </div>
      <Analytics />
    </div>
  );
}
