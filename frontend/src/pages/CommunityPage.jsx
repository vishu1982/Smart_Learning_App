import React, { useState, useEffect, useRef } from 'react';
import {
  Users, UserPlus, UserCheck, UserX, MessageCircle, Bell,
  Search, Send, BookOpen, CheckCircle2, Clock, X,
  Trash2, Maximize2, Minimize2
} from 'lucide-react';
import { axiosClient } from '../api/axiosClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GRADE_EMOJI = {
  'Class 10th': '📗',
  'Class 11th-12th': '📙',
  'Undergraduate (BCA/B.Tech/B.Sc)': '🎓',
  'Postgraduate (MCA/M.Tech/MBA)': '🏛️',
  'Competitive Exam Prep': '🏆',
};
const gradeEmoji = (g) => GRADE_EMOJI[g] || '📘';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── User Card (Discover & Following) ─────────────────────────────────────────
function UserCard({ user, onFollow, onUnfollow, onViewProfile, onChat }) {
  const [loading, setLoading] = useState(false);
  const status = user.follow_status;

  const handleFollow = async () => {
    setLoading(true);
    await onFollow(user.id);
    setLoading(false);
  };
  const handleUnfollow = async () => {
    setLoading(true);
    await onUnfollow(user.id);
    setLoading(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
      {/* Avatar + name */}
      <div className="flex items-start gap-3 mb-4">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shrink-0">
          {(user.full_name || 'S').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{user.full_name}</p>
          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs">{gradeEmoji(user.grade_level)}</span>
            <span className="text-[11px] text-slate-500 truncate">{user.grade_level}</span>
          </div>
        </div>
        {user.subscription && user.subscription !== 'free' && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            user.subscription === 'elite' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {user.subscription === 'elite' ? '👑' : '⚡'} {user.subscription}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {status === 'following' ? (
          <>
            <button
              onClick={() => onViewProfile(user)}
              className="flex-1 py-2 px-2 text-xs font-bold border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition flex items-center justify-center gap-1"
            >
              <BookOpen className="h-3.5 w-3.5" /> View
            </button>
            <button
              onClick={() => onChat(user)}
              className="flex-1 py-2 px-2 text-xs font-bold border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition flex items-center justify-center gap-1"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </button>
            <button
              onClick={handleUnfollow}
              disabled={loading}
              title="Unfollow User"
              className="py-2 px-3 text-xs font-bold border border-rose-200 text-rose-600 bg-rose-50/50 rounded-xl hover:bg-rose-100 transition flex items-center gap-1 disabled:opacity-50"
            >
              <UserX className="h-3.5 w-3.5" /> {loading ? '...' : 'Unfollow'}
            </button>
          </>
        ) : status === 'pending' ? (
          <>
            <div className="flex-1 py-2 px-2 text-xs font-bold text-center bg-amber-50 border border-amber-200 text-amber-700 rounded-xl flex items-center justify-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Requested
            </div>
            <button
              onClick={handleUnfollow}
              disabled={loading}
              title="Cancel Follow Request"
              className="py-2 px-3 text-xs font-bold border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition flex items-center gap-1 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </>
        ) : status === 'follows_you' ? (
          <button
            onClick={handleFollow}
            disabled={loading}
            className="flex-1 py-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" /> {loading ? 'Sending...' : 'Follow Back'}
          </button>
        ) : (
          <button
            onClick={handleFollow}
            disabled={loading}
            className="flex-1 py-2 text-xs font-bold border border-indigo-300 text-indigo-700 rounded-xl hover:bg-indigo-50 transition flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" /> {loading ? 'Sending...' : 'Follow'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Follower Card (with Remove Follower + Follow Back + Chat + View) ─────────
function FollowerCard({ user, onRemoveFollower, onFollowBack, onViewProfile, onChat }) {
  const [removing, setRemoving] = useState(false);
  const [following, setFollowing] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    await onRemoveFollower(user.id);
    setRemoving(false);
  };

  const handleFollowBack = async () => {
    setFollowing(true);
    await onFollowBack(user.id);
    setFollowing(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-lg shrink-0">
          {(user.full_name || 'S').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-900 truncate">{user.full_name}</p>
          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{gradeEmoji(user.grade_level)} {user.grade_level}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onViewProfile(user)}
          className="flex-1 py-2 px-2 text-xs font-bold border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition flex items-center justify-center gap-1"
        >
          <BookOpen className="h-3.5 w-3.5" /> View
        </button>
        <button
          onClick={() => onChat(user)}
          className="flex-1 py-2 px-2 text-xs font-bold border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition flex items-center justify-center gap-1"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Chat
        </button>
        {user.follow_status === 'follows_you' && (
          <button
            onClick={handleFollowBack}
            disabled={following}
            className="py-2 px-2.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-1 disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" /> {following ? '...' : 'Follow Back'}
          </button>
        )}
        <button
          onClick={handleRemove}
          disabled={removing}
          title="Remove Follower"
          className="py-2 px-2.5 text-xs font-bold border border-rose-200 text-rose-600 bg-rose-50/50 rounded-xl hover:bg-rose-100 transition flex items-center gap-1 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> {removing ? '...' : 'Remove'}
        </button>
      </div>
    </div>
  );
}

// ─── Chat Window (Supports Floating & Whole-Screen + Clear Chat) ──────────────
function ChatWindow({ chatUser, currentUser, onClose, onCleared }) {
  const [messages, setMessages]       = useState([]);
  const [text, setText]               = useState('');
  const [sending, setSending]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing]       = useState(false);
  const bottomRef = useRef(null);

  const loadMessages = async () => {
    try {
      const res = await axiosClient.get(`/chat/messages/${chatUser.id}`);
      setMessages(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load messages. Make sure your follow request is accepted.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [chatUser.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isFullScreen]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const optimistic = { id: Date.now(), text: text.trim(), from_me: true, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    const sent = text.trim();
    setText('');
    try {
      await axiosClient.post(`/chat/messages/${chatUser.id}`, { text: sent });
      loadMessages();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setText(sent);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    setClearing(true);
    try {
      await axiosClient.delete(`/chat/messages/${chatUser.id}`);
      setMessages([]);
      setConfirmClear(false);
      if (onCleared) onCleared();
    } catch (err) {
      alert('Failed to clear chat. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const containerClasses = isFullScreen
    ? 'fixed inset-0 w-full h-full bg-white z-50 flex flex-col overflow-hidden'
    : 'fixed bottom-4 right-4 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50';

  return (
    <div className={containerClasses} style={isFullScreen ? {} : { height: '500px' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3.5 flex items-center gap-3 shrink-0">
        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-lg">
          {(chatUser.full_name || 'S').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{chatUser.full_name}</p>
          <p className="text-[11px] text-indigo-200 truncate">{chatUser.grade_level || 'Student'}</p>
        </div>

        {/* Header Actions: Clear Chat, Fullscreen Toggle, Close */}
        <div className="flex items-center gap-1.5">
          {confirmClear ? (
            <div className="flex items-center gap-1 bg-rose-600/90 px-2 py-1 rounded-xl">
              <button
                onClick={handleClearChat}
                disabled={clearing}
                className="text-[11px] font-bold text-white hover:underline px-1"
              >
                {clearing ? 'Clearing...' : 'Confirm Clear'}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-[11px] text-white/80 hover:text-white px-1"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              title="Clear Chat History"
              className="p-2 rounded-xl bg-white/15 hover:bg-rose-500/80 text-white transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => setIsFullScreen(f => !f)}
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Chat'}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition"
          >
            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <button
            onClick={onClose}
            title="Close Chat"
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 ${isFullScreen ? 'max-w-4xl w-full mx-auto' : ''}`}>
        {loading && (
          <div className="text-center text-xs text-slate-400 pt-8">Loading messages...</div>
        )}
        {error && (
          <div className="text-center text-xs text-rose-500 bg-rose-50 p-3 rounded-xl">{error}</div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="text-center text-xs text-slate-400 pt-12">
            <MessageCircle className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-500">No messages yet</p>
            <p className="mt-0.5">Say hello to {chatUser.full_name}! 👋</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.from_me ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm shadow-xs ${
              m.from_me
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
            }`}>
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className={`text-[10px] mt-1 text-right ${m.from_me ? 'text-indigo-200' : 'text-slate-400'}`}>
                {timeAgo(m.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3.5 border-t border-slate-200 bg-white shrink-0">
        <div className={`flex gap-2 ${isFullScreen ? 'max-w-4xl w-full mx-auto' : ''}`}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Message ${chatUser.full_name}...`}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs hover:opacity-90 disabled:opacity-40 transition"
          >
            <Send className="h-4 w-4" />
            {isFullScreen && <span>Send</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Profile Viewer ──────────────────────────────────────────────────────
function UserProfileModal({ user, onClose, onChat }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    axiosClient.get(`/social/users/${user.id}/profile`)
      .then(r => setProfile(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">
            {(user.full_name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black truncate">{user.full_name}</h2>
            <p className="text-indigo-200 text-xs truncate">{user.email}</p>
            <p className="text-indigo-200 text-xs mt-0.5">{gradeEmoji(user.grade_level)} {user.grade_level}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onChat(user)} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold flex items-center gap-1 transition">
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {loading && <div className="text-center text-slate-400 py-8">Loading profile...</div>}
          {error && <div className="text-center text-rose-500 bg-rose-50 rounded-2xl p-4 text-sm">{error}</div>}

          {profile && (
            <>
              {/* Quiz stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-indigo-700">{profile.quiz_stats.total_quizzes}</p>
                  <p className="text-xs text-indigo-500 font-bold mt-1">Quizzes Taken</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-purple-700">{profile.quiz_stats.avg_score}%</p>
                  <p className="text-xs text-purple-500 font-bold mt-1">Avg Score</p>
                </div>
              </div>

              {profile.quiz_stats.recent_topics.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase text-slate-500 mb-2">Recent Quiz Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.quiz_stats.recent_topics.filter(Boolean).map((t, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Public summaries */}
              <div>
                <p className="text-xs font-black uppercase text-slate-500 mb-3 flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" /> Public Study Notes
                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{profile.materials.length}</span>
                </p>
                {profile.materials.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No public notes uploaded yet</p>
                ) : (
                  <div className="space-y-3">
                    {profile.materials.map(m => (
                      <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="font-bold text-sm text-slate-800">{m.title}</p>
                        <div className="flex gap-2 mt-1 mb-2">
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{m.subject}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{m.grade_level}</span>
                        </div>
                        {m.ai_summary?.key_takeaways?.length > 0 && (
                          <ul className="text-xs text-slate-600 space-y-1">
                            {m.ai_summary.key_takeaways.slice(0, 3).map((t, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-indigo-400 mt-0.5">•</span> {t}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Community Page ──────────────────────────────────────────────────────
export default function CommunityPage() {
  const [tab,         setTab]         = useState('discover'); // discover | requests | following | followers | chats
  const [users,       setUsers]       = useState([]);
  const [requests,    setRequests]    = useState([]);
  const [following,   setFollowing]   = useState([]);
  const [followers,   setFollowers]   = useState([]);
  const [convs,       setConvs]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [reqCount,    setReqCount]    = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Modals
  const [viewProfile, setViewProfile] = useState(null);
  const [chatWindow,  setChatWindow]  = useState(null);

  const currentUser = (() => {
    try {
      const raw = localStorage.getItem('user_info');
      if (!raw || raw === 'undefined' || raw === 'null') return {};
      return JSON.parse(raw) || {};
    } catch { return {}; }
  })();

  const fetchBadges = async () => {
    try {
      const [rc, uc] = await Promise.all([
        axiosClient.get('/social/requests/count'),
        axiosClient.get('/chat/unread-count')
      ]);
      setReqCount(rc.data.count);
      setUnreadCount(uc.data.count);
    } catch {}
  };

  const fetchTab = async (t = tab) => {
    setLoading(true);
    try {
      if (t === 'discover') {
        const r = await axiosClient.get('/social/users');
        setUsers(r.data);
      } else if (t === 'requests') {
        const r = await axiosClient.get('/social/requests');
        setRequests(r.data);
      } else if (t === 'following') {
        const r = await axiosClient.get('/social/following');
        setFollowing(r.data);
      } else if (t === 'followers') {
        const r = await axiosClient.get('/social/followers');
        setFollowers(r.data);
      } else if (t === 'chats') {
        const r = await axiosClient.get('/chat/conversations');
        setConvs(r.data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchTab(tab);
    fetchBadges();
    const interval = setInterval(fetchBadges, 8000);
    return () => clearInterval(interval);
  }, [tab]);

  const handleFollow = async (uid) => {
    await axiosClient.post(`/social/follow/${uid}`);
    fetchTab(tab);
  };

  const handleUnfollow = async (uid) => {
    await axiosClient.delete(`/social/unfollow/${uid}`);
    fetchTab(tab);
  };

  const handleRemoveFollower = async (followerId) => {
    await axiosClient.delete(`/social/followers/${followerId}`);
    setFollowers(prev => prev.filter(f => f.id !== followerId));
  };

  const handleClearConversation = async (e, otherId) => {
    e.stopPropagation();
    try {
      await axiosClient.delete(`/chat/messages/${otherId}`);
      setConvs(prev => prev.filter(c => c.user.id !== otherId));
    } catch {}
  };

  const handleAccept = async (reqId) => {
    await axiosClient.post(`/social/requests/${reqId}/accept`);
    setRequests(prev => prev.filter(r => r.request_id !== reqId));
    setReqCount(c => Math.max(0, c - 1));
  };

  const handleReject = async (reqId) => {
    await axiosClient.post(`/social/requests/${reqId}/reject`);
    setRequests(prev => prev.filter(r => r.request_id !== reqId));
    setReqCount(c => Math.max(0, c - 1));
  };

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.grade_level || '').toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id: 'discover',  label: 'Discover',  icon: Users },
    { id: 'requests',  label: 'Requests',  icon: Bell,          badge: reqCount },
    { id: 'following', label: 'Following', icon: UserCheck },
    { id: 'followers', label: 'Followers', icon: UserPlus },
    { id: 'chats',     label: 'Messages',  icon: MessageCircle, badge: unreadCount },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-600" /> Community &amp; Followers
          </h1>
          <p className="text-slate-500 text-sm mt-1">Follow students, share study summaries, view quiz scores &amp; chat</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1 h-4 min-w-[16px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── DISCOVER ── */}
      {tab === 'discover' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students by name, email, or grade..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {loading ? (
            <div className="text-center text-slate-400 py-12">Loading students...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-slate-400 py-12">No students found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(u => (
                <UserCard
                  key={u.id}
                  user={u}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  onViewProfile={setViewProfile}
                  onChat={setChatWindow}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FOLLOW REQUESTS ── */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {loading ? <div className="text-center text-slate-400 py-12">Loading...</div>
          : requests.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">No pending follow requests</p>
            </div>
          ) : requests.map(r => (
            <div key={r.request_id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xl shrink-0">
                {(r.full_name || 'S').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{r.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{r.email}</p>
                <p className="text-xs text-slate-400">{gradeEmoji(r.grade_level)} {r.grade_level}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleAccept(r.request_id)}
                  className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                </button>
                <button onClick={() => handleReject(r.request_id)}
                  className="px-3 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition">
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FOLLOWING ── */}
      {tab === 'following' && (
        <div className="space-y-3">
          {loading ? <div className="text-center text-slate-400 py-12">Loading...</div>
          : following.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">You're not following anyone yet</p>
              <p className="text-slate-400 text-sm mt-1">Go to Discover to find students</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {following.map(u => (
                <UserCard
                  key={u.id}
                  user={{ ...u, follow_status: 'following' }}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  onViewProfile={setViewProfile}
                  onChat={setChatWindow}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FOLLOWERS ── */}
      {tab === 'followers' && (
        <div className="space-y-3">
          {loading ? <div className="text-center text-slate-400 py-12">Loading...</div>
          : followers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">No followers yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {followers.map(u => (
                <FollowerCard
                  key={u.id}
                  user={u}
                  onRemoveFollower={handleRemoveFollower}
                  onFollowBack={handleFollow}
                  onViewProfile={setViewProfile}
                  onChat={setChatWindow}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CHATS ── */}
      {tab === 'chats' && (
        <div className="space-y-3">
          {loading ? <div className="text-center text-slate-400 py-12">Loading...</div>
          : convs.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">No conversations yet</p>
              <p className="text-slate-400 text-sm mt-1">Click "Chat" on any followed user or follower to start messaging</p>
            </div>
          ) : convs.map(c => (
            <div
              key={c.user.id}
              onClick={() => setChatWindow(c.user)}
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition cursor-pointer"
            >
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xl">
                  {(c.user.full_name || 'S').charAt(0)}
                </div>
                {c.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                    {c.unread_count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{c.user.full_name}</p>
                <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                  {c.last_message.from_me ? 'You: ' : ''}{c.last_message.text}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-[11px] text-slate-400">{timeAgo(c.last_message.created_at)}</p>
                <button
                  onClick={(e) => handleClearConversation(e, c.user.id)}
                  title="Clear Chat History"
                  className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile modal */}
      {viewProfile && (
        <UserProfileModal
          user={viewProfile}
          onClose={() => setViewProfile(null)}
          onChat={(u) => { setViewProfile(null); setChatWindow(u); }}
        />
      )}

      {/* Chat window (floating or full screen) */}
      {chatWindow && (
        <ChatWindow
          chatUser={chatWindow}
          currentUser={currentUser}
          onClose={() => setChatWindow(null)}
          onCleared={() => { if (tab === 'chats') fetchTab('chats'); }}
        />
      )}
    </div>
  );
}
